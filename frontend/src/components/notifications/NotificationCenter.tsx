import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle, Award, Zap, Shield, Info, Trash2 } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

/**
 * Notification centre — built from real local events only.
 *
 * There is no server to push notifications and this build does not invent any: the list is derived
 * from the completions, achievements and XP events this browser actually recorded, and "read" state
 * is kept in component state for the session. A fresh profile sees an empty state explaining what
 * will appear here, not a fake feed.
 */

interface Notif {
  id: string
  title: string
  desc: string
  at: string
  read: boolean
  icon: typeof Zap
  color: 'amber' | 'violet' | 'emerald' | 'cyan'
}

function relative(at: string): string {
  const t = new Date(at).getTime()
  if (Number.isNaN(t)) return 'unknown time'
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(at).toLocaleDateString()
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const achievements = useProgressStore(s => s.achievements)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const events = useMemo<Notif[]>(() => {
    const all: Omit<Notif, 'read'>[] = [
      ...completedLessons.map(l => ({
        id: `lesson-${l.moduleId}-${l.lessonId}`,
        title: `Lesson complete — +${l.points} XP`,
        desc: `${l.lessonId} (${l.moduleId})`,
        at: l.completedAt || '',
        icon: CheckCircle,
        color: 'cyan' as const,
      })),
      ...completedLabs.map(l => ({
        id: `lab-${l.moduleId}-${l.labId}`,
        title: `Lab complete — +${l.points} XP`,
        desc: `${l.labId}${l.score !== undefined ? ` • score ${l.score}` : ''} (${l.moduleId})`,
        at: l.completedAt || '',
        icon: Shield,
        color: 'emerald' as const,
      })),
      ...quizScores.map(q => ({
        id: `quiz-${q.moduleId}-${q.quizId}`,
        title: `Quiz ${q.score}/${q.total} — +${q.points} XP`,
        desc: `${q.quizId} (${q.moduleId})`,
        at: q.completedAt || '',
        icon: Zap,
        color: 'amber' as const,
      })),
      ...achievements.map(a => ({
        id: `achievement-${a.id}`,
        title: `${a.icon} ${a.title} — +${a.points} XP`,
        desc: a.description,
        at: a.unlockedAt || '',
        icon: Award,
        color: 'violet' as const,
      })),
    ].filter(e => e.at)

    return all
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 50)
      .map(e => ({ ...e, read: readIds.has(e.id) }))
  }, [completedLessons, completedLabs, quizScores, achievements, readIds])

  const unread = events.filter(e => !e.read).length
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key === 'Tab') {
        const panel = document.getElementById('activity-panel')
        const items = panel?.querySelectorAll<HTMLElement>('button:not([disabled])')
        if (!items?.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true" className="fixed inset-0 z-[90] bg-black/65" onClick={onClose} />
          <motion.div id="activity-panel" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="activity-drawer fixed top-0 right-0 h-[100dvh] w-[min(420px,94vw)] z-[100] bg-[var(--overlay-bg)] border-l border-[var(--line-normal)] shadow-lg flex flex-col">
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 id="activity-dialog-title" className="font-heading font-bold text-[15px] text-slate-100">Activity — {unread} new</h3>
                  <p className="text-[11px] text-slate-500 font-mono">recorded in this browser • no server push</p>
                </div>
              </div>
              <button ref={closeButtonRef} onClick={onClose} aria-label="Close activity" className="w-9 h-9 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 border-b border-[#1e293b]/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">{events.length} entries • {unread} new</span>
              <button
                onClick={() => setReadIds(new Set(events.map(e => e.id)))}
                disabled={events.length === 0}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:hover:text-slate-400"
              >
                Mark all read
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {events.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-center">
                  <Info className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                  <div className="text-[12.5px] text-slate-300">Nothing recorded yet</div>
                  <p className="mt-1.5 text-[11.5px] text-slate-500 leading-relaxed">
                    This list shows your own completions — lessons, labs, quizzes and achievements — with the time they
                    happened. Complete something and it will appear here; nothing is ever fabricated to fill the panel.
                  </p>
                </div>
              ) : (
                events.map((n, idx) => (
                  <motion.button
                    type="button"
                    key={n.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.03 }}
                    aria-label={n.read ? `Mark ${n.title} unread` : `Mark ${n.title} read`}
                    aria-pressed={n.read}
                    onClick={() => setReadIds(prev => { const next = new Set(prev); if (n.read) next.delete(n.id); else next.add(n.id); return next })}
                    className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${n.read ? 'bg-[#020617]/40 border-[#1e293b]/40 opacity-70' : 'bg-[#020617]/80 border-[#334155]/60 hover:bg-[#020617]/90'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${n.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : n.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : n.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                      <n.icon className={`w-4 h-4 ${n.color === 'amber' ? 'text-amber-400' : n.color === 'violet' ? 'text-violet-400' : n.color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-medium truncate ${n.read ? 'text-slate-400' : 'text-slate-100'}`}>{n.title}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed break-words">{n.desc}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1.5">{relative(n.at)} • {new Date(n.at).toLocaleString()}</div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#1e293b] bg-[#020617]/40 shrink-0 space-y-2">
              {events.length > 0 && (
                <button
                  onClick={() => setReadIds(new Set())}
                  className="w-full text-[11px] px-3 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-slate-400 hover:text-slate-200 hover:border-[#334155] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset read marks (session only)
                </button>
              )}
              <div className="text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span>Derived from this device&apos;s local progress records. No push service, no email, no server-side notification log.</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
