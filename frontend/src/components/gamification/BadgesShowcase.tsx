import { motion } from 'framer-motion'
import { ACHIEVEMENTS_DEF, useProgressStore } from '@/store/useProgressStore'
import { Crown, Trophy, Star, Lock } from 'lucide-react'

export function BadgesShowcase({ className = '' }: { className?: string }) {
  const achievements = useProgressStore(s => s.achievements)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())

  // Defined once in the progress store; rarity/XP are derived from the real achievement points.
  const rarityFor = (points: number) => (points >= 200 ? 'legendary' : points >= 100 ? 'epic' : points >= 50 ? 'rare' : 'common')
  const allBadges = ACHIEVEMENTS_DEF.map(def => ({
    id: def.id,
    title: def.title,
    desc: def.description,
    icon: def.icon,
    xp: def.points,
    rarity: rarityFor(def.points),
    unlocked: achievements.some(a => a.id === def.id),
  }))

  const getRarityColor = (rarity: string, unlocked: boolean) => {
    if (!unlocked) return 'bg-[#020617]/40 border-[#1e293b]/40 text-slate-600 opacity-60'
    switch(rarity) {
      case 'common': return 'bg-slate-500/10 border-slate-500/20 text-slate-300'
      case 'rare': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 shadow-glow-cyan'
      case 'epic': return 'bg-violet-500/10 border-violet-500/20 text-violet-300 shadow-glow-violet'
      case 'legendary': return 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-glow-amber'
      default: return 'bg-[#1e293b] border-[#334155] text-slate-400'
    }
  }

  const unlockedCount = allBadges.filter(b => b.unlocked).length

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100 flex items-center gap-2">
            Achievements — {ACHIEVEMENTS_DEF.length} defined • {unlockedCount} unlocked
            <Crown className="w-4 h-4 text-amber-400" />
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">Derived from local completions • rarity follows achievement XP • nothing here is pre-unlocked</p>
        </div>
        <div className="ml-auto text-[12px] font-bold font-mono text-amber-300 shrink-0">{totalXp} XP • Lv.{level.level}</div>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {allBadges.map((badge, idx) => (
          <motion.div key={badge.id} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.02 }} whileHover={{ scale: badge.unlocked ? 1.05 : 1.02, y: -2 }} className={`group p-3 rounded-xl border flex flex-col items-center text-center transition-all min-w-0 ${getRarityColor(badge.rarity, badge.unlocked)}`}>
            <div className="text-[24px] mb-1 group-hover:scale-110 transition-transform">{badge.unlocked ? badge.icon : '🔒'}</div>
            <div className={`text-[11px] font-bold leading-tight ${badge.unlocked ? 'text-slate-100' : 'text-slate-600'}`}>{badge.title}</div>
            <div className="text-[10px] text-slate-500 mt-1 leading-tight">{badge.desc}</div>
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${badge.rarity === 'common' ? 'bg-slate-500/10 border-slate-500/20 text-slate-500' : badge.rarity === 'rare' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : badge.rarity === 'epic' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>{badge.rarity}</span>
              <span className="text-[9px] font-mono text-slate-500">{badge.xp} XP</span>
            </div>
            {!badge.unlocked && <Lock className="w-3 h-3 text-slate-600 mt-1.5" />}
          </motion.div>
        ))}
      </div>

      <div className="mt-5 p-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 flex items-center gap-2 text-[11px] text-slate-500">
        <Star className="w-4 h-4 text-amber-400 shrink-0" />
        <span><span className="font-semibold text-amber-300">Scope:</span> achievements unlock from your own completions in this browser — nothing is pre-unlocked, and there is no sharing service or leaderboard behind them.</span>
      </div>
    </div>
  )
}
