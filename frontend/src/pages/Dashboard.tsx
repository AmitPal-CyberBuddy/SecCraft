import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { AVAILABLE_LABS } from '@/content/labs'
import { AVAILABLE_LEARNING_PATHS, PLATFORM_STATS, TOTAL_CHALLENGES, TOTAL_LABS, TOTAL_LEARNING_PATHS, TOTAL_MODULES, TOTAL_PCAPS, getStatsForPath } from '@/content/stats'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { ContinueCard } from '@/components/dashboard/ContinueCard'
import { BookOpen, FlaskConical, Swords, Shield, Zap, Target, Clock, Activity, ArrowRight, Map, Layers, BarChart3, Award, Flame, ChevronRight, Sparkles, Database, CheckCircle2, PlayCircle, CloudUpload } from 'lucide-react'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import challenges from '@/content/challenges.json'
import platform from '@/content/platform.json'
import { AnimatedCard, FadeIn, StaggerContainer, StaggerItem, PulseDot, GlowOrb, SpotlightCard, HoverScale } from '@/components/animations'
import { AccountBanner, OwnerNotice } from '@/components/account/AccountBanner'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'
import { StandingChip } from '@/components/account/PracticeStanding'
import { canAccessTier, currentCurriculumLabel } from '@/lib/contentAccess'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'
import { ACCOUNT_SYNC_NOTE, ACCOUNT_ADDS_NOTE, isSignedIn, STATE_META } from '@/lib/access'

type Lesson = { id: string; title?: string }

/**
 * The one question this screen exists to answer: "what should I do next?"
 *
 * The recommendation is derived only from data the product actually holds — the first unfinished
 * lesson in the current module, else the first lab with artifacts, else the next module. It is never
 * invented, never personalized beyond the learner's own record, and never gated on an account.
 */
function useNextAction(currentModuleId: string) {
  const isLessonCompleted = useProgressStore(s => s.isLessonCompleted)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const completedChallenges = useProgressStore(s => s.completedChallenges)

  return useMemo(() => {
    const currentModule = modules.find(m => m.id === currentModuleId) || modules[0]
    const lessons = (currentModule.lessons ?? []) as Lesson[]
    const nextLesson = lessons.find(lesson => !isLessonCompleted(currentModule.id, lesson.id))
    if (nextLesson) {
      return {
        kind: 'lesson' as const,
        moduleId: currentModule.id,
        moduleTitle: currentModule.title as string,
        title: nextLesson.title ?? nextLesson.id,
        detail: `${lessons.length - lessons.filter(l => isLessonCompleted(currentModule.id, l.id)).length} lesson(s) left in this module`,
        to: `/modules/${currentModule.id}`,
        cta: nextLesson.title ? `Open “${nextLesson.title}”` : 'Continue this module',
      }
    }

    const nextLab = AVAILABLE_LABS.find(lab => lab.module === currentModule.id && !completedLabs.some(record => record.labId === lab.id && record.moduleId === lab.module))
    if (nextLab) {
      return {
        kind: 'lab' as const,
        moduleId: currentModule.id,
        moduleTitle: currentModule.title as string,
        title: nextLab.title,
        detail: 'The module lessons are done — practise against the supplied artifacts next.',
        to: '/labs',
        cta: 'Open the labs',
      }
    }

    const nextChallenge = (challenges as Array<{ id: string; title: string; module: string; points: number }>).find(
      challenge => challenge.module === currentModule.id && !completedChallenges.some(record => record.challengeId === challenge.id),
    )
    if (nextChallenge) {
      return {
        kind: 'challenge' as const,
        moduleId: currentModule.id,
        moduleTitle: currentModule.title as string,
        title: nextChallenge.title,
        detail: 'Lessons and labs are complete — close the module out with its challenge.',
        to: '/challenges',
        cta: 'Open the challenge',
      }
    }

    const nextModule = modules.find(m => {
      const moduleLessons = (m.lessons ?? []) as Lesson[]
      return moduleLessons.length > 0 && moduleLessons.some(lesson => !isLessonCompleted(m.id, lesson.id))
    })
    if (nextModule) {
      return {
        kind: 'module' as const,
        moduleId: nextModule.id,
        moduleTitle: nextModule.title as string,
        title: nextModule.title as string,
        detail: 'This module is complete. The next one with unfinished lessons is waiting.',
        to: `/modules/${nextModule.id}`,
        cta: 'Start the next module',
      }
    }

    return {
      kind: 'done' as const,
      moduleId: currentModule.id,
      moduleTitle: currentModule.title as string,
      title: 'Every authored lesson in this path is complete',
      detail: 'Review, revisit, or practise again — there is nothing left to unlock.',
      to: '/achievements',
      cta: 'Review achievements',
    }
  }, [currentModuleId, isLessonCompleted, completedLabs, completedChallenges])
}

function ago(at: string) {
  const diff = Date.now() - new Date(at).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const NEXT_ICON = { lesson: PlayCircle, lab: FlaskConical, challenge: Swords, module: BookOpen, done: CheckCircle2 } as const

export function Dashboard() {
  const getOverall = useProgressStore(s => s.getOverallProgress())
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentModuleId = useProgressStore(s => s.currentModule) || '01-intro-wireless'
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const completedChallenges = useProgressStore(s => s.completedChallenges)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.getStreak())

  const { userState, can } = useSession()
  const hasFullCurriculum = canAccessTier(userState, 'full')
  const server = useServerProgress()
  const nextAction = useNextAction(currentModuleId)

  const xpToNext = useMemo(() => {
    const cur = level
    const next = LEVELS.find(l => l.level === cur.level + 1) || null
    if (!next) return { needed: 0, nextLevel: null, percent: 100 }
    const range = next.minXp - cur.minXp
    const prog = totalXp - cur.minXp
    return { needed: Math.max(0, next.minXp - totalXp), nextLevel: next, percent: Math.min(Math.max((prog / range) * 100, 0), 100) }
  }, [totalXp, level])

  const currentModule = modules.find(m => m.id === currentModuleId) || modules[0]
  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const currentProgress = getModuleProgress(currentModule.id)
  const pathStats = getStatsForPath(currentPath.id)
  const pathProgress = getPathProgress(currentPathId)
  const overall = getOverall

  const recentActivity = useMemo(() => {
    const items = [
      ...completedLessons.map(l => ({ id: `lesson-${l.moduleId}-${l.lessonId}`, type: 'lesson' as const, title: l.lessonId, module: l.moduleId, at: l.completedAt || '', points: l.points })),
      ...completedLabs.map(l => ({ id: `lab-${l.moduleId}-${l.labId}`, type: 'lab' as const, title: l.labId, module: l.moduleId, at: l.completedAt || '', points: l.points })),
      ...completedChallenges.map(c => ({ id: `challenge-${c.challengeId}`, type: 'challenge' as const, title: c.challengeId, module: c.moduleId, at: c.completedAt || '', points: c.points })),
      ...quizScores.map(q => ({ id: `quiz-${q.moduleId}-${q.quizId}`, type: 'quiz' as const, title: `${q.quizId} — ${q.score}/${q.total}`, module: q.moduleId, at: q.completedAt || '', points: q.points })),
    ].filter(i => i.at)
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4)
  }, [completedLessons, completedLabs, quizScores, completedChallenges])

  const signedIn = isSignedIn(userState)
  const accountBacked = can('account-progress')
  const NextIcon = NEXT_ICON[nextAction.kind]

  return (
    <div className="space-y-4 md:space-y-5 max-w-[1400px] mx-auto min-w-0 w-full">
      <AccountBanner />
      <OwnerNotice />

      {/* Header */}
      <FadeIn>
        <div className="dashboard-intro flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="dashboard-eyebrow">
              <span className="dashboard-eyebrow-mark" />
              <span>{signedIn ? 'YOUR LEARNING WORKSPACE' : 'LEARNING WORKSPACE'}</span>
              <span className="dashboard-eyebrow-rule" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading font-bold text-[24px] md:text-[30px] text-slate-100 tracking-tight leading-none sc-page-title">
                {signedIn ? 'Welcome back' : 'Start here'}
              </h1>
              <StateChip state={userState} />
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${
                  hasFullCurriculum
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
                }`}
                title={
                  hasFullCurriculum
                    ? 'You have the Full Curriculum and account-backed records'
                    : 'You have the Preview Curriculum'
                }
              >
                {currentCurriculumLabel(userState)}
              </span>
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20" title="Practice day streak, kept in this browser — not a record">
                <Flame className="w-3 h-3 text-orange-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-amber-400">{streak}d</span>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-400 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-300">{STATE_META[userState].nextAction}</span>
            </p>
          </div>
          <HoverScale>
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 flex items-center gap-2">
                <PulseDot color="emerald" />
                <span className="text-[11px] font-medium text-slate-300">Local Lab</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">LOCAL</span>
              </div>
            </div>
          </HoverScale>
        </div>
      </FadeIn>

      {/* ── What should I do next? ─────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <section aria-labelledby="next-action-heading" className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0f172a]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(34,211,238,.10),transparent_58%)]" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 p-4 xs:p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/20 to-violet-500/10">
                <NextIcon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="next-action-heading" className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">
                  Next step for you
                </h2>
                <p className="mt-1.5 text-[17px] font-bold leading-tight tracking-tight text-slate-100 sm:text-[19px]">{nextAction.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{nextAction.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[#334155] bg-[#020617]/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{nextAction.moduleTitle}</span>
                  <ProvenanceChip provenance="derived" />
                </div>
              </div>
            </div>
            <Link
              to={nextAction.to}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 text-[13.5px] font-bold text-slate-950 shadow-[0_10px_32px_rgba(34,211,238,.15)] transition hover:from-cyan-400 hover:to-cyan-300"
            >
              {nextAction.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </FadeIn>

      {/* ── Continue + recent activity ─────────────────────────────────── */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4" stagger={0.06}>
        <StaggerItem className="lg:col-span-8">
          <ContinueCard
            moduleId={currentModule.id}
            pathTitle={currentPath.title}
            title={currentModule.title as string}
            description={(currentModule.description as string) ?? ''}
            progress={currentProgress}
            lessonsCompleted={completedLessons.filter(l => l.moduleId === currentModule.id).length}
            totalLessons={(currentModule.lessons as Lesson[]).length}
            estimatedTime={`${currentModule.estimated_hours}h`}
          />
        </StaggerItem>
        <StaggerItem className="lg:col-span-4">
          <AnimatedCard glowColor="none" className="p-5 h-full" hoverLift={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-[13px] text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" /> Recent activity
              </h3>
              <ProvenanceChip provenance="local" />
            </div>
            <div className={`space-y-2.5 ${recentActivity.length ? 'activity-timeline' : ''}`}>
              {recentActivity.length === 0 ? (
                <div className="empty-activity relative p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 text-center overflow-hidden">
                  <div className="activity-orbit mx-auto mb-2" aria-hidden="true">
                    <Activity className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div className="text-[12px] font-semibold text-slate-200">Your practice log starts here</div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    Finish the recommended step above and your completed work appears here, with the time it happened.
                  </p>
                </div>
              ) : (
                recentActivity.map((act, idx) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="activity-row flex gap-2.5 p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:border-[#334155]/60 transition-colors group/item"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        act.type === 'lesson'
                          ? 'bg-cyan-500/10 border-cyan-500/20'
                          : act.type === 'lab'
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : act.type === 'challenge'
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-violet-500/10 border-violet-500/20'
                      }`}
                    >
                      {act.type === 'lesson' ? (
                        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      ) : act.type === 'lab' ? (
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                      ) : act.type === 'challenge' ? (
                        <Swords className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Target className="w-3.5 h-3.5 text-violet-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-200 truncate">{act.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {act.module} • +{act.points} XP
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{ago(act.at)}</div>
                  </motion.div>
                ))
              )}
              <Link
                to="/progress"
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1e293b]/50 border border-[#334155]/50 text-[11px] text-slate-400 hover:text-slate-100 hover:border-cyan-500/30 transition-colors"
              >
                <Activity className="w-3 h-3" aria-hidden="true" /> View learning analytics <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </AnimatedCard>
        </StaggerItem>
      </StaggerContainer>

      {/* ── Progress cockpit ───────────────────────────────────────────── */}
      <div data-tour="dashboard-stats">
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-12 gap-4" stagger={0.06}>
          <StaggerItem className="lg:col-span-5">
            <AnimatedCard glowColor="cyan" className="p-5 md:p-6 h-full" delay={0.05}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[14px] text-slate-100">Progress</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {currentPath.shortTitle} • {pathProgress}% of path
                    </p>
                  </div>
                </div>
                <ProvenanceChip provenance="derived" />
              </div>
              <div className="flex items-center gap-5">
                <ProgressRing value={overall} size={72} strokeWidth={5} />
                <div className="flex-1 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: completedLessons.length, label: 'Lessons' },
                      { value: completedLabs.length, label: 'Labs' },
                      { value: completedChallenges.length, label: 'Challenges' },
                    ].map(stat => (
                      <div key={stat.label} className="text-center p-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
                        <div className="text-[14px] font-bold text-slate-100 font-mono">{stat.value}</div>
                        <div className="text-[9px] text-slate-400 uppercase">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${overall}%` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
                    />
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    Calculated in this browser from your own records and the shipped content.
                  </p>
                </div>
              </div>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem className="lg:col-span-4">
            <div className="space-y-3 h-full flex flex-col">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 relative overflow-hidden group hover:border-[#334155] transition-all">
                <GlowOrb color="amber" size={120} className="top-0 right-0" />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 uppercase">
                        {level.icon} {level.title} Lv.{level.level}
                      </span>
                      <StandingChip standing="practice" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[15px] font-bold font-mono text-slate-100">{totalXp} XP</span>
                      <div className="flex-1 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${xpToNext.percent}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Practice XP from this browser — not a verified score, and counted separately from the server
                      ledger below.
                    </p>
                  </div>
                </div>
              </div>
              <Link to={`/paths/${currentPath.id}`} className="flex-1 rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 relative overflow-hidden group hover:border-cyan-500/30 hover:bg-[#111d33] transition-all block">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                      <Layers className="w-3 h-3" aria-hidden="true" /> Current Path
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{currentPath.shortTitle}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="text-[18px]" aria-hidden="true">{currentPath.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">{currentPath.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {currentPath.category} • {currentPath.estimatedHours}h • {pathProgress}%
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            </div>
          </StaggerItem>

          <StaggerItem className="lg:col-span-3">
            <SpotlightCard className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-violet-400" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-bold text-slate-100">Method</span>
                <PulseDot color="violet" />
              </div>
              <div className="text-[11px] font-mono text-slate-400 leading-relaxed bg-[#020617]/40 rounded-lg p-2.5 border border-[#1e293b]/30 flex-1">{platform.philosophy}</div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Link to="/progress" data-tour="reports" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1">
                  <BarChart3 className="w-3 h-3" aria-hidden="true" /> Analytics
                </Link>
                <Link to="/achievements" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1">
                  <Award className="w-3 h-3" aria-hidden="true" /> Badges
                </Link>
                <Link to="/daily" data-tour="daily" className="px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[10px] text-slate-400 hover:text-slate-200 hover:border-[#475569] transition-colors text-center flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" aria-hidden="true" /> Daily
                </Link>
              </div>
            </SpotlightCard>
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* ── Account snapshot (approved / owner only) ──────────────────── */}
      {accountBacked && (
        <FadeIn delay={0.1}>
          <AnimatedCard glowColor="emerald" className="p-4 xs:p-5" hoverLift={false}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-heading text-[13px] font-bold text-slate-100">
                <Database className="h-4 w-4 text-emerald-400" aria-hidden="true" /> Account snapshot
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <ProvenanceChip provenance="server" />
                {server.data && <span className="text-[10px] font-mono text-slate-500">read at {server.data.checkedAt}</span>}
              </div>
            </div>

            {server.state === 'loading' ? (
              <p className="mt-4 flex items-center gap-2 text-[12px] text-slate-400" role="status" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" /> Reading the account record…
              </p>
            ) : server.data ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'On the platform', value: server.data.records.length, chip: 'server' as const },
                    { label: 'Verified', value: server.data.verified, chip: 'server' as const },
                    { label: 'Imported', value: server.data.imported, chip: 'imported' as const },
                    { label: 'Server XP', value: server.data.xp, chip: 'server' as const },
                    { label: 'Practice XP (this browser)', value: totalXp, chip: 'local' as const },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-[#1e293b] bg-[#020617]/50 p-3">
                      <div className="font-mono text-[18px] font-bold leading-none text-slate-100">{stat.value}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">{stat.label}</span>
                        <ProvenanceChip provenance={stat.chip} />
                      </div>
                    </div>
                  ))}
                </div>
                {server.data.xp === 0 && (
                  <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-amber-200/90">
                    The server ledger is live and is what an award of record would come from, but
                    nothing has been awarded into it yet. Until a trusted grader issues XP, your{' '}
                    <span className="font-semibold">{totalXp} practice XP</span> above is the only XP
                    you have — and it stays in this browser.
                  </p>
                )}
                <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">{ACCOUNT_SYNC_NOTE}</p>
                <Link to="/sync" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" /> Open progress sync
                </Link>
              </>
            ) : (
              <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[12px] leading-relaxed text-amber-100/90">
                {server.message} Everything on this page keeps working from your local record.
              </p>
            )}
          </AnimatedCard>
        </FadeIn>
      )}

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3" stagger={0.05}>
        {[
          { to: '/paths', icon: Map, title: 'Learning Paths', desc: `${AVAILABLE_LEARNING_PATHS} available • ${TOTAL_LEARNING_PATHS} total`, color: 'cyan' as const, tour: 'learning-paths' },
          { to: `/paths/${currentPathId}/modules`, icon: BookOpen, title: 'Modules', desc: `${pathStats.modules} mods • ${pathStats.lessons} lessons`, color: 'violet' as const },
          { to: '/labs', icon: FlaskConical, title: 'Labs', desc: `${TOTAL_PCAPS} artifacts • offline`, color: 'emerald' as const, tour: 'labs' },
          { to: '/challenges', icon: Swords, title: 'Challenges', desc: `${TOTAL_CHALLENGES} guided → assessment`, color: 'amber' as const, tour: 'challenges' },
        ].map(action => (
          <StaggerItem key={action.to}>
            <Link
              to={action.to}
              data-tour={action.tour}
              className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] p-4 flex items-center gap-3 hover:bg-[#111d33] transition-all duration-300 overflow-hidden block hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  action.color === 'cyan' ? 'from-cyan-500/5' : action.color === 'emerald' ? 'from-emerald-500/5' : action.color === 'violet' ? 'from-violet-500/5' : 'from-amber-500/5'
                } to-transparent`}
                aria-hidden="true"
              />
              <div
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                  action.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : action.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : action.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-amber-500/10 border-amber-500/20'
                }`}
              >
                <action.icon
                  className={`w-5 h-5 ${action.color === 'cyan' ? 'text-cyan-400' : action.color === 'emerald' ? 'text-emerald-400' : action.color === 'violet' ? 'text-violet-400' : 'text-amber-400'}`}
                  aria-hidden="true"
                />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-slate-100 group-hover:text-white transition-colors">{action.title}</span>
                  <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300" aria-hidden="true" />
                </div>
                <div className="text-[11px] text-slate-400">{action.desc}</div>
              </div>
              <ChevronRight className="relative w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true" />
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ── Account value, once, and quiet ─────────────────────────────── */}
      {!accountBacked && (
        <FadeIn delay={0.12}>
          <div className="flex flex-col gap-3 rounded-2xl border border-[#1e293b] bg-[#020617]/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-slate-200">{ACCOUNT_ADDS_NOTE}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                  {signedIn
                    ? STATE_META[userState].summary
                    : 'The Preview Curriculum stays open either way. What an account adds is where your progress is kept and who can rely on it.'}
                </p>
              </div>
            </div>
            {can('request-account') && (
              <Link
                to="/signup"
                className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-[12px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/15"
              >
                {signedIn ? 'View account status' : 'Request an account'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </FadeIn>
      )}

      {/* ── Platform overview ──────────────────────────────────────────── */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-12 gap-4" stagger={0.05}>
        <StaggerItem className="md:col-span-7">
          <AnimatedCard glowColor="cyan" className="p-4" delay={0.1} hoverLift={false}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              </div>
              <h3 className="font-heading font-bold text-[13px] text-slate-100">Platform</h3>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400 font-mono">
                {PLATFORM_STATS.learningPaths} paths • {PLATFORM_STATS.modules} mods • {PLATFORM_STATS.labs} labs
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Paths', value: TOTAL_LEARNING_PATHS, sub: `${AVAILABLE_LEARNING_PATHS} available`, icon: Map, color: 'cyan' },
                { label: 'Modules', value: TOTAL_MODULES, sub: `${PLATFORM_STATS.lessons} lessons`, icon: BookOpen, color: 'violet' },
                { label: 'Labs', value: TOTAL_LABS, sub: `${TOTAL_PCAPS} artifacts`, icon: FlaskConical, color: 'emerald' },
                { label: 'Challenges', value: TOTAL_CHALLENGES, sub: 'Guided→Assess', icon: Swords, color: 'amber' },
              ].map(stat => (
                <div key={stat.label} className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:border-[#334155]/60 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <stat.icon
                      className={`w-3 h-3 ${stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'violet' ? 'text-violet-400' : stat.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] text-slate-400 uppercase">{stat.label}</span>
                  </div>
                  <div className="text-[16px] font-bold font-mono text-slate-100 mt-1">{stat.value}</div>
                  <div className="text-[10px] text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </StaggerItem>
        <StaggerItem className="md:col-span-5">
          <div className="grid grid-cols-3 gap-2 h-full">
            {[
              { to: '/daily', icon: Flame, title: 'Daily', desc: `${streak}d streak`, color: 'orange' },
              { to: '/achievements', icon: Award, title: 'Badges', desc: `${totalXp} XP`, color: 'amber' },
              { to: '/reports', icon: Target, title: 'Reports', desc: 'Findings', color: 'violet' },
            ].map(card => (
              <Link
                key={card.to}
                to={card.to}
                className="group rounded-2xl bg-[#0f172a] border border-[#1e293b] p-3 hover:border-[#334155] hover:bg-[#111d33] transition-all flex flex-col items-center text-center gap-1.5 hover:-translate-y-0.5"
              >
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
                    card.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : card.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-violet-500/10 border-violet-500/20'
                  }`}
                >
                  <card.icon
                    className={`w-4 h-4 ${card.color === 'orange' ? 'text-orange-400' : card.color === 'amber' ? 'text-amber-400' : 'text-violet-400'}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100">{card.title}</div>
                <div className="text-[10px] text-slate-400 font-mono">{card.desc}</div>
              </Link>
            ))}
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  )
}
