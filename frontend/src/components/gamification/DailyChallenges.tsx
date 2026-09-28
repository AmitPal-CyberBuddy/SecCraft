import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Target, Trophy, Zap, Clock, CheckCircle, Award, Calendar, TrendingUp } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

interface DailyTask {
  id: string
  title: string
  desc: string
  xp: number
  type: 'lesson' | 'lab' | 'quiz' | 'streak'
  progress: number
  total: number
  completed: boolean
}

const todayTasks: DailyTask[] = [
  { id: 'daily-1', title: 'Complete 2 lessons', desc: 'Learn any 2 lessons today', xp: 25, type: 'lesson', progress: 1, total: 2, completed: false },
  { id: 'daily-2', title: 'Analyze 1 PCAP', desc: 'Open PcapInspector + use 3 filters', xp: 30, type: 'lab', progress: 0, total: 1, completed: false },
  { id: 'daily-3', title: 'Perfect Quiz', desc: 'Score 100% on any quiz', xp: 40, type: 'quiz', progress: 0, total: 1, completed: false },
  { id: 'daily-4', title: 'Terminal Mastery', desc: 'Run 5 commands in terminal', xp: 20, type: 'lab', progress: 3, total: 5, completed: false },
]

export function DailyChallenges({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const streak = useProgressStore(s => s.streak)
  const [tasks, setTasks] = useState<DailyTask[]>(todayTasks)

  const completedCount = tasks.filter(t => t.completed).length
  const totalXpToday = tasks.filter(t => t.completed).reduce((a,b) => a + b.xp, 0)

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'lesson': return Target
      case 'lab': return Trophy
      case 'quiz': return Award
      default: return Zap
    }
  }
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'lesson': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'lab': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'quiz': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100 flex items-center gap-2">
              Daily Challenges
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono">{streak} day streak</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">Resets 00:00 UTC • Enterprise streak system • {completedCount}/{tasks.length} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{totalXpToday} XP today</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono flex items-center gap-1"><Calendar className="w-3 h-3" />Daily</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {tasks.map((task, idx) => {
          const Icon = getTypeIcon(task.type)
          return (
            <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`p-3.5 rounded-xl border flex items-start gap-3 min-w-0 ${task.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#020617]/60 border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/40'} transition-colors`}>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-500/10 border-emerald-500/20' : getTypeColor(task.type)}`}>
                {task.completed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[13px] font-medium truncate ${task.completed ? 'text-emerald-300 line-through' : 'text-slate-200'}`}>{task.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${getTypeColor(task.type)}`}>{task.xp} XP</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{task.desc}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#020617] border border-[#1e293b]/40 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${(task.progress/task.total)*100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{task.progress}/{task.total}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/[0.04] to-orange-500/[0.04] border border-amber-500/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[12px] text-slate-300 font-medium">Weekly bonus: Complete 5 dailies → +100 XP + 🔥 streak freeze</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-slate-500">Live</span>
        </div>
      </div>
    </div>
  )
}
