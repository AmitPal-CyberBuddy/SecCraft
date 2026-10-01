import { Link } from 'react-router-dom'
import { Flame, Target, Trophy, Zap, Clock, CheckCircle, Award, Calendar, TrendingUp } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

interface DailyTask {
  id: string
  title: string
  desc: string
  type: 'lesson' | 'lab' | 'quiz' | 'streak'
  progress: number
  total: number
  completed: boolean
}

/**
 * The "daily" goals are the same three real actions every day; progress is read from the
 * completions this browser recorded today (local date). No counter here is pre-filled.
 */
function buildTasks(completedLessons: { completedAt?: string }[], completedLabs: { completedAt?: string }[], quizScores: { score: number; total: number; completedAt?: string }[]): DailyTask[] {
  const today = new Date().toDateString()
  const onToday = (at?: string) => !!at && new Date(at).toDateString() === today
  const lessonsToday = completedLessons.filter(l => onToday(l.completedAt)).length
  const labsToday = completedLabs.filter(l => onToday(l.completedAt)).length
  const perfectToday = quizScores.filter(q => onToday(q.completedAt) && q.total > 0 && q.score === q.total).length
  const defs: Omit<DailyTask, 'progress' | 'completed'>[] = [
    { id: 'daily-lessons', title: 'Complete 2 lessons', desc: 'Any two authored lessons, today', type: 'lesson', total: 2 },
    { id: 'daily-lab', title: 'Record 1 lab review', desc: 'Record a self-review or pass an answer-checked lab today', type: 'lab', total: 1 },
    { id: 'daily-quiz', title: 'Perfect quiz', desc: 'Score 100% on any module quiz', type: 'quiz', total: 1 },
  ]
  const progress = [lessonsToday, labsToday, perfectToday]
  return defs.map((d, i) => ({ ...d, progress: Math.min(progress[i], d.total), completed: progress[i] >= d.total }))
}

export function DailyChallenges({ className = '' }: { className?: string }) {
  const streak = useProgressStore(s => s.getStreak())
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const liveTasks = buildTasks(completedLessons, completedLabs, quizScores)

  const completedCount = liveTasks.filter(t => t.completed).length

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
      case 'lesson': return 'bg-[var(--accent-bg)] text-[var(--learning)] border-[var(--accent-border)]'
      case 'lab': return 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]'
      case 'quiz': return 'bg-[var(--owner-bg)] text-[var(--owner)] border-[var(--owner-border)]'
      default: return 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]'
    }
  }

  return (
    <div className={`rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--warning-bg)] to-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-[var(--attention)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)] flex flex-wrap items-center gap-2">
              Daily Challenges
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--attention)] font-mono">{streak} day streak</span>
            </h3>
            <p className="text-sm text-[var(--ink-secondary)] font-mono">Local date • counted from your own completions • {completedCount}/{liveTasks.length} goals met today</p>
          </div>
        </div>
        <span className="text-sm px-2.5 py-1 rounded-full bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--attention)] font-mono flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" />Daily practice</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {liveTasks.map(task => {
          const Icon = getTypeIcon(task.type)
          return (
            <div key={task.id} className={`p-3.5 rounded-xl border flex items-start gap-3 min-w-0 ${task.completed ? 'bg-[var(--success-bg)] border-[var(--success-border)]' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)]'} transition-colors`}>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${task.completed ? 'bg-[var(--success-bg)] border-[var(--success-border)]' : getTypeColor(task.type)}`}>
                {task.completed ? <CheckCircle className="w-4 h-4 text-[var(--success)]" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className={`text-sm font-medium ${task.completed ? 'text-[var(--success)]' : 'text-[var(--ink-primary)]'}`}>{task.title}</span>
                  {task.completed && <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]">RECORDED</span>}
                </div>
                <div className="text-sm text-[var(--ink-secondary)] mt-1">{task.desc}</div>
                {!task.completed && <Link className="ws-text-action inline-flex items-center min-h-11 text-sm" to={task.type === 'lab' ? '/labs' : '/modules'}>{task.type === 'lab' ? 'Choose a lab →' : task.type === 'quiz' ? 'Choose a module quiz →' : 'Choose a lesson →'}</Link>}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--action-fill)] to-[var(--owner)] rounded-full" style={{ width: `${(task.progress/task.total)*100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--ink-secondary)] shrink-0">{task.progress}/{task.total}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-3 rounded-xl bg-gradient-to-r from-[var(--warning-bg)] to-[var(--warning-bg)] border border-[var(--warning-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-[var(--attention)] shrink-0" />
          <span className="text-sm text-[var(--ink-secondary)] font-medium">
            {completedCount === liveTasks.length
              ? 'All of today\u2019s practice goals met — no bonus XP; counts reset at local midnight.'
              : 'Daily goals award no separate XP; the underlying learning activity follows its normal one-time reward rule.'}
          </span>
        </div>
        <span className="text-sm font-mono text-[var(--ink-secondary)] shrink-0">{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  )
}
