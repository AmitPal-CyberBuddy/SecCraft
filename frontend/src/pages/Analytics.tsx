import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Activity, Target, BookOpen, FlaskConical, Swords, Zap, Clock } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations'
import platform from '@/content/platform.json'
import { PLATFORM_STATS } from '@/content/stats'
import { useProgressStore } from '@/store/useProgressStore'

const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })))

export function Analytics() {
  const overall = useProgressStore(s => s.getOverallProgress())
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)

  return (
    <PageTransition>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-[26px] md:text-[30px] text-slate-100 tracking-tight flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                </div>
                Progress Analytics
              </h1>
              <p className="text-[13px] text-slate-400 mt-2">{platform.tagline} • Platform • Path-aware • Local-first</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-[#0f172a] border border-[#1e293b] text-[11px] font-mono text-slate-400">
                {PLATFORM_STATS.modules} modules • {PLATFORM_STATS.labs} labs • {PLATFORM_STATS.challenges} challenges
              </div>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StaggerItem>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><TrendingUp className="w-3 h-3" /> Overall</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">{overall}%</div>
                <div className="text-[11px] text-slate-400">Platform completion</div>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Zap className="w-3 h-3" /> XP</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">{totalXp}</div>
                <div className="text-[11px] text-slate-400">{level.title} Lv.{level.level}</div>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><BookOpen className="w-3 h-3" /> Lessons</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">{completedLessons.length}</div>
                <div className="text-[11px] text-slate-400">{completedLabs.length} labs • {quizScores.length} quizzes</div>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] relative overflow-hidden group hover:border-[#334155] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wide"><Activity className="w-3 h-3" /> Activity</div>
                <div className="text-[22px] font-bold font-mono text-slate-100 mt-1">{completedLessons.length + completedLabs.length + quizScores.length}</div>
                <div className="text-[11px] text-slate-400">Total completions</div>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-cyan-500/[0.02] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                <h3 className="font-heading font-bold text-[15px] text-slate-100">Detailed analytics</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">Platform • Path-aware</span>
              </div>
              <Suspense fallback={<div className="p-8 text-center text-[13px] text-slate-400 font-mono">Loading analytics…</div>}>
                <AnalyticsDashboard />
              </Suspense>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono py-2">
            <Clock className="w-3 h-3" /> Local-first • Offline-capable • No tracking • Your data stays in browser
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  )
}
