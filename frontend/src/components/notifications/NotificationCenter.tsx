import { useMotionPolicy } from '@/components/animations/motionPolicy'
import { panelMotion } from '@/lib/motion'
import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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
  const policy = useMotionPolicy()
  const entrance = panelMotion('activity', policy)
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
    <>
      {open && (
        <>
          <motion.div initial={policy.reduced || policy.paused ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={entrance.transition} aria-hidden="true" className="fixed inset-0 z-[90] bg-[var(--scrim)]" onClick={onClose} />
          <motion.div id="activity-panel" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" {...entrance} className="activity-drawer fixed top-0 right-0 h-[100dvh] w-[min(420px,94vw)] z-[100] bg-[var(--overlay-bg)] border-l border-[var(--line-normal)] shadow-lg flex flex-col">
            <div className="p-5 border-b border-[var(--line-normal)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[var(--owner)]" />
                </div>
                <div>
                  <h3 id="activity-dialog-title" className="font-heading font-bold text-[15px] text-[var(--ink-primary)]">Activity — {unread} new</h3>
                  <p className="text-[11px] text-[var(--ink-muted)] font-mono">recorded in this browser • no server push</p>
                </div>
              </div>
              <button ref={closeButtonRef} onClick={onClose} aria-label="Close activity" className="w-9 h-9 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] transition-colors touch-manipulation">
                <X className="w-4 h-4 text-[var(--ink-secondary)]" />
              </button>
            </div>

            <div className="p-3 border-b border-[var(--line-normal)] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[var(--ink-muted)] font-mono">{events.length} entries • {unread} new</span>
              <button
                onClick={() => setReadIds(new Set(events.map(e => e.id)))}
                disabled={events.length === 0}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors disabled:opacity-40 disabled:hover:text-[var(--ink-secondary)]"
              >
                Mark all read
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {events.length === 0 ? (
                <div className="p-6 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
                  <Info className="w-5 h-5 text-[var(--ink-muted)] mx-auto mb-2" />
                  <div className="text-[12.5px] text-[var(--ink-secondary)]">Nothing recorded yet</div>
                  <p className="mt-1.5 text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
                    This list shows your own completions — lessons, labs, quizzes and achievements — with the time they
                    happened. Complete something and it will appear here; nothing is ever fabricated to fill the panel.
                  </p>
                </div>
              ) : (
                events.map(n => (
                  <button
                    type="button"
                    key={n.id}
                    aria-label={n.read ? `Mark ${n.title} unread` : `Mark ${n.title} read`}
                    aria-pressed={n.read}
                    onClick={() => setReadIds(prev => { const next = new Set(prev); if (n.read) next.delete(n.id); else next.add(n.id); return next })}
                    className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${n.read ? 'bg-[var(--panel-inset)] border-[var(--line-normal)] ' : 'bg-[var(--panel-inset)] border-[var(--line-strong)] hover:bg-[var(--panel-inset)]'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${n.color === 'amber' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : n.color === 'violet' ? 'bg-[var(--owner-bg)] border-[var(--owner-border)]' : n.color === 'emerald' ? 'bg-[var(--success-bg)] border-[var(--success-border)]' : 'bg-[var(--accent-bg)] border-[var(--accent-border)]'}`}>
                      <n.icon className={`w-4 h-4 ${n.color === 'amber' ? 'text-[var(--attention)]' : n.color === 'violet' ? 'text-[var(--owner)]' : n.color === 'emerald' ? 'text-[var(--success)]' : 'text-[var(--learning)]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-medium truncate ${n.read ? 'text-[var(--ink-secondary)]' : 'text-[var(--ink-primary)]'}`}>{n.title}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--action-fill)] shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[var(--ink-muted)] mt-1 leading-relaxed break-words">{n.desc}</div>
                      <div className="text-[10px] font-mono text-[var(--ink-secondary)] mt-1.5">{relative(n.at)} • {new Date(n.at).toLocaleString()}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--line-normal)] bg-[var(--panel-inset)] shrink-0 space-y-2">
              {events.length > 0 && (
                <button
                  onClick={() => setReadIds(new Set())}
                  className="w-full text-[11px] px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--line-strong)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset read marks (session only)
                </button>
              )}
              <div className="text-[11px] text-[var(--ink-muted)] flex items-start gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--ink-secondary)]" />
                <span>Derived from this device&apos;s local progress records. No push service, no email, no server-side notification log.</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}
