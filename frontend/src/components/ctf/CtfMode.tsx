import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flag, Trophy, Clock, Zap, Shield, Target, Crown, Users, Flame } from 'lucide-react'

interface Challenge {
  id: string
  title: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard' | 'insane'
  solves: number
  flag: string
  solved: boolean
}

const challenges: Challenge[] = [
  { id: 'beacon-recon', title: 'Beacon Recon — SSID BSSID Channel', points: 100, difficulty: 'easy', solves: 245, flag: 'WIFIFORGE{BEACON_SSID_BSSID}', solved: true },
  { id: 'hidden-ssid', title: 'Hidden SSID — Probe Response Reveal', points: 150, difficulty: 'medium', solves: 128, flag: 'WIFIFORGE{HIDDEN_SSID_REVEALED}', solved: false },
  { id: 'wps-pin', title: 'WPS 11k PIN — Brute-force Flaw', points: 200, difficulty: 'medium', solves: 89, flag: 'WIFIFORGE{WPS_11K_PIN}', solved: false },
  { id: 'handshake-crack', title: 'WPA2 Handshake Crack — 12345678', points: 300, difficulty: 'hard', solves: 45, flag: 'WIFIFORGE{HANDSHAKE_CRACKED}', solved: false },
  { id: 'deauth-pmf', title: 'Deauth Flood — PMF Disabled DoS', points: 250, difficulty: 'hard', solves: 67, flag: 'WIFIFORGE{DEAUTH_PMF_BYPASS}', solved: false },
  { id: 'rogue-evil-twin', title: 'Rogue AP — Evil Twin Detection', points: 400, difficulty: 'insane', solves: 12, flag: 'WIFIFORGE{ROGUE_EVIL_TWIN}', solved: false },
  { id: 'enterprise-eap', title: 'Enterprise EAP — Rogue RADIUS MSCHAPv2', points: 500, difficulty: 'insane', solves: 5, flag: 'WIFIFORGE{ENTERPRISE_EAP_CAPTURE}', solved: false },
  { id: 'final-flags', title: 'Final — Full Methodology Assessment', points: 1000, difficulty: 'insane', solves: 2, flag: 'WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}', solved: false },
]

export function CtfMode({ className = '' }: { className?: string }) {
  const [solved, setSolved] = useState<string[]>(['beacon-recon'])
  const [inputFlag, setInputFlag] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [timeLeft, setTimeLeft] = useState(86400) // 24h CTF

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(t => Math.max(t - 1, 0)), 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const submitFlag = () => {
    const chal = challenges.find(c => c.flag === inputFlag.trim())
    if (chal) {
      if (solved.includes(chal.id)) {
        setMessage({ type: 'error', text: `Already solved ${chal.title}` })
      } else {
        setSolved([...solved, chal.id])
        setMessage({ type: 'success', text: `Correct! +${chal.points} XP — ${chal.title} — Flag: ${chal.flag}` })
        setInputFlag('')
      }
    } else {
      setMessage({ type: 'error', text: 'Incorrect flag — try harder — check PCAPs, configs, evidence vault' })
    }
    setTimeout(() => setMessage(null), 4000)
  }

  const totalPoints = solved.reduce((a, id) => a + (challenges.find(c => c.id === id)?.points || 0), 0)
  const getDiffColor = (d: string) => {
    switch(d) {
      case 'easy': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      case 'medium': return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      case 'hard': return 'bg-orange-500/10 border-orange-500/20 text-orange-400'
      case 'insane': return 'bg-red-500/10 border-red-500/20 text-red-400'
      default: return 'bg-[#1e293b] border-[#334155] text-slate-500'
    }
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100 flex items-center gap-2">
              CTF Mode — Team vs Team • 24h • Live Scoreboard
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">8 challenges • 2900 pts max • {solved.length}/8 solved • {totalPoints} pts • Enterprise CTFd</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(timeLeft)}</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">{totalPoints} pts</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative min-w-0">
          <Flag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={inputFlag} onChange={e => setInputFlag(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitFlag()} placeholder="Flag format WIFIFORGE{...} — e.g., WIFIFORGE{BEACON_SSID_BSSID}" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500/30" />
        </div>
        <button onClick={submitFlag} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-glow-red touch-manipulation min-h-[40px]"><Flag className="w-4 h-4" />Submit Flag</button>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 p-3 rounded-xl border text-[12px] font-medium ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {challenges.map((chal, idx) => {
          const isSolved = solved.includes(chal.id)
          return (
            <motion.div key={chal.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`p-4 rounded-xl border ${isSolved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#020617]/60 border-[#1e293b]/60 hover:bg-[#020617]/80'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${getDiffColor(chal.difficulty)}`}>{chal.difficulty.toUpperCase()} • {chal.points} pts</span>
                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />{chal.solves} solves</span>
              </div>
              <div className="text-[13px] font-semibold text-slate-100 leading-tight">{chal.title}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">{chal.id} • Flag: {isSolved ? chal.flag : 'WIFIFORGE{...}'}</div>
              <div className="mt-3 flex items-center gap-2">
                {isSolved ? <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono flex items-center gap-1"><Trophy className="w-3 h-3" />Solved +{chal.points}</span> : <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">Unsolved</span>}
                <span className="ml-auto text-[10px] text-slate-600 font-mono">#{idx+1}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10 flex items-center gap-2 text-[11px] text-slate-500">
        <Flame className="w-4 h-4 text-red-400 shrink-0" />
        <span><span className="font-semibold text-red-300">Enterprise CTF:</span> Team vs team, 24h live scoreboard, 8 challenges 2900 pts, flags per module, CTFd integration, seasonal events Halloween/Christmas, limited badges, anti-cheat, production.</span>
      </div>
    </div>
  )
}
