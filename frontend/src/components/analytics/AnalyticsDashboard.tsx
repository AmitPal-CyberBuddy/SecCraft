import { LearningProgress } from '@/components/learning/LearningProgress'
import { useMemo } from 'react'
import { useProgressStore } from '@/store/useProgressStore'
import modules from '@/content/modules.json'
import { TOTAL_LESSONS, TOTAL_PCAPS, TOTAL_SCENARIOS } from '@/content/stats'
import { BarChart3, TrendingUp, Flame, BookOpen, Zap, Trophy, Info } from 'lucide-react'

/**
 * Progress analytics — computed from what this browser actually recorded.
 *
 * Every number on this panel comes from the local progress store (lesson/lab/quiz completions with
 * real timestamps). When nothing has been recorded yet, the panels say so instead of showing a
 * placeholder chart.
 */

interface ModuleRow { learningPathId?: string; id: string; title: string; phase: number; lessons: unknown[] }

export function AnalyticsDashboard({ className = '' }: { className?: string }) {
  const currentPathId = useProgressStore(s => s.currentLearningPathId)
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
    return list.filter(module => !currentPathId || module.learningPathId === currentPathId).map(m => ({
      id: m.id,
      title: m.title,
      progress: getModuleProgress(m.id),
      lessons: Array.isArray(m.lessons) ? m.lessons.length : 0,
    }))
  }, [getModuleProgress, completedLessons, completedLabs, quizScores, currentPathId])

  const started = moduleRows.filter(m => m.progress > 0)
  const nothingRecorded = completedLessons.length === 0 && completedLabs.length === 0 && quizScores.length === 0

  // Real activity by weekday, from the timestamps stored with each completion.
  const weekly = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
      if (Number.isNaN(when.getTime()) || when < startOfWeek || when > now) continue
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
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] hover:border-[var(--line-strong)] transition-colors min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${stat.color === 'amber' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : stat.color === 'cyan' ? 'bg-[var(--accent-bg)] border-[var(--accent-border)]' : stat.color === 'orange' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : 'bg-[var(--owner-bg)] border-[var(--owner-border)]'}`}>
                <stat.icon className={`w-4 h-4 ${stat.color === 'amber' ? 'text-[var(--attention)]' : stat.color === 'cyan' ? 'text-[var(--learning)]' : stat.color === 'orange' ? 'text-[var(--attention)]' : 'text-[var(--owner)]'}`} />
              </div>
              <span className="text-sm font-medium text-[var(--ink-secondary)] uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-[20px] font-bold font-mono text-[var(--ink-primary)] tracking-tight">{stat.value}</div>
            <div className="text-sm text-[var(--ink-secondary)] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[var(--learning)]" />
            <h3 className="font-heading font-bold text-sm text-[var(--ink-primary)]">{currentPathId ? 'Current path progress' : 'Learning path progress'}</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)] font-mono">{moduleRows.length} modules</span>
          </div>

          {started.length === 0 ? (
            <div className="p-5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
              <div className="text-sm text-[var(--ink-secondary)]">No module progress yet</div>
              <p className="mt-1.5 text-sm text-[var(--ink-secondary)] leading-relaxed">
                Progress appears here as soon as you complete a lesson, lab or quiz. Start with
                <span className="font-mono text-[var(--ink-secondary)]"> Modules → {moduleRows[0]?.title ?? 'the first module'}</span>, then run the matching lab in the PCAP inspector.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {started.map(m => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ink-secondary)] truncate flex-1 mr-2">{m.title}</span>
                    <span className="text-sm font-mono text-[var(--ink-secondary)] shrink-0">{m.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] overflow-hidden">
                    <LearningProgress value={m.progress} label={`${m.title} local progress`} />
                  </div>
                </div>
              ))}
              {started.length < moduleRows.length && (
                <div className="text-sm text-[var(--ink-secondary)] font-mono pt-1">{moduleRows.length - started.length} modules not started</div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--success)]" />
            <h3 className="font-heading font-bold text-sm text-[var(--ink-primary)]">This week&apos;s XP</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] font-mono">+{weekTotal} XP</span>
          </div>

          {weekly.tracked === 0 ? (
            <div className="p-5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
              <div className="text-sm text-[var(--ink-secondary)]">No completions recorded this week</div>
              <p className="mt-1.5 text-sm text-[var(--ink-secondary)] leading-relaxed">
                The chart counts XP from completions stored on this device in the current Mon–Sun week. Complete a
                lesson ({TOTAL_LESSONS} authored), a lab ({TOTAL_PCAPS} verified captures) or a decision scenario
                ({TOTAL_SCENARIOS} available) and it will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="sc-week-chart" aria-label="Local completion XP this week">
                {weekly.buckets.map((xp, idx) => (
                  <div key={idx} className="sc-week-bar">
                    <div
                      style={{ height: peak ? `${Math.max((xp / peak) * 100, 2)}px` : '2px' }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-[var(--accent-bg)] to-[var(--owner-bg)] border border-[var(--owner-border)] min-h-[8px]"
                      title={`${xp} XP`}
                    />
                    <span className="sc-week-value">{xp} XP</span><span className="text-xs font-mono text-[var(--ink-secondary)]">{weekly.labels[idx]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
                  <div className="text-[14px] font-bold font-mono text-[var(--ink-primary)]">{peak}</div>
                  <div className="text-[10px] text-[var(--ink-secondary)]">Best day</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
                  <div className="text-[14px] font-bold font-mono text-[var(--ink-primary)]">{Math.round(weekTotal / 7)}</div>
                  <div className="text-[10px] text-[var(--ink-secondary)]">Avg/day</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
                  <div className="text-[14px] font-bold font-mono text-[var(--ink-primary)]">{weekly.buckets.filter(b => b > 0).length}</div>
                  <div className="text-[10px] text-[var(--ink-secondary)]">Active days</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[var(--owner)]" />
          <h3 className="font-heading font-bold text-sm text-[var(--ink-primary)]">Where you stand</h3>
          <span className="ml-auto text-[10px] font-mono text-[var(--ink-secondary)]">{overall}% overall</span>
        </div>
        {nothingRecorded ? (
          <p className="text-sm text-[var(--ink-secondary)] flex items-start gap-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--ink-secondary)]" />
            Nothing recorded on this device yet, so there is nothing to compare. This analytics view reads local progress,
            XP and achievements only; account-synced records are separate. Clearing site data removes this local history.
          </p>
        ) : (
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
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
