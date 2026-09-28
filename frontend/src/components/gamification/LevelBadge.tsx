import { motion } from 'framer-motion'
import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { Trophy, Zap, Target, Award, Crown, Star } from 'lucide-react'
import { useMemo } from 'react'

export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const level = useProgressStore(s => s.getLevel())
  const totalXp = useProgressStore(s => s.getTotalXp())
  const xpInfo = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent }
  }, [totalXp, level])

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f172a] border border-[#1e293b] backdrop-blur-sm">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
          <span className="text-[12px]">{level.icon}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-200">{level.title}</span>
          <span className="text-[10px] font-mono text-slate-500">Lv.{level.level}</span>
        </div>
        <div className="w-12 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50 ml-1">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${xpInfo.percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] via-violet-500/[0.02] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center shadow-glow-cyan/20">
              <span className="text-[18px]">{level.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-100">{level.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">LVL {level.level}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{totalXp} XP total • {LEVELS.length} levels</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Next Level</div>
            <div className="text-[13px] font-bold text-slate-200 font-mono">
              {xpInfo.nextLevel ? `${xpInfo.needed} XP to ${xpInfo.nextLevel.title}` : 'MAX LEVEL!'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500">{level.minXp} XP</span>
            <span className="text-slate-400">{xpInfo.percent.toFixed(0)}% to next</span>
            <span className="text-slate-500">{xpInfo.nextLevel?.minXp || level.maxXp} XP</span>
          </div>
          <div className="relative h-2.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpInfo.percent}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 rounded-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
            </motion.div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {LEVELS.slice(0, 4).map(l => {
            const isCurrent = l.level === level.level
            const isPast = l.level < level.level
            return (
              <div key={l.level} className={`p-2 rounded-xl border text-center transition-all duration-200 ${isCurrent ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : isPast ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#020617]/60 border-[#1e293b]/40 text-slate-600'}`}>
                <div className="text-[12px]">{l.icon}</div>
                <div className="text-[10px] font-bold mt-1">{l.title}</div>
                <div className="text-[9px] font-mono opacity-60">Lv.{l.level}</div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export function XpProgressBar() {
  const level = useProgressStore(s => s.getLevel())
  const totalXp = useProgressStore(s => s.getTotalXp())
  const xpInfo = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent }
  }, [totalXp, level])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-slate-100 font-mono">{totalXp} XP</div>
          <div className="text-[10px] text-slate-500 font-mono">{level.title} Lv.{level.level}</div>
        </div>
      </div>
      <div className="flex-1 max-w-[120px]">
        <div className="w-full h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${xpInfo.percent}%` }} />
        </div>
      </div>
    </div>
  )
}

export function CertificationPayoff() {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const overall = useProgressStore(s => s.getOverallProgress())
  const completedLessons = useProgressStore(s => s.completedLessons.length)
  const completedLabs = useProgressStore(s => s.completedLabs.length)
  const achievements = useProgressStore(s => s.achievements.length)
  const level = useProgressStore(s => s.getLevel())

  const maxXp = 2450
  const percentToCert = Math.min((totalXp / maxXp) * 100, 100)
  const isCertified = totalXp >= 2000 && overall >= 80

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#1a1033] border border-violet-500/20 p-6 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-cyan-500/[0.03] to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-amber-500/20 border border-violet-500/30 flex items-center justify-center shadow-glow-violet">
              <Crown className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[15px] text-slate-100 flex items-center gap-2">
                WiFiForge Certified
                {isCertified && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">UNLOCKED</span>}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Complete journey to earn certificate</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-bold text-slate-100 font-mono">{Math.round(percentToCert)}%</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">To Certified</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] font-bold text-slate-100 font-mono">{completedLessons}/80</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Lessons</div>
            <div className="w-full h-1 bg-[#1e293b] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(completedLessons/80)*100}%` }} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] font-bold text-slate-100 font-mono">{completedLabs}/20</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Labs</div>
            <div className="w-full h-1 bg-[#1e293b] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(completedLabs/20)*100}%` }} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] font-bold text-slate-100 font-mono">{achievements}/20</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Achievements</div>
            <div className="w-full h-1 bg-[#1e293b] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(achievements/20)*100}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 flex items-center gap-1.5"><Target className="w-3 h-3" /> Progress to Forge Master</span>
            <span className="text-slate-300">{totalXp} / {maxXp} XP</span>
          </div>
          <div className="relative h-2.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentToCert}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-cyan-400 to-amber-400 rounded-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
            </motion.div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Initiate</span>
            <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {level.title} Lv.{level.level}</span>
            <span>Forge Master</span>
          </div>
        </div>

        {isCertified ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-emerald-300">🎉 Certified! You are WiFiForge Certified!</div>
              <div className="text-[11px] text-emerald-400/80 mt-1">Download your certificate from Reports • Share your achievement • Final flag: WIFIFORGE{'{FINAL_RECON_ASSESSMENT_COMPLETE}'}</div>
            </div>
          </motion.div>
        ) : (
          <div className="mt-5 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 flex items-start gap-2.5">
            <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-amber-300">Goal:</span> Complete all 20 modules (80 lessons), 18 labs, 15 challenges, earn {maxXp} XP to unlock <span className="text-violet-300 font-medium">WiFiForge Certified</span> certificate + final assessment flag. Current: {level.title} • {totalXp} XP • {overall}% overall.
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
