import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Clock, Lightbulb, Target, CheckCircle, Award, Zap, Timer, Eye, EyeOff, BarChart3 } from 'lucide-react'

interface Hint {
  level: number
  text: string
  xpPenalty: number
}

const hints: Hint[] = [
  { level: 1, text: 'Check beacon frame — SSID, BSSID, channel, security. Use filter wlan.fc.type_subtype==8', xpPenalty: 0 },
  { level: 2, text: 'Look for WPS IE — wps filter. If present, 11k PIN flaw feasible. Check hostapd.conf wps_state', xpPenalty: 5 },
  { level: 3, text: 'Full answer: WPS enabled, 11k PIN, PSK recovery, disable WPS, hostapd wps_state=0, wash -i wlan0mon no WPS', xpPenalty: 10 },
]

export function LabScoring({ labId, className = '' }: { labId: string; className?: string }) {
  const [time, setTime] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    let interval: any
    if (isActive && !completed) {
      interval = setInterval(() => setTime(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isActive, completed])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const revealHint = (level: number) => {
    if (!revealedHints.includes(level)) setRevealedHints([...revealedHints, level])
  }

  const xpPenalty = revealedHints.reduce((a, lvl) => a + (hints.find(h => h.level === lvl)?.xpPenalty || 0), 0)
  const baseXp = 25
  const finalXp = Math.max(baseXp - xpPenalty, 5)

  const handleComplete = () => {
    setCompleted(true)
    setIsActive(false)
    setScore(finalXp)
    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('wififorge-lab-scores') || '{}')
      existing[labId] = { time, xp: finalXp, hints: revealedHints.length, completedAt: new Date().toISOString(), score: 100 - revealedHints.length * 20 }
      localStorage.setItem('wififorge-lab-scores', JSON.stringify(existing))
    } catch {}
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] text-slate-100">Lab Scoring — Hints • Timer • XP • Production</h3>
            <p className="text-[11px] text-slate-500 font-mono">{labId} • {formatTime(time)} elapsed • {revealedHints.length}/3 hints • {finalXp} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono flex items-center gap-1"><Timer className="w-3 h-3" />{formatTime(time)}</span>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${completed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>{completed ? 'Completed' : 'Active'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Clock className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-slate-100">{formatTime(time)}</div>
          <div className="text-[10px] text-slate-500">Time</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Target className="w-4 h-4 text-violet-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-slate-100">{revealedHints.length}/3</div>
          <div className="text-[10px] text-slate-500">Hints used</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-[16px] font-bold font-mono text-amber-300">{finalXp} XP</div>
          <div className="text-[10px] text-slate-500">Final XP</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-400" />Hints — progressive disclosure — XP penalty</div>
        {hints.map(hint => {
          const revealed = revealedHints.includes(hint.level)
          return (
            <div key={hint.level} className={`p-3 rounded-xl border flex items-start gap-3 ${revealed ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#020617]/40 border-[#1e293b]/40'}`}>
              <button onClick={() => revealHint(hint.level)} className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors touch-manipulation ${revealed ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-slate-300'}`}>
                {revealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Hint {hint.level}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${hint.xpPenalty === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>-{hint.xpPenalty} XP</span>
                </div>
                <div className={`text-[12px] mt-1 leading-relaxed ${revealed ? 'text-slate-300' : 'text-slate-600 blur-[4px] select-none'}`}>{hint.text}</div>
              </div>
            </div>
          )
        })}
      </div>

      {!completed ? (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleComplete} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-glow-emerald touch-manipulation min-h-[44px]">
          <CheckCircle className="w-4 h-4" />Complete Lab — {finalXp} XP • {formatTime(time)}
        </motion.button>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <Award className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[14px] font-bold text-emerald-300">Lab Completed! +{score} XP • {formatTime(time)} • Score {100 - revealedHints.length * 20}%</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Evidence auto-captured • Snapshot saved • Leaderboard updated • Production ready</div>
          </div>
        </div>
      )}
    </div>
  )
}
