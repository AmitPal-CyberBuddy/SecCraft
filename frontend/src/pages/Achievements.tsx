import { motion } from 'framer-motion'
import { Award, Trophy, Zap, Target, Crown, Star, Flame } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations'
import { LevelBadge, CertificationPayoff } from '@/components/gamification/LevelBadge'
import { useProgressStore } from '@/store/useProgressStore'
import platform from '@/content/platform.json'

const BadgesShowcase = lazy(() => import('@/components/gamification/BadgesShowcase').then(m => ({ default: m.BadgesShowcase })))

export function Achievements() {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const achievements = useProgressStore(s => s.achievements)

  return (
    <PageTransition>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-[26px] md:text-[30px] text-slate-100 tracking-tight flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                Achievements
              </h1>
              <p className="text-[13px] text-slate-400 mt-2">{platform.tagline} • {achievements.length} unlocked • {totalXp} XP • {level.title} Lv.{level.level}</p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <StaggerItem className="lg:col-span-5">
            <LevelBadge />
          </StaggerItem>
          <StaggerItem className="lg:col-span-4">
            <CertificationPayoff />
          </StaggerItem>
          <StaggerItem className="lg:col-span-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0a1020] border border-[#1e293b] p-5 relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-100">Level Progress</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">{level.title}</span>
                    <span className="text-[11px] font-mono text-amber-400">Lv.{level.level}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{level.description || 'Keep forging skills — each lesson, lab, and challenge adds XP.'}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Zap className="w-3 h-3 text-amber-400" /> {totalXp} XP earned • {achievements.length} badges
                  </div>
                </div>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-violet-500/[0.02] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading font-bold text-[15px] text-slate-100">Badges & milestones</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">{achievements.length} unlocked</span>
              </div>
              <Suspense fallback={<div className="p-8 text-center text-[13px] text-slate-500 font-mono">Loading badges…</div>}>
                <BadgesShowcase />
              </Suspense>
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}
