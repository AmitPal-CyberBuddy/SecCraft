import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Flame, Clock, Calendar } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { PageTransition, FadeIn } from '@/components/animations'
import platform from '@/content/platform.json'
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
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-[26px] md:text-[30px] text-slate-100 tracking-tight flex items-center gap-3 sc-page-title">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                Daily Practice
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-slate-400">
                <span>{platform.tagline} • Short, optional practice in this browser</span>
                <StandingChip standing={standing} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-[#0f172a] border border-[#1e293b] flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <Calendar className="w-3 h-3" /> Daily reset • Local time
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <dl className="sc-daily-summary">
            {[
              ['Current streak', `${streak} days`, 'Local practice days'],
              ['Lessons today', lessonsToday, 'Recorded in this browser'],
              ['Lab reviews today', labsToday, 'Self-review or answer-checked'],
              ['Perfect quizzes today', perfectToday, 'Local quiz results'],
            ].map(([label, value, detail]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><small>{detail}</small></div>)}
          </dl>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-amber-500/[0.02] pointer-events-none" />
            <div className="relative">
              <Suspense fallback={<LoadingPanel label="Loading daily practice…" />}>
                <DailyChallenges />
              </Suspense>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono py-2">
            <Clock className="w-3 h-3" /> Resets daily • Streak tracked locally • No account needed
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}
