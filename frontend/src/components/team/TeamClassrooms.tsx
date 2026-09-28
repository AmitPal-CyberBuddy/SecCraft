import { motion } from 'framer-motion'
import { Users, Shield, Crown, Award, BookOpen, FlaskConical, Trophy, Zap, Settings, Plus, UserPlus, BarChart3 } from 'lucide-react'

interface Team {
  id: string
  name: string
  members: number
  instructor: string
  progress: number
  xp: number
  level: string
}

const teams: Team[] = [
  { id: 'red-alpha', name: 'Red Team Alpha', members: 12, instructor: 'alice.wifi', progress: 78, xp: 18450, level: 'Advanced' },
  { id: 'blue-beta', name: 'Blue Team Beta', members: 8, instructor: 'bob.defense', progress: 65, xp: 12300, level: 'Intermediate' },
  { id: 'purple-gamma', name: 'Purple Team Gamma', members: 15, instructor: 'carol.purple', progress: 85, xp: 22100, level: 'Expert' },
]

export function TeamClassrooms({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Team Management — Classrooms • Enterprise</h3>
            <p className="text-[11px] text-slate-500 font-mono">Role-based • JWT • OAuth ready • Instructor analytics • Multi-tenant</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 flex items-center gap-1.5 hover:bg-[#25354f] transition-colors touch-manipulation min-h-[36px]">
            <UserPlus className="w-4 h-4" />Invite
          </button>
          <button className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-glow-violet touch-manipulation min-h-[36px]">
            <Plus className="w-4 h-4" />Create Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {teams.map((team, idx) => (
          <motion.div key={team.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="group p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 transition-all min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-[13px] font-bold text-slate-100 truncate">{team.name}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 font-mono shrink-0">{team.level}</span>
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between"><span className="text-slate-500">Instructor</span><span className="text-slate-300">{team.instructor}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Members</span><span className="text-cyan-300">{team.members} operators</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total XP</span><span className="text-amber-300">{team.xp.toLocaleString()}</span></div>
              <div className="mt-2">
                <div className="flex justify-between mb-1"><span className="text-slate-500">Progress</span><span className="text-slate-300">{team.progress}%</span></div>
                <div className="h-1.5 rounded-full bg-[#020617] border border-[#1e293b]/40 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full" style={{ width: `${team.progress}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1 hover:bg-[#25354f] transition-colors">
                <BarChart3 className="w-3.5 h-3.5" />Analytics
              </button>
              <button className="flex-1 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1 hover:bg-[#25354f] transition-colors">
                <Settings className="w-3.5 h-3.5" />Manage
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 flex items-start gap-2.5">
        <Crown className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed min-w-0">
          <span className="font-semibold text-violet-300">Enterprise:</span> JWT auth foundation, role-based (student/instructor/admin), team classrooms, OAuth ready (Google, GitHub), multi-tenant isolation, instructor dashboard, audit logs SHA256, rate limit 100 req/min. Production-ready for 1000+ operators.
        </div>
      </div>
    </div>
  )
}
