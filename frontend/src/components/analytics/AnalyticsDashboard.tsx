import { motion } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'
import { BarChart3, TrendingUp, Clock, Target, Award, Zap, Flame, Trophy, Users, Activity, Shield, BookOpen } from 'lucide-react'

export function AnalyticsDashboard({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const completed = useProgressStore(s => s.completedLessons.length)
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.streak)
  const achievements = useProgressStore(s => s.achievements.length)

  const modulesData = [
    { name: '802.11 Fundamentals', progress: 100, xp: 120 },
    { name: 'Linux & Tools', progress: 85, xp: 100 },
    { name: 'Recon & Scanning', progress: 60, xp: 140 },
    { name: 'WPA/WPA2', progress: 40, xp: 160 },
    { name: 'WPA3 & WPS', progress: 20, xp: 200 },
    { name: 'Enterprise', progress: 0, xp: 0 },
  ]

  const weeklyXp = [120, 200, 150, 300, 250, 180, 220]

  return (
    <div className={`space-y-4 xs:space-y-5 min-w-0 w-full ${className}`}>
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Zap, label: 'Total XP', value: totalXp, sub: `Lv ${level.level} • ${level.title}`, color: 'amber' },
          { icon: BookOpen, label: 'Lessons', value: `${completed}/80`, sub: `${Math.round((completed/80)*100)}% complete`, color: 'cyan' },
          { icon: Flame, label: 'Streak', value: `${streak} days`, sub: 'Keep it up!', color: 'orange' },
          { icon: Trophy, label: 'Achievements', value: `${achievements}/20`, sub: 'Unlock more', color: 'violet' },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155]/60 transition-colors min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${stat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : stat.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : stat.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
                <stat.icon className={`w-4 h-4 ${stat.color === 'amber' ? 'text-amber-400' : stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'orange' ? 'text-orange-400' : 'text-violet-400'}`} />
              </div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-[20px] font-bold font-mono text-slate-100 tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading font-bold text-[13px] text-slate-100">Module Progress</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">20 modules</span>
          </div>
          <div className="space-y-2.5">
            {modulesData.map((m, idx) => (
              <div key={m.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate flex-1 mr-2">{m.name}</span>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">{m.progress}% • {m.xp} XP</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#020617] border border-[#1e293b]/60 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} transition={{ duration: 0.8, delay: idx * 0.05 }} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-heading font-bold text-[13px] text-slate-100">Weekly XP Activity</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">+{weeklyXp.reduce((a,b)=>a+b,0)} XP</span>
          </div>
          <div className="flex items-end gap-1 h-[120px]">
            {weeklyXp.map((xp, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <motion.div initial={{ height: 0 }} animate={{ height: `${(xp/300)*100}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 to-violet-500/40 border border-violet-500/20 min-h-[8px]" />
                <span className="text-[10px] font-mono text-slate-500">{['M','T','W','T','F','S','S'][idx]}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
              <div className="text-[14px] font-bold font-mono text-slate-100">{Math.max(...weeklyXp)}</div>
              <div className="text-[10px] text-slate-500">Peak XP</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
              <div className="text-[14px] font-bold font-mono text-slate-100">{Math.round(weeklyXp.reduce((a,b)=>a+b,0)/7)}</div>
              <div className="text-[10px] text-slate-500">Avg/day</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
              <div className="text-[14px] font-bold font-mono text-emerald-400">+12%</div>
              <div className="text-[10px] text-slate-500">Growth</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-violet-400" />
          <h3 className="font-heading font-bold text-[13px] text-slate-100">Leaderboard — Enterprise Classroom</h3>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">Mock • Multi-user ready</span>
        </div>
        <div className="space-y-2">
          {[
            { rank: 1, name: 'You', xp: totalXp, level: level.level, avatar: '👑' },
            { rank: 2, name: 'alice.wifi', xp: 2150, level: 8, avatar: '🚀' },
            { rank: 3, name: 'bob.pentest', xp: 1890, level: 7, avatar: '🔥' },
            { rank: 4, name: 'carol.recon', xp: 1650, level: 6, avatar: '⚡' },
            { rank: 5, name: 'dave.enterprise', xp: 1420, level: 5, avatar: '🛡️' },
          ].map((user, idx) => (
            <motion.div key={user.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }} className={`flex items-center gap-3 p-3 rounded-xl border ${user.name === 'You' ? 'bg-violet-500/10 border-violet-500/30' : 'bg-[#020617]/60 border-[#1e293b]/40 hover:bg-[#020617]/80'}`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold font-mono shrink-0 ${user.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : user.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : user.rank === 3 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-[#1e293b] text-slate-500 border border-[#334155]'}`}>{user.rank}</span>
              <span className="text-[16px]">{user.avatar}</span>
              <span className="text-[13px] font-medium text-slate-200 flex-1 truncate">{user.name}</span>
              <span className="text-[11px] font-mono text-slate-500 hidden xs:inline">Lv.{user.level}</span>
              <span className="text-[12px] font-bold font-mono text-cyan-300 shrink-0">{user.xp} XP</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
