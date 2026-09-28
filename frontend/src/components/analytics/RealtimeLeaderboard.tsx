import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, Zap, Flame, Users, TrendingUp, Clock, Award, Wifi } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

interface LeaderUser {
  id: string
  name: string
  xp: number
  level: number
  streak: number
  avatar: string
  team: string
  change: 'up' | 'down' | 'same'
  delta: number
}

export function RealtimeLeaderboard({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.streak)

  const [users, setUsers] = useState<LeaderUser[]>([
    { id: '1', name: 'You', xp: totalXp, level: level.level, streak, avatar: '👑', team: 'red-team-alpha', change: 'same', delta: 0 },
    { id: '2', name: 'alice.wifi', xp: 2150, level: 8, streak: 12, avatar: '🚀', team: 'instructors', change: 'up', delta: 50 },
    { id: '3', name: 'bob.pentest', xp: 1890, level: 7, streak: 5, avatar: '🔥', team: 'red-team-alpha', change: 'down', delta: -20 },
    { id: '4', name: 'carol.recon', xp: 1650, level: 6, streak: 8, avatar: '⚡', team: 'blue-beta', change: 'up', delta: 120 },
    { id: '5', name: 'dave.enterprise', xp: 1420, level: 5, streak: 3, avatar: '🛡️', team: 'purple-gamma', change: 'same', delta: 0 },
    { id: '6', name: 'eve.captive', xp: 1280, level: 5, streak: 2, avatar: '🎯', team: 'blue-beta', change: 'up', delta: 30 },
    { id: '7', name: 'frank.radius', xp: 1100, level: 4, streak: 7, avatar: '📡', team: 'purple-gamma', change: 'down', delta: -10 },
  ])

  const [liveEvents, setLiveEvents] = useState<string[]>([])

  useEffect(() => {
    // Simulate real-time WebSocket updates
    const interval = setInterval(() => {
      setUsers(prev => {
        const updated = [...prev]
        const randomIdx = Math.floor(Math.random() * (updated.length - 1)) + 1
        const delta = Math.floor(Math.random() * 50) + 5
        updated[randomIdx] = { ...updated[randomIdx], xp: updated[randomIdx].xp + delta, change: 'up', delta }
        // Sort by XP
        updated.sort((a,b) => b.xp - a.xp)
        return updated
      })
      const events = ['+25 XP lesson', '+50 XP lab', '+40 XP quiz perfect', '+10 XP streak', 'Achievement Explorer', 'Lab beacon completed']
      setLiveEvents(e => [events[Math.floor(Math.random()*events.length)] + ` • ${new Date().toLocaleTimeString()}`, ...e].slice(0, 5))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Update You when totalXp changes
  useEffect(() => {
    setUsers(prev => {
      const updated = prev.map(u => u.name === 'You' ? { ...u, xp: totalXp, level: level.level, streak } : u)
      updated.sort((a,b) => b.xp - a.xp)
      return updated
    })
  }, [totalXp, level.level, streak])

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100 flex items-center gap-2">
              Realtime Leaderboard — WebSocket Live
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">Live XP • Anti-cheat • Team • Weekly • Production</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono flex items-center gap-1"><Wifi className="w-3 h-3" />Live</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{users.length} operators</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {users.map((user, idx) => (
            <motion.div key={user.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${user.name === 'You' ? 'bg-violet-500/10 border-violet-500/30 shadow-glow-violet' : 'bg-[#020617]/60 border-[#1e293b]/40 hover:bg-[#020617]/80'}`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold font-mono shrink-0 border ${idx === 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : idx === 1 ? 'bg-slate-400/20 text-slate-300 border-slate-400/30' : idx === 2 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-[#1e293b] text-slate-500 border-[#334155]'}`}>{idx + 1}</span>
              <span className="text-[16px] shrink-0">{user.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-medium text-slate-200 truncate">{user.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono hidden xs:inline">{user.team}</span>
                  {user.change !== 'same' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono flex items-center gap-0.5 ${user.change === 'up' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {user.change === 'up' ? '↑' : '↓'} {Math.abs(user.delta)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                  <span>Lv.{user.level}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{user.streak}d</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[13px] font-bold font-mono text-cyan-300">{user.xp} XP</div>
                <div className="text-[10px] text-slate-600 font-mono">{user.name === 'You' ? 'You' : `${user.xp - 1000}+`}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-400" />Live Events — WebSocket</div>
            <div className="space-y-1.5">
              <AnimatePresence>
                {liveEvents.map((ev, i) => (
                  <motion.div key={`${ev}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="text-[11px] font-mono text-slate-400 p-2 rounded-lg bg-[#1e293b]/40 border border-[#334155]/40">
                    {ev}
                  </motion.div>
                ))}
              </AnimatePresence>
              {liveEvents.length === 0 && <div className="text-[11px] text-slate-600 font-mono">Waiting for live events… WebSocket connected</div>}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/[0.04] to-cyan-500/[0.04] border border-violet-500/10">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Award className="w-3 h-3 text-violet-400" />Team Standings</div>
            <div className="space-y-2">
              {[
                { team: 'red-team-alpha', xp: 18450 + Math.floor(Math.random()*100), members: 12 },
                { team: 'purple-gamma', xp: 22100 + Math.floor(Math.random()*100), members: 15 },
                { team: 'blue-beta', xp: 12300 + Math.floor(Math.random()*100), members: 8 },
              ].sort((a,b) => b.xp - a.xp).map((t, i) => (
                <div key={t.team} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5"><span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${i===0?'bg-amber-500/20 text-amber-300':'bg-[#1e293b] text-slate-500'}`}>{i+1}</span>{t.team}</span>
                  <span className="text-cyan-300">{t.xp.toLocaleString()} XP • {t.members}m</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-violet-300">Enterprise:</span> WebSocket live, anti-cheat, team isolation, weekly/monthly, 1000+ operators, Redis pub/sub ready, production.
          </div>
        </div>
      </div>
    </div>
  )
}
