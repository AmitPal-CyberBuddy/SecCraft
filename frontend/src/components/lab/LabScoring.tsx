import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Clock, Lightbulb, Target, CheckCircle, Award, Zap, Timer, Eye, EyeOff, Info } from 'lucide-react'
import { LABS } from '@/content/labs'
import { POINTS, useProgressStore } from '@/store/useProgressStore'

/**
 * Lab self-scoring.
 *
 * Previously this panel showed three hard-coded WPS answers for *every* lab (including the enterprise
 * and RADIUS ones), invented a "Score 100 - 20 x hints" percentage, and wrote XP to a private
 * localStorage key that the app never counted. All three were misleading.
 *
 * What it does now:
 *  - the objective, the artefact and the tier come from the lab's own catalogue entry (content/labs.ts);
 *  - the three prompts are *method* prompts derived from that entry — what to filter, what to record,
 *    what the evidence does not prove — never the answer;
 *  - completing the lab records the completion (and XP) through the shared progress store, which is
 *    what the dashboard, certificate and analytics read.
 */

interface Props {
  labId: string
  /** Module the lab belongs to; used when the lab is not in the catalogue. */
  moduleId?: string
  className?: string
}

const FILTER_BY_TYPE: { match: RegExp; filter: string }[] = [
  { match: /beacon|rsn/i, filter: 'wlan.fc.type_subtype==8' },
  { match: /recon/i, filter: 'wlan.fc.type_subtype==8 || wlan.fc.type_subtype==4' },
  { match: /traffic/i, filter: 'wlan.fc.type_subtype==8 || wlan.fc.type_subtype==4 || eapol' },
  { match: /handshake|wpa2/i, filter: 'eapol' },
  { match: /pmkid/i, filter: 'eapol' },
  { match: /wps/i, filter: 'wlan.fc.type_subtype==8 && wps' },
  { match: /wpa3|sae/i, filter: 'wlan.fc.type_subtype==8 && wlan.rsn.akms.type' },
  { match: /deauth|disassoc/i, filter: 'wlan.fc.type_subtype==12 || wlan.fc.type_subtype==10' },
  { match: /rogue/i, filter: 'wlan.fc.type_subtype==8' },
  { match: /captive/i, filter: 'http' },
  { match: /enterprise|eap/i, filter: 'eapol || eap' },
  { match: /radius/i, filter: 'radius' },
  { match: /config|wep/i, filter: 'n/a — audit the configuration file, not a capture' },
  { match: /methodology|final/i, filter: 'wlan.fc.type_subtype==8' },
]

export function LabScoring({ labId, moduleId, className = '' }: Props) {
  const completeLab = useProgressStore(s => s.completeLab)
  const isCompleted = useProgressStore(s => s.completedLabs.some(l => l.labId === labId))

  const [time, setTime] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [earned, setEarned] = useState<number | null>(null)

  const lab = useMemo(() => LABS.find(l => l.id === labId), [labId])

  const hints = useMemo(() => {
    const filter = FILTER_BY_TYPE.find(f => f.match.test(lab?.type || labId))?.filter ?? 'wlan.fc.type_subtype==8'
    const artefact = lab?.pcap ? `${lab.pcap}.pcapng` : 'the configuration files in this build'
    return [
      {
        level: 1,
        text: `Open ${artefact} in the inspector and apply ${filter}. Write down the frame numbers you are reading — not the tool output.`,
        xpPenalty: 0,
      },
      {
        level: 2,
        text: `Record the reproducible part: artefact name, SHA-256, filter, frame numbers, and the field values (SSID/BSSID/channel/AKM/reason code) that support your claim. ${lab?.description ?? ''}`.trim(),
        xpPenalty: POINTS.LAB > 25 ? 5 : 0,
      },
      {
        level: 3,
        text: 'State the limits: what does this evidence *not* prove (for example, that the attack is possible from outside the building, or that the same weakness exists on other APs)? Then write the retest check that will show the fix worked.',
        xpPenalty: 10,
      },
    ]
  }, [lab, labId])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (isActive && !isCompleted) interval = setInterval(() => setTime(t => t + 1), 1000)
    return () => { if (interval) clearInterval(interval) }
  }, [isActive, isCompleted])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const revealHint = (level: number) => {
    if (!revealedHints.includes(level)) setRevealedHints([...revealedHints, level])
  }

  const xpPenalty = revealedHints.reduce((a, lvl) => a + (hints.find(h => h.level === lvl)?.xpPenalty || 0), 0)
  const finalXp = Math.max(POINTS.LAB - xpPenalty, Math.round(POINTS.LAB / 3))

  const handleComplete = () => {
    setIsActive(false)
    // Single source of truth: the shared progress store awards and persists the XP.
    const result = completeLab(moduleId || lab?.module || 'unknown', labId)
    setEarned(result.points)
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] text-slate-100">{lab?.title || labId}</h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {labId} • {lab?.type || 'lab'} • {lab?.difficulty || 'unrated'} • {formatTime(time)} elapsed • {revealedHints.length}/3 prompts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono flex items-center gap-1"><Timer className="w-3 h-3" />{formatTime(time)}</span>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>{isCompleted ? 'Completed' : 'In progress'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Clock className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-slate-100">{formatTime(time)}</div>
          <div className="text-[10px] text-slate-500">Time on task</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Target className="w-4 h-4 text-violet-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-slate-100">{revealedHints.length}/3</div>
          <div className="text-[10px] text-slate-500">Prompts used</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-amber-300">{isCompleted ? (earned ?? POINTS.LAB) : finalXp} XP</div>
          <div className="text-[10px] text-slate-500">{isCompleted ? 'Awarded' : 'If you finish now'}</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />Method prompts — never the answer
        </div>
        {hints.map(hint => {
          const revealed = revealedHints.includes(hint.level)
          return (
            <div key={hint.level} className={`p-3 rounded-xl border flex items-start gap-3 ${revealed ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#020617]/40 border-[#1e293b]/40'}`}>
              <button onClick={() => revealHint(hint.level)} aria-label={`Reveal prompt ${hint.level}`} className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors touch-manipulation ${revealed ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-slate-300'}`}>
                {revealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Prompt {hint.level}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${hint.xpPenalty === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>-{hint.xpPenalty} XP</span>
                </div>
                <div className={`text-[12px] mt-1 leading-relaxed ${revealed ? 'text-slate-300' : 'text-slate-600 blur-[4px] select-none'}`}>{hint.text}</div>
              </div>
            </div>
          )
        })}
      </div>

      {!isCompleted ? (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleComplete} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-glow-emerald touch-manipulation min-h-[44px]">
          <CheckCircle className="w-4 h-4" />Mark lab complete — {finalXp} XP • {formatTime(time)}
        </motion.button>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <Award className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-emerald-300">Recorded in your progress{earned ? ` — +${earned} XP` : ''}</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              The completion and XP are stored with your other progress on this device. Time on task and prompt use are
              shown for your own reflection; they are not a score, and nobody reviews them.
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          A lab is finished when you can state the finding, the evidence that supports it and its limits — and write the
          retest check. Record that in the evidence vault and the report editor; the completion here only tracks that you did it.
        </div>
      </div>
    </div>
  )
}
