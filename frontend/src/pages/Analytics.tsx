import { PageHeader, Panel } from '@/components/common/Workspace'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Clock } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { PageTransition, FadeIn } from '@/components/animations'
import { PracticeStandingNotice } from '@/components/account/PracticeStanding'

const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })))

export function Analytics() {
  return (
    <PageTransition>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <PracticeStandingNotice />
        <PageHeader eyebrow="Your practice" title="Learning progress" description="Practice coverage and activity saved in this browser. Account records remain separate." />



        <Panel title="Path progress and activity" surface>
          <Suspense fallback={<LoadingPanel label="Loading analytics…" />}>
                <AnalyticsDashboard />
              </Suspense>
        </Panel>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--ink-secondary)] font-mono py-2">
            <Clock className="w-3 h-3" /> Local analytics • Offline-capable • No tracking • Account sync is separate
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}
