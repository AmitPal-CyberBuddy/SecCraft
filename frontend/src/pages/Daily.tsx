import { PageHeader, Panel } from '@/components/common/Workspace'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Clock } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { PageTransition, FadeIn } from '@/components/animations'
import { PracticeStandingNotice, StandingChip } from '@/components/account/PracticeStanding'
import { useSession } from '@/lib/session'
import { standingFor } from '@/lib/access'
import { useProgressStore } from '@/store/useProgressStore'

const DailyChallenges = lazy(() => import('@/components/gamification/DailyChallenges').then(m => ({ default: m.DailyChallenges })))

export function Daily() {
  const streak = useProgressStore(s => s.getStreak())
  const lessons = useProgressStore(s => s.completedLessons)
  const labs = useProgressStore(s => s.completedLabs)
  const quizzes = useProgressStore(s => s.quizScores)
  const [today, setToday] = useState(() => new Date().toDateString())
  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = window.setTimeout(() => setToday(new Date().toDateString()), nextMidnight.getTime() - now.getTime() + 50)
    return () => window.clearTimeout(timer)
  }, [today])
  const recordedToday = (at?: string) => Boolean(at) && new Date(at!).toDateString() === today
  const lessonsToday = lessons.filter(item => recordedToday(item.completedAt)).length
  const labsToday = labs.filter(item => recordedToday(item.completedAt)).length
  const perfectToday = quizzes.filter(item => recordedToday(item.completedAt) && item.total > 0 && item.score === item.total).length
  const { userState } = useSession()
  const standing = standingFor(userState)

  return (
    <PageTransition>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <PracticeStandingNotice />
        <PageHeader eyebrow="Your practice" title="Daily practice" description="Short, optional practice in this browser. Tasks reset daily in local time." action={<StandingChip standing={standing} />} />

        <Panel title="Today’s practice" surface>
          <Suspense fallback={<LoadingPanel label="Loading daily practice…" />}>
                <DailyChallenges />
              </Suspense>
        </Panel>
        <p className="ws-muted">A missed day does not erase your learning. Choose a short exercise whenever you are ready.</p>

        <FadeIn delay={0.1}>
          <dl className="sc-daily-summary">
            {[
              ['Current streak', `${streak} days`, 'Local practice days'],
              ['Lessons today', lessonsToday, 'Recorded in this browser'],
              ['Lab reviews today', labsToday, 'Self-review or answer-checked'],
              ['Perfect quizzes today', perfectToday, 'Local quiz results'],
            ].map(([label, value, detail]) => <div key={label}><dt>{label}</dt><dd>{value}<small>{detail}</small></dd></div>)}
          </dl>
        </FadeIn>



        <FadeIn delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--ink-secondary)] font-mono py-2">
            <Clock className="w-3 h-3" /> Resets daily • Streak tracked locally • No account needed
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}
