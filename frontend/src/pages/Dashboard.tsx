import { LearningPathScope } from '@/components/common/LearningPathScope'
import { moduleLink } from '@/lib/learningNavigation'
import { moduleOrdinal } from '@/content/module-ordinal'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import { AVAILABLE_LABS } from '@/content/labs'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import challenges from '@/content/challenges.json'
import { OwnerNotice } from '@/components/account/AccountBanner'
import { StateChip, UnavailableStatusChip, ProvenanceChip } from '@/components/account/StateChip'
import { StandingChip } from '@/components/account/PracticeStanding'
import { PageHeader, Panel, ActionLink, ProgressBar } from '@/components/common/Workspace'
import { SkeletonRow } from '@/components/common/Skeleton'
import { ResultTransition } from '@/components/common/ResultTransition'
import { accessLabel, allows } from '@/lib/access'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'

type Lesson = { id: string; title?: string }

/**
 * The one question this screen exists to answer: "what should I do next?"
 *
 * The recommendation is derived only from data the product actually holds — the first unfinished
 * lesson in the current module, else the first lab with artifacts, else the next module. It is never
 * invented, never personalized beyond the learner's own record, and never gated on an account.
 */
function useNextAction(currentModuleId: string, currentPathId: string) {
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const completedChallenges = useProgressStore(s => s.completedChallenges)

  return useMemo(() => {
    const isLessonCompleted = (moduleId: string, lessonId: string) => completedLessons.some(record => record.moduleId === moduleId && record.lessonId === lessonId)
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
        to: moduleLink(currentModule.id, 'theory', nextLesson.id, currentPathId),
        cta: 'Continue lesson',
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
        to: moduleLink(currentModule.id, 'lab', nextLab.id, currentPathId),
        cta: 'Open this lab',
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
        to: `/paths/${currentPathId}/challenges/${nextChallenge.id}`,
        cta: 'Open the challenge',
      }
    }

    const path = learningPaths.find(item => item.id === currentPathId)
    const nextModule = modules.find(m => {
      if (!path?.modules.some(moduleId => moduleId === m.id)) return false
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
        to: moduleLink(nextModule.id, 'overview', undefined, currentPathId),
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
  }, [currentModuleId, currentPathId, completedLessons, completedLabs, completedChallenges])
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

export function Dashboard() {
  return <LearningPathScope area="app">{id => <DashboardContent key={id} currentPathId={id} />}</LearningPathScope>
}
function DashboardContent({ currentPathId }: { currentPathId: string }) {
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const storedModuleId = useProgressStore(s => s.currentModule)
  const selectedPath = learningPaths.find(path => path.id === currentPathId) || learningPaths[0]
  const currentModuleId = selectedPath.modules.some(moduleId => moduleId === storedModuleId) ? storedModuleId! : selectedPath.modules[0]
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const completedChallenges = useProgressStore(s => s.completedChallenges)
  const quizScores = useProgressStore(s => s.quizScores)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const { userState, can, account, accountError, hasSession } = useSession()
  const statusUnavailable = hasSession && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const server = useServerProgress()
  const nextAction = useNextAction(currentModuleId, currentPathId)
  const currentModule = modules.find(m => m.id === currentModuleId) || modules[0]
  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const currentProgress = getModuleProgress(currentModule.id)
  const pathProgress = getPathProgress(currentPath.id)
  const recentActivity = useMemo(() => [
    ...completedLessons.map(l => ({ id: `lesson-${l.moduleId}-${l.lessonId}`, type: 'Lesson', title: modules.find(m => m.id === l.moduleId)?.lessons.find(lesson => lesson.id === l.lessonId)?.title || 'Lesson practice', at: l.completedAt || '' })),
    ...completedLabs.map(l => ({ id: `lab-${l.moduleId}-${l.labId}`, type: 'Lab', title: AVAILABLE_LABS.find(lab => lab.id === l.labId)?.title || 'Lab practice', at: l.completedAt || '' })),
    ...completedChallenges.map(c => ({ id: `challenge-${c.challengeId}`, type: 'Challenge', title: challenges.find(challenge => challenge.id === c.challengeId)?.title || 'Challenge practice', at: c.completedAt || '' })),
    ...quizScores.map(q => ({ id: `quiz-${q.moduleId}-${q.quizId}`, type: 'Quiz', title: `${modules.find(m => m.id === q.moduleId)?.title || 'Module'} quiz`, at: q.completedAt || '' })),
  ].filter(item => item.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5), [completedLessons, completedLabs, completedChallenges, quizScores])
  const accountBacked = can('account-progress')
  return <div className="ws-dashboard ws-dashboard-reset">
    <OwnerNotice />
    <PageHeader eyebrow={accessLabel(userState)} title={allows(userState, 'learning-content') ? 'Your learning workspace' : 'Explore the catalogue'} description={statusUnavailable ? 'Account status is unavailable. The catalogue and local practice remain available.' : 'Pick up where you left off. Your practice stays in this browser and is unverified.'} action={statusUnavailable ? <UnavailableStatusChip /> : <StateChip state={userState} />} />

    <section className="ws-focus" aria-labelledby="ws-next-title">
      <ResultTransition identity={nextAction.to} className="ws-focus-main">
        <div className="ws-focus-meta"><span className="ws-kicker">Next step for you</span><span className="ws-focus-step">{nextAction.kind} / {moduleOrdinal(nextAction.moduleId)}</span></div>
        <p className="ws-focus-path">{currentPath.title} <span aria-hidden="true">/</span> {nextAction.moduleTitle}</p>
        <h2 id="ws-next-title">{nextAction.title}</h2>
        <p className="ws-focus-summary">{nextAction.detail}</p>
        <div className="ws-focus-actions"><ActionLink to={nextAction.to}>{nextAction.cta} <span aria-hidden="true">↗</span></ActionLink><Link to={`/paths/${currentPath.id}`} className="ws-text-action">Explore the path <span aria-hidden="true">→</span></Link></div>
      </ResultTransition>
      <aside className="ws-focus-context" aria-label="Current learning position">
        <span className="ws-kicker">Your position</span>
        <Link className="ws-focus-module" to={`/modules/${currentModule.id}`}><span className="ws-focus-index">{moduleOrdinal(currentModule.id)}</span><span>{currentModule.title}</span><span aria-hidden="true">↗</span></Link>
        <p>{currentModule.description}</p>
        <div className="ws-focus-progress-label"><span>{completedLessons.filter(l => l.moduleId === currentModule.id).length} / {currentModule.lessons.length} lessons · {currentModule.estimated_hours}h estimated</span><strong>{currentProgress}%</strong></div>
        <ProgressBar value={currentProgress} label="Current module progress" />
      </aside>
    </section>

    <section className="ws-dashboard-section" aria-labelledby="ws-progress-heading">
      <div className="ws-section-head"><div><span className="ws-kicker">01 / Your position</span><h2 id="ws-progress-heading">Progress at a glance</h2></div><ProvenanceChip provenance="local" /></div>
      <div className="ws-progress-layout">
        <div className="ws-path-meter"><div className="ws-meter-ring" role="progressbar" aria-label="Current path practice progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pathProgress)} style={{ background: `conic-gradient(var(--learning) ${pathProgress}%, var(--panel-inset) 0)` }}><div><strong>{pathProgress}%</strong><span>path</span></div></div><div><span className="ws-kicker">Current learning path</span><h3>{currentPath.title}</h3><p>{accessLabel(userState)} · progress in this browser</p><Link to={`/paths/${currentPath.id}`} className="ws-text-action">Path overview →</Link></div></div>
        <div className="ws-progress-facts">{[
          { label: 'Lessons completed', value: completedLessons.length, to: '/modules' },
          { label: 'Labs reviewed', value: completedLabs.length, to: '/labs' },
          { label: 'Challenges completed', value: completedChallenges.length, to: '/challenges' },
        ].map(item => <Link to={item.to} key={item.label} className="ws-progress-fact"><span>{item.label}</span><strong>{item.value}</strong><span aria-hidden="true">↗</span></Link>)}</div>
      </div>
    </section>

    <div className="ws-dashboard-body">
      <section className="ws-dashboard-section ws-sequence" aria-labelledby="ws-sequence-heading">
        <div className="ws-section-head"><div><span className="ws-kicker">02 / Curriculum</span><h2 id="ws-sequence-heading">Along the path</h2></div><Link to={`/paths/${currentPath.id}/modules`} className="ws-text-action">All modules →</Link></div>
        <ol className="ws-curriculum">{modules.filter(m => (currentPath.modules as string[]).includes(m.id)).slice(0, 8).map(m => {
          const progress = getModuleProgress(m.id)
          return <li key={m.id} className={m.id === currentModule.id ? 'is-current' : progress === 100 ? 'is-complete' : ''}><span className="ws-curriculum-index">{progress === 100 ? '✓' : moduleOrdinal(m.id)}</span><Link to={`/modules/${m.id}`}>{m.title}</Link><span className="ws-muted">{progress === 100 ? 'Complete' : progress > 0 ? `${progress}%` : 'Not started'}</span></li>
        })}</ol>
      </section>
      <div className="ws-support-column">
        <section className="ws-dashboard-section ws-records" aria-labelledby="ws-records-heading"><div className="ws-section-head"><div><span className="ws-kicker">03 / Records</span><h2 id="ws-records-heading">Practice & account</h2></div></div>
          <div className="ws-record-row"><div><h3>Practice XP (this browser)</h3><StandingChip standing="practice" /><p>Saved in this browser · unverified.</p></div><strong>{totalXp} <small>XP</small></strong></div>
          <div className="ws-record-row"><div><h3>Account snapshot</h3><ProvenanceChip provenance="server" /><p>{accountBacked ? server.data ? `${server.data.records.length} records · ${server.data.imported} imported · ${server.data.verified} verified` : server.state === 'loading' ? <SkeletonRow label="Reading account record…" /> : server.message : 'Available for approved accounts. Local practice remains available.'}</p></div><strong>{accountBacked && server.data ? server.data.xp : '—'} <small>XP</small></strong></div>
          <p className="ws-record-note">Imported progress and assessment attempts remain unverified. Independent grading and certificates are not available.</p>
        </section>
        <Panel title="Recent practice" aside={<ProvenanceChip provenance="local" />} className="ws-recent-panel">
          {recentActivity.length ? <ul className="ws-activity">{recentActivity.map(item => <li key={item.id}><span>{item.title}<small>{item.type}</small></span><time dateTime={item.at}>{ago(item.at)} ago</time></li>)}</ul> : <p className="ws-muted">Your practice log starts here. Complete a lesson, lab or challenge to see it in this browser.</p>}
        </Panel>
      </div>
    </div>
    <nav className="ws-quick-links" aria-label="Workspace shortcuts">{[
      ['/paths', 'Learning paths'], ['/modules', 'Modules'], ['/labs', 'Labs'], ['/challenges', 'Challenges'], ['/reference', 'Reference'], ['/progress', 'Analytics'], ['/sync', 'Progress sync'],
    ].map(([to, label]) => <Link key={to} to={to}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>
  </div>
}
