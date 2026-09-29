import { MAX_XP, useProgressStore, LEVELS } from '@/store/useProgressStore'
import { TOTAL_CHALLENGES, TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_LEARNING_PATHS, AVAILABLE_LEARNING_PATHS, PLATFORM_STATS, getStatsForPath } from '@/content/stats'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { ContinueCard } from '@/components/dashboard/ContinueCard'
import { Link } from 'react-router-dom'
import { BookOpen, FlaskConical, Swords, Shield, Zap, Target, Clock, Activity, TrendingUp, ArrowRight, Map, Layers, BarChart3, Award, Flame, ChevronRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { useMemo } from 'react'
import { AnimatedCard, FadeIn, StaggerContainer, StaggerItem, PulseDot, GlowOrb, SpotlightCard, HoverScale } from '@/components/animations'

export function Dashboard() {
  const getOverall = useProgressStore(s => s.getOverallProgress())
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentModuleId = useProgressStore(s => s.currentModule) || '02-wifi-fundamentals'
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.getStreak())

  const xpToNext = useMemo(() => {
    const cur = level
    const next = LEVELS.find(l => l.level === cur.level + 1) || null
    if (!next) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = next.minXp - totalXp
    const range = next.minXp - cur.minXp
    const prog = totalXp - cur.minXp
    return { current: totalXp, needed: Math.max(0, needed), nextLevel: next, percent: Math.min(Math.max((prog / range) * 100, 0), 100) }
  }, [totalXp, level])

  const currentModule = modules.find(m => m.id === currentModuleId) || modules[1]
  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const currentProgress = getModuleProgress(currentModule.id)
  const wirelessStats = getStatsForPath('wireless-pentesting')
  const pathProgress = getPathProgress(currentPathId)

  const recentActivity = useMemo(() => {
    const items = [
      ...completedLessons.map(l => ({ id: `lesson-${l.moduleId}-${l.lessonId}`, type: 'lesson' as const, title: l.lessonId, module: l.moduleId, at: l.completedAt || '', points: l.points })),
      ...completedLabs.map(l => ({ id: `lab-${l.moduleId}-${l.labId}`, type: 'lab' as const, title: l.labId, module: l.moduleId, at: l.completedAt || '', points: l.points })),
      ...quizScores.map(q => ({ id: `quiz-${q.moduleId}-${q.quizId}`, type: 'quiz' as const, title: `${q.quizId} — ${q.score}/${q.total}`, module: q.moduleId, at: q.completedAt || '', points: q.points })),
    ].filter(i => i.at)
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 3)
  }, [completedLessons, completedLabs, quizScores])

  const ago = (at: string) => {
    const diff = Date.now() - new Date(at).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div className="space-y-5 md:space-y-6 max-w-[1400px] mx-auto min-w-0 w-full">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-heading font-bold text-[24px] md:text-[28px] text-slate-100 tracking-tight leading-none">{platform.name}</h1>
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20"><PulseDot color="cyan" /><span className="text-[10px] font-semibold text-cyan-400">v{platform.version}</span></div>
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"><Flame className="w-3 h-3 text-orange-400" /><span className="text-[10px] font-semibold text-amber-400">{streak}d</span></div>
            </div>
            <p className="text-[13px] text-slate-400 mt-2 flex items-center gap-2 flex-wrap"><span className="font-medium text-slate-300">{platform.tagline}</span><span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline" /><span className="text-slate-400 hidden sm:inline text-[12px]">{TOTAL_LEARNING_PATHS} paths • {TOTAL_MODULES} mods • {TOTAL_PCAPS} artifacts</span></p>
          </div>
          <HoverScale><div className="px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 flex items-center gap-2"><PulseDot color="emerald" /><span className="text-[11px] font-medium text-slate-300">Local Lab</span><span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">LOCAL</span></div></HoverScale>
        </div>
      </FadeIn>

      {/* Top bento — dashboard-stats tour target */}
      <div data-tour="dashboard-stats">
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4" stagger={0.06}>
          <StaggerItem className="lg:col-span-5">
            <AnimatedCard glowColor="cyan" className="p-5 md:p-6 h-full" delay={0.05}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-cyan-400" /></div><div><h3 className="font-heading font-bold text-[14px] text-slate-100">Overall Progress</h3><p className="text-[11px] text-slate-400 font-mono">{currentPath.shortTitle} • {pathProgress}% • {wirelessStats.modules} mods</p></div></div>
                <span className="text-[18px] font-bold font-mono text-slate-100">{getOverall}%</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative"><ProgressRing value={getOverall} size={72} strokeWidth={5} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-slate-400 font-mono">{getOverall}%</span></div></div>
                <div className="flex-1 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><div className="text-[14px] font-bold text-slate-100 font-mono">{completedLessons.length}</div><div className="text-[9px] text-slate-400 uppercase">Lessons</div></div>
                    <div className="text-center p-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><div className="text-[14px] font-bold text-slate-100 font-mono">{completedLabs.length}</div><div className="text-[9px] text-slate-400 uppercase">Labs</div></div>
                    <div className="text-center p-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><div className="text-[14px] font-bold text-slate-100 font-mono">{quizScores.length}</div><div className="text-[9px] text-slate-400 uppercase">Quizzes</div></div>
                  </div>
                  <div className="relative h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50"><motion.div initial={{ width: 0 }} animate={{ width: `${getOverall}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" /></div>
                </div>
              </div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem className="lg:col-span-4">
            <div className="space-y-3 h-full flex flex-col">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 relative overflow-hidden group hover:border-[#334155] transition-all"><GlowOrb color="amber" size={120} className="top-0 right-0" /><div className="relative flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-400" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-[11px] text-slate-400 uppercase">{level.icon} {level.title} Lv.{level.level}</span><PulseDot color="amber" /></div><div className="flex items-center gap-2 mt-1"><span className="text-[15px] font-bold font-mono text-slate-100">{totalXp} XP</span><div className="flex-1 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30"><motion.div initial={{ width: 0 }} animate={{ width: `${xpToNext.percent}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" /></div></div></div></div></div>
              <Link to={`/paths/${currentPath.id}`} className="flex-1 rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 relative overflow-hidden group hover:border-cyan-500/30 hover:bg-[#111d33] transition-all block"><div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" /><div className="relative"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase flex items-center gap-1.5"><Layers className="w-3 h-3" /> Current Path</span><span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{currentPath.shortTitle}</span></div><div className="flex items-center gap-2.5"><div className="text-[18px]">{currentPath.icon}</div><div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">{currentPath.title}</div><div className="text-[10px] text-slate-400 font-mono">{currentPath.category} • {currentPath.estimatedHours}h • {pathProgress}%</div></div><ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" /></div></div></Link>
            </div>
          </StaggerItem>
          <StaggerItem className="lg:col-span-3">
            <SpotlightCard className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"><Shield className="w-4 h-4 text-violet-400" /></div><span className="text-[13px] font-bold text-slate-100">VAPT Loop</span><PulseDot color="violet" /></div>
              <div className="text-[11px] font-mono text-slate-400 leading-relaxed bg-[#020617]/40 rounded-lg p-2.5 border border-[#1e293b]/30 flex-1">{platform.philosophy}</div>
              <div className="mt-3 grid grid-cols-3 gap-1.5"><Link to="/progress" data-tour="reports" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1"><BarChart3 className="w-3 h-3" /> Analytics</Link><Link to="/achievements" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1"><Award className="w-3 h-3" /> Badges</Link><Link to="/daily" data-tour="daily" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> Daily</Link></div>
            </SpotlightCard>
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Continue + Recent */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4" stagger={0.06}>
        <StaggerItem className="lg:col-span-8"><ContinueCard moduleId={currentModule.id} title={currentModule.title} description={currentModule.description} progress={currentProgress} lessonsCompleted={completedLessons.filter(l => l.moduleId === currentModule.id).length} totalLessons={4} estimatedTime={`${currentModule.estimated_hours}h`} /></StaggerItem>
        <StaggerItem className="lg:col-span-4">
          <AnimatedCard glowColor="none" className="p-5 h-full">
            <div className="flex items-center justify-between mb-4"><h3 className="font-heading font-bold text-[13px] text-slate-100 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Recent</h3><span className="text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 font-mono">{recentActivity.length ? `${recentActivity.length} recent` : 'no activity'}</span></div>
            <div className="space-y-2.5">
              {recentActivity.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center"><div className="text-[12px] text-slate-300">No activity yet</div><p className="mt-1 text-[11px] text-slate-400">Start <Link to={`/paths/${currentPath.id}/modules/${currentModule.id}`} className="text-cyan-400 hover:text-cyan-300">{currentModule.title}</Link> — 15–20 min/lesson.</p></div>
              ) : recentActivity.map((act, idx) => (
                <motion.div key={act.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.05 }} className="flex gap-2.5 p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:border-[#334155]/40 transition-colors group/item">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${act.type === 'lesson' ? 'bg-cyan-500/10 border-cyan-500/20' : act.type === 'lab' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>{act.type === 'lesson' ? <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> : act.type === 'lab' ? <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-violet-400" />}</div>
                  <div className="flex-1 min-w-0"><div className="text-[12px] font-medium text-slate-200 truncate group-hover/item:text-slate-100">{act.title}</div><div className="text-[10px] text-slate-400 font-mono">{act.module} • +{act.points} XP</div></div>
                  <div className="text-[10px] text-slate-400 font-mono">{ago(act.at)}</div>
                </motion.div>
              ))}
              <Link to="/progress" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1e293b]/50 border border-[#334155]/50 text-[11px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors"><Activity className="w-3 h-3" /> View analytics <ChevronRight className="w-3 h-3" /></Link>
            </div>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>

      {/* Quick Actions — labs + challenges tour targets */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3" stagger={0.05}>
        {[
          { to: '/paths', icon: Map, title: 'Learning Paths', desc: `${AVAILABLE_LEARNING_PATHS} avail • ${TOTAL_LEARNING_PATHS} total`, color: 'cyan' as const, tour: 'learning-paths' },
          { to: `/paths/${currentPathId}/modules`, icon: BookOpen, title: 'Modules', desc: `${wirelessStats.modules} mods • ${wirelessStats.lessons} lessons`, color: 'violet' as const, tour: undefined },
          { to: '/labs', icon: FlaskConical, title: 'Labs', desc: `${TOTAL_PCAPS} verified • offline`, color: 'emerald' as const, tour: 'labs' },
          { to: '/challenges', icon: Swords, title: 'Challenges', desc: 'Guided → Assessment', color: 'amber' as const, tour: 'challenges' },
        ].map((action) => (
          <StaggerItem key={action.to}>
            <Link to={action.to} data-tour={action.tour} className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] p-4 flex items-center gap-3 hover:bg-[#111d33] transition-all duration-300 overflow-hidden block hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5">
              <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${action.color === 'cyan' ? 'from-cyan-500/5' : action.color === 'emerald' ? 'from-emerald-500/5' : action.color === 'violet' ? 'from-violet-500/5' : 'from-amber-500/5'} to-transparent`} />
              <div className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${action.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : action.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : action.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><action.icon className={`w-5 h-5 ${action.color === 'cyan' ? 'text-cyan-400' : action.color === 'emerald' ? 'text-emerald-400' : action.color === 'violet' ? 'text-violet-400' : 'text-amber-400'}`} /></div>
              <div className="relative flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="text-[13px] font-semibold text-slate-100 group-hover:text-white transition-colors">{action.title}</span><Sparkles className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300" /></div><div className="text-[11px] text-slate-400 group-hover:text-slate-400 transition-colors">{action.desc}</div></div>
              <ChevronRight className="relative w-4 h-4 text-slate-400 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Platform Overview — compact */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-12 gap-4" stagger={0.05}>
        <StaggerItem className="md:col-span-7">
          <AnimatedCard glowColor="cyan" className="p-4" delay={0.1}>
            <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center"><Layers className="w-4 h-4 text-cyan-400" /></div><h3 className="font-heading font-bold text-[13px] text-slate-100">Platform</h3><span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400 font-mono">{PLATFORM_STATS.learningPaths} paths • {PLATFORM_STATS.modules} mods • {PLATFORM_STATS.labs} labs</span></div>
            <div className="grid grid-cols-4 gap-2">
              {[{ label: 'Paths', value: TOTAL_LEARNING_PATHS, sub: `${AVAILABLE_LEARNING_PATHS} avail`, icon: Map, color: 'cyan' }, { label: 'Modules', value: TOTAL_MODULES, sub: `${TOTAL_LESSONS} lessons`, icon: BookOpen, color: 'violet' }, { label: 'Labs', value: TOTAL_LABS, sub: `${TOTAL_PCAPS} artifacts`, icon: FlaskConical, color: 'emerald' }, { label: 'Challenges', value: TOTAL_CHALLENGES, sub: 'Guided→Assess', icon: Swords, color: 'amber' }].map((s) => (
                <div key={s.label} className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:border-[#334155]/60 transition-colors group"><div className="flex items-center gap-1.5"><s.icon className={`w-3 h-3 ${s.color === 'cyan' ? 'text-cyan-400' : s.color === 'violet' ? 'text-violet-400' : s.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} /><span className="text-[10px] text-slate-400 uppercase">{s.label}</span></div><div className="text-[16px] font-bold font-mono text-slate-100 mt-1">{s.value}</div><div className="text-[10px] text-slate-400">{s.sub}</div></div>
              ))}
            </div>
          </AnimatedCard>
        </StaggerItem>
        <StaggerItem className="md:col-span-5">
          <div className="grid grid-cols-3 gap-2 h-full">
            {[{ to: '/daily', icon: Flame, title: 'Daily', desc: `${streak}d streak`, color: 'orange', badge: 'ACTIVE' }, { to: '/achievements', icon: Award, title: 'Badges', desc: `${totalXp} XP`, color: 'amber', badge: `${level.title}` }, { to: '/progress', icon: BarChart3, title: 'Analytics', desc: `${getOverall}% done`, color: 'violet', badge: 'TRACK' }].map((c) => (
              <Link key={c.to} to={c.to} className="group rounded-2xl bg-[#0f172a] border border-[#1e293b] p-3 hover:border-[#334155] hover:bg-[#111d33] transition-all flex flex-col items-center text-center gap-1.5 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${c.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : c.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}><c.icon className={`w-4 h-4 ${c.color === 'orange' ? 'text-orange-400' : c.color === 'amber' ? 'text-amber-400' : 'text-violet-400'}`} /></div>
                <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100">{c.title}</div>
                <div className="text-[10px] text-slate-400 font-mono">{c.desc}</div>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400 font-mono mt-auto">{c.badge}</span>
              </Link>
            ))}
          </div>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn delay={0.3}><div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-slate-400 font-mono py-2"><span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-400" />{platform.tagline} • local-first • offline</span><span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700" /><span className="flex items-center gap-1.5"><Target className="w-3 h-3 text-slate-400" />{PLATFORM_STATS.learningPaths} paths • {PLATFORM_STATS.modules} mods • Cmd+K search</span></div></FadeIn>
    </div>
  )
}
