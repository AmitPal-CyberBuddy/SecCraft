import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Shield, Zap, Target, FileCode, Info, FlaskConical } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

/**
 * Engagement timeline — built from your own artefacts and completions.
 *
 * This panel used to show a fixed narrative ("00:05 airodump-ng → 00:25 hashcat cracked 12345678 …").
 * That is a story, not evidence, so the timeline is now assembled from the two real sources this
 * build has: evidence-vault records (with the claim, filter, frame numbers and hash you entered) and
 * the completion timestamps in your local progress store. With nothing recorded, it says so.
 */

interface EvidenceRecord {
  id: string
  kind: string
  label: string
  claim: string
  filter: string
  frames: string
  sha256: string
  /** Written by components/evidence/EvidenceVault.tsx. `at` is tolerated for older records. */
  createdAt?: string
  at?: string
}

const EVIDENCE_KEY = 'platform-evidence-vault'
const LEGACY_EVIDENCE_KEY = 'wififorge-evidence-vault'

interface TimelineEvent {
  at: string
  title: string
  desc: string
  type: 'recon' | 'evidence' | 'lab' | 'lesson'
}

export function TimelineViz({ className = '' }: { className?: string }) {
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const [records, setRecords] = useState<EvidenceRecord[]>([])

  useEffect(() => {
    try {
      const raw = (localStorage.getItem(EVIDENCE_KEY) || localStorage.getItem(LEGACY_EVIDENCE_KEY))
      if (raw) setRecords(JSON.parse(raw) as EvidenceRecord[])
    } catch { /* storage unavailable or unreadable */ }
  }, [])

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [
      ...records.map(r => ({
        at: r.createdAt || r.at || '',
        title: `${r.kind === 'capture' ? 'Capture' : r.kind === 'config' ? 'Config' : 'Artefact'} — ${r.label || r.id}`,
        desc: [
          r.claim && `claim: ${r.claim}`,
          r.filter && `filter: ${r.filter}`,
          r.frames && `frames: ${r.frames}`,
          r.sha256 && `sha256: ${r.sha256.slice(0, 16)}…`,
        ].filter(Boolean).join(' • '),
        type: 'evidence' as const,
      })),
      ...completedLabs.map(l => ({
        at: l.completedAt || '',
        title: `Lab completed — ${l.labId}`,
        desc: `${l.moduleId}${l.score !== undefined ? ` • score ${l.score}` : ''} • +${l.points} XP`,
        type: 'lab' as const,
      })),
      ...completedLessons.map(l => ({
        at: l.completedAt || '',
        title: `Lesson completed — ${l.lessonId}`,
        desc: `${l.moduleId} • +${l.points} XP`,
        type: 'lesson' as const,
      })),
    ].filter(e => e.at)

    return list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [records, completedLabs, completedLessons])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lesson': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
      case 'lab': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      case 'evidence': return 'bg-violet-500/10 border-violet-500/20 text-violet-400'
      default: return 'bg-[#1e293b] border-[#334155] text-slate-500'
    }
  }
  const icon = { lesson: Target, lab: FlaskConical, evidence: FileCode } as const

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Engagement timeline — from your own records</h3>
          <p className="text-[11px] text-slate-500 font-mono">
            {events.length} entries • evidence vault + local completions • chronological
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-center">
          <Info className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <div className="text-[12.5px] text-slate-300">No timeline yet</div>
          <p className="mt-1.5 text-[11.5px] text-slate-500 leading-relaxed max-w-[560px] mx-auto">
            The timeline is built from two real sources: records you add to the Evidence Vault (label, claim,
            filter, frame numbers, SHA-256) and the completion timestamps of lessons and labs on this device.
            Nothing is pre-filled with a sample engagement — add your first artefact, or complete a lab, and it
            will appear here in order.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/20 via-violet-500/20 to-amber-500/20" />
          <div className="space-y-4">
            {events.map((ev, idx) => {
              const Icon = icon[ev.type as keyof typeof icon] || Shield
              return (
                <motion.div key={`${ev.at}-${idx}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx, 10) * 0.04 }} className="relative flex gap-4 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 ${getTypeColor(ev.type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">{new Date(ev.at).toLocaleString()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${getTypeColor(ev.type)}`}>{ev.type.toUpperCase()}</span>
                      <span className="text-[12px] font-semibold text-slate-100 break-words">{ev.title}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-slate-500 leading-relaxed break-words">{ev.desc}</div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-5 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
        <span>
          Report writing tip: a defensible timeline cites the artefact and the reproducible extraction for each step
          (for example <span className="font-mono text-slate-400">wpa2-handshake.pcapng • frame 4 EAPOL-Key M1</span>),
          not the tool that produced it. Export the evidence vault with Reports → Evidence Vault when you attach it.
        </span>
      </div>
    </div>
  )
}
