import { LoadingPanel } from '@/components/common/LoadingPanel'
import { motion } from 'framer-motion'
import { Flame, Target, Clock, Zap, Calendar, Trophy } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { PageTransition, FadeIn } from '@/components/animations'
import platform from '@/content/platform.json'
import { PracticeStandingNotice, StandingChip } from '@/components/account/PracticeStanding'
import { useSession } from '@/lib/session'
import { standingFor } from '@/lib/access'
import { useProgressStore } from '@/store/useProgressStore'

const DailyChallenges = lazy(() => import('@/components/gamification/DailyChallenges').then(m => ({ default: m.DailyChallenges })))

export function Daily() {
  const streak = useProgressStore(s => s.getStreak())
  const totalXp = useProgressStore(s => s.getTotalXp())
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
                Daily Challenges
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-slate-400">
                <span>{platform.tagline} • Streak {streak} days • {totalXp} XP • Forge daily habits</span>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Flame className="w-3 h-3 text-orange-400" /> Streak</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">{streak} days</div>
                <div className="text-[11px] text-slate-400">Keep the forge hot</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Zap className="w-3 h-3 text-amber-400" /> XP Today</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">+0</div>
                <div className="text-[11px] text-slate-400">Complete tasks to earn</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Target className="w-3 h-3 text-cyan-400" /> Goals</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">3 active</div>
                <div className="text-[11px] text-slate-400">Daily objectives</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Trophy className="w-3 h-3 text-violet-400" /> Completion</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">0%</div>
                <div className="text-[11px] text-slate-400">Today's progress</div>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-amber-500/[0.02] pointer-events-none" />
            <div className="relative">
              <Suspense fallback={<LoadingPanel label="Loading daily challenges…" />}>
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
