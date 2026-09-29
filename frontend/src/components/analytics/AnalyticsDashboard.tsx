import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'
import modules from '@/content/modules.json'
import { TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_SCENARIOS } from '@/content/stats'
import { BarChart3, TrendingUp, Flame, BookOpen, Zap, Trophy, Info } from 'lucide-react'

/**
 * Progress analytics — computed from what this browser actually recorded.
 *
 * Every number on this panel comes from the local progress store (lesson/lab/quiz completions with
 * real timestamps). When nothing has been recorded yet, the panels say so instead of showing a
 * placeholder chart.
 */

interface ModuleRow { id: string; title: string; phase: number; lessons: unknown[] }

export function AnalyticsDashboard({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.getStreak())
  const achievements = useProgressStore(s => s.achievements)
  const overall = useProgressStore(s => s.getOverallProgress())
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)

  const moduleRows = useMemo(() => {
    const list = modules as ModuleRow[]
    return list.map(m => ({
      id: m.id,
      title: m.title,
      progress: getModuleProgress(m.id),
      lessons: Array.isArray(m.lessons) ? m.lessons.length : 0,
    }))
  }, [getModuleProgress, completedLessons, completedLabs, quizScores])

  const started = moduleRows.filter(m => m.progress > 0)
  const nothingRecorded = completedLessons.length === 0 && completedLabs.length === 0 && quizScores.length === 0

  // Real activity by weekday, from the timestamps stored with each completion.
  const weekly = useMemo(() => {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const buckets = labels.map(() => 0)
    const points: { at: string; points: number }[] = [
      ...completedLessons.map(l => ({ at: l.completedAt || '', points: l.points || 0 })),
      ...completedLabs.map(l => ({ at: l.completedAt || '', points: l.points || 0 })),
      ...quizScores.map(q => ({ at: q.completedAt || '', points: q.points || 0 })),
    ]
    const now = new Date()
    const startOfWeek = new Date(now)
    const dow = (now.getDay() + 6) % 7 // Monday = 0
    startOfWeek.setDate(now.getDate() - dow)
    startOfWeek.setHours(0, 0, 0, 0)
    let tracked = 0
    for (const p of points) {
      if (!p.at) continue
      const when = new Date(p.at)
      if (Number.isNaN(when.getTime()) || when < startOfWeek) continue
      const idx = (when.getDay() + 6) % 7
      buckets[idx] += p.points
      tracked++
    }
    return { labels, buckets, tracked }
  }, [completedLessons, completedLabs, quizScores])

  const weekTotal = weekly.buckets.reduce((a, b) => a + b, 0)
  const peak = Math.max(...weekly.buckets, 0)

  const stats = [
    { icon: Zap, label: 'Total XP', value: `${totalXp}`, sub: `Lv ${level.level} • ${level.title}`, color: 'amber' },
    { icon: BookOpen, label: 'Lessons', value: `${completedLessons.length}/${TOTAL_LESSONS}`, sub: `${Math.round((completedLessons.length / TOTAL_LESSONS) * 100)}% of authored lessons`, color: 'cyan' },
    { icon: Flame, label: 'Streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, sub: streak > 0 ? 'local activity streak' : 'no activity recorded yet', color: 'orange' },
    { icon: Trophy, label: 'Achievements', value: `${achievements.length}`, sub: `${achievements.reduce((a, b) => a + b.points, 0)} XP from unlocks`, color: 'violet' },
  ]

  return (
    <div className={`space-y-4 xs:space-y-5 min-w-0 w-full ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155]/60 transition-colors min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${stat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : stat.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : stat.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
                <stat.icon className={`w-4 h-4 ${stat.color === 'amber' ? 'text-amber-400' : stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'orange' ? 'text-orange-400' : 'text-violet-400'}`} />
              </div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-[20px] font-bold font-mono text-slate-100 tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-heading font-bold text-[13px] text-slate-100">Module progress</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400 font-mono">{TOTAL_MODULES} modules</span>
          </div>

          {started.length === 0 ? (
            <div className="p-5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-center">
              <div className="text-[12.5px] text-slate-300">No module progress yet</div>
              <p className="mt-1.5 text-[11.5px] text-slate-400 leading-relaxed">
                Progress appears here as soon as you complete a lesson, lab or quiz. Start with
                <span className="font-mono text-slate-400"> Modules → {moduleRows[0]?.title ?? 'the first module'}</span>, then run the matching lab in the PCAP inspector.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {started.map((m, idx) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate flex-1 mr-2">{m.title}</span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">{m.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#020617] border border-[#1e293b]/60 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} transition={{ duration: 0.8, delay: idx * 0.05 }} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                  </div>
                </div>
              ))}
              {started.length < TOTAL_MODULES && (
                <div className="text-[11px] text-slate-400 font-mono pt-1">{TOTAL_MODULES - started.length} modules not started</div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-heading font-bold text-[13px] text-slate-100">This week&apos;s XP</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">+{weekTotal} XP</span>
          </div>

          {weekly.tracked === 0 ? (
            <div className="p-5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-center">
              <div className="text-[12.5px] text-slate-300">No completions recorded this week</div>
              <p className="mt-1.5 text-[11.5px] text-slate-400 leading-relaxed">
                The chart counts XP from completions stored on this device in the current Mon–Sun week. Complete a
                lesson ({TOTAL_LESSONS} authored), a lab ({TOTAL_PCAPS} verified captures) or a decision scenario
                ({TOTAL_SCENARIOS} available) and it will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-1 h-[120px]">
                {weekly.buckets.map((xp, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: peak ? `${Math.max((xp / peak) * 100, 2)}%` : '2%' }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 to-violet-500/40 border border-violet-500/20 min-h-[8px]"
                      title={`${xp} XP`}
                    />
                    <span className="text-[10px] font-mono text-slate-400">{weekly.labels[idx]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
                  <div className="text-[14px] font-bold font-mono text-slate-100">{peak}</div>
                  <div className="text-[10px] text-slate-400">Best day</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
                  <div className="text-[14px] font-bold font-mono text-slate-100">{Math.round(weekTotal / 7)}</div>
                  <div className="text-[10px] text-slate-400">Avg/day</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
                  <div className="text-[14px] font-bold font-mono text-slate-100">{weekly.buckets.filter(b => b > 0).length}</div>
                  <div className="text-[10px] text-slate-400">Active days</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-violet-400" />
          <h3 className="font-heading font-bold text-[13px] text-slate-100">Where you stand</h3>
          <span className="ml-auto text-[10px] font-mono text-slate-400">{overall}% overall</span>
        </div>
        {nothingRecorded ? (
          <p className="text-[12px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            Nothing recorded on this device yet, so there is nothing to compare. This analytics view reads local progress,
            XP and achievements only; account-synced records are separate. Clearing site data removes this local history.
          </p>
        ) : (
          <p className="text-[12px] text-slate-400 leading-relaxed">
            {completedLessons.length} lessons, {completedLabs.length} labs and {quizScores.length} quizzes recorded
            locally, {achievements.length} achievements unlocked. Overall completion ({overall}%) is derived from those
            records plus XP against the level table. This local view does not include account-synced records and is not a
            comparison with other learners.
          </p>
        )}
      </div>
    </div>
  )
}
