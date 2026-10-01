import { PageHeader, Panel } from '@/components/common/Workspace'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Zap, Crown } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/animations'
import { LevelBadge, CertificationPayoff } from '@/components/gamification/LevelBadge'
import { useProgressStore } from '@/store/useProgressStore'
import { PracticeStandingNotice, StandingChip } from '@/components/account/PracticeStanding'
import { useSession } from '@/lib/session'
import { standingFor } from '@/lib/access'

const BadgesShowcase = lazy(() => import('@/components/gamification/BadgesShowcase').then(m => ({ default: m.BadgesShowcase })))

export function Achievements() {
  const { userState } = useSession()
  const standing = standingFor(userState)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const achievements = useProgressStore(s => s.achievements)

  return (
    <PageTransition>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <PracticeStandingNotice />
        <PageHeader eyebrow="Your practice" title="Achievements" description={`Local practice milestones · ${achievements.length} unlocked · unverified`} action={<StandingChip standing={standing} />} />

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <StaggerItem className="lg:col-span-5">
            <LevelBadge />
          </StaggerItem>
          <StaggerItem className="lg:col-span-4">
            <CertificationPayoff />
          </StaggerItem>
          <StaggerItem className="lg:col-span-3">
            <div className="rounded-2xl bg-gradient-to-br from-[var(--panel-bg)] to-[var(--panel-inset)] border border-[var(--line-normal)] p-5 relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--warning-bg)] rounded-full blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center">
                    <Crown className="w-4 h-4 text-[var(--attention)]" />
                  </div>
                  <span className="text-[13px] font-bold text-[var(--ink-primary)]">Level Progress</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ink-secondary)]">{level.title}</span>
                    <span className="text-sm font-mono text-[var(--attention)]">Lv.{level.level}</span>
                  </div>
                  <div className="text-sm text-[var(--ink-secondary)] leading-relaxed">{level.description || 'Keep forging skills — each lesson, lab, and challenge adds XP.'}</div>
                  <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]">
                    <Zap className="w-3 h-3 text-[var(--attention)]" /> {totalXp} XP earned • {achievements.length} badges
                  </div>
                </div>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <Panel title="Badges & milestones" surface>
          <Suspense fallback={<LoadingPanel label="Loading badges…" />}>
                <BadgesShowcase />
              </Suspense>
        </Panel>
      </div>
    </PageTransition>
  )
}
