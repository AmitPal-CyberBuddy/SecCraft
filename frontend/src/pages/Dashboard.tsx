import { moduleOrdinal } from '@/content/module-ordinal'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import { AVAILABLE_LABS } from '@/content/labs'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import challenges from '@/content/challenges.json'
import { AccountBanner, OwnerNotice } from '@/components/account/AccountBanner'
import { StateChip, UnavailableStatusChip, ProvenanceChip } from '@/components/account/StateChip'
import { StandingChip } from '@/components/account/PracticeStanding'
import { PageHeader, Panel, ActionLink, ProgressBar } from '@/components/common/Workspace'
import { currentCurriculumLabel, canAccessTier } from '@/lib/contentAccess'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'
import { STATE_META } from '@/lib/access'

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

export function Dashboard() {
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentModuleId = useProgressStore(s => s.currentModule) || '01-intro-wireless'
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const completedChallenges = useProgressStore(s => s.completedChallenges)
  const quizScores = useProgressStore(s => s.quizScores)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const { userState, can, account, accountError, hasSession } = useSession()
  const statusUnavailable = hasSession && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const server = useServerProgress()
  const nextAction = useNextAction(currentModuleId)
  const currentModule = modules.find(m => m.id === currentModuleId) || modules[0]
  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const currentProgress = getModuleProgress(currentModule.id)
  const pathProgress = getPathProgress(currentPath.id)
  const recentActivity = useMemo(() => [
    ...completedLessons.map(l => ({ id: `lesson-${l.moduleId}-${l.lessonId}`, type: 'Lesson', title: l.lessonId, at: l.completedAt || '' })),
    ...completedLabs.map(l => ({ id: `lab-${l.moduleId}-${l.labId}`, type: 'Lab', title: l.labId, at: l.completedAt || '' })),
    ...completedChallenges.map(c => ({ id: `challenge-${c.challengeId}`, type: 'Challenge', title: c.challengeId, at: c.completedAt || '' })),
    ...quizScores.map(q => ({ id: `quiz-${q.moduleId}-${q.quizId}`, type: 'Quiz', title: q.quizId, at: q.completedAt || '' })),
  ].filter(item => item.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5), [completedLessons, completedLabs, completedChallenges, quizScores])
  const accountBacked = can('account-progress')
  return <div className="ws-dashboard ws-dashboard-reset">
    <AccountBanner /><OwnerNotice />
    <div className="sc-workspace-intro"><PageHeader eyebrow={currentCurriculumLabel(userState)} title={canAccessTier(userState, 'full') ? 'Your learning workspace' : 'Explore the preview'} description={statusUnavailable ? 'Signed in, but your account status cannot be confirmed. Preview learning remains available; re-check your status when the service responds.' : STATE_META[userState].nextAction} action={statusUnavailable ? <UnavailableStatusChip /> : <StateChip state={userState} />} /><div className="sc-workspace-intro-foot"><p>{canAccessTier(userState, 'full') ? 'Full Curriculum · your account can hold records. Practice in this browser remains unverified.' : 'Preview Curriculum · real lessons and labs, with practice saved only in this browser.'}</p><Link to={canAccessTier(userState, 'full') ? '/sync' : userState === 'guest' ? '/signup' : '/account'}>{canAccessTier(userState, 'full') ? 'View account records' : userState === 'guest' ? 'Learn about accounts' : 'View account status'} →</Link></div></div>

    <section className="ws-focus" aria-labelledby="ws-next-title">
      <div className="ws-focus-main">
        <div className="ws-focus-meta"><span className="ws-kicker">Next step for you</span><span className="ws-focus-step">{nextAction.kind} / {moduleOrdinal(currentModule.id)}</span></div>
        <p className="ws-focus-path">{currentPath.title} <span aria-hidden="true">/</span> {nextAction.moduleTitle}</p>
        <h2 id="ws-next-title">{nextAction.title}</h2>
        <p className="ws-focus-summary">{nextAction.detail}</p>
        <div className="ws-focus-actions"><ActionLink to={nextAction.to}>{nextAction.cta} <span aria-hidden="true">↗</span></ActionLink><Link to={`/paths/${currentPath.id}`} className="ws-text-action">Explore the path <span aria-hidden="true">→</span></Link></div>
      </div>
      <div className="ws-focus-context">
        <span className="ws-kicker">Current module</span>
        <Link className="ws-focus-module" to={`/modules/${currentModule.id}`}><span className="ws-focus-index">{moduleOrdinal(currentModule.id)}</span><span>{currentModule.title}</span><span aria-hidden="true">↗</span></Link>
        <p>{currentModule.description}</p>
        <div className="ws-focus-progress-label"><span>{completedLessons.filter(l => l.moduleId === currentModule.id).length} / {currentModule.lessons.length} lessons · {currentModule.estimated_hours}h estimated</span><strong>{currentProgress}%</strong></div>
        <ProgressBar value={currentProgress} label="Current module progress" />
      </div>
    </section>

    <section className="ws-dashboard-section" aria-labelledby="ws-progress-heading">
      <div className="ws-section-head"><div><span className="ws-kicker">01 / Your position</span><h2 id="ws-progress-heading">Progress at a glance</h2></div><ProvenanceChip provenance="local" /></div>
      <div className="ws-progress-layout">
        <div className="ws-path-meter"><div className="ws-meter-ring" role="progressbar" aria-label="Current path practice progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pathProgress)} style={{ background: `conic-gradient(var(--learning) ${pathProgress}%, var(--panel-inset) 0)` }}><div><strong>{pathProgress}%</strong><span>path</span></div></div><div><span className="ws-kicker">Current learning path</span><h3>{currentPath.title}</h3><p>{currentCurriculumLabel(userState)} · progress in this browser</p><Link to={`/paths/${currentPath.id}`} className="ws-text-action">Path overview →</Link></div></div>
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
          <div className="ws-record-row"><div><h3>Practice XP (this browser)</h3><StandingChip standing="practice" /><p>Local and unverified · never a server award.</p></div><strong>{totalXp} <small>XP</small></strong></div>
          <div className="ws-record-row"><div><h3>Account snapshot</h3><ProvenanceChip provenance="server" /><p>{accountBacked ? server.data ? `${server.data.records.length} records · ${server.data.imported} imported · ${server.data.verified} verified` : server.state === 'loading' ? 'Reading account record…' : server.message : 'Available for approved accounts. Local practice remains available.'}</p></div><strong>{accountBacked && server.data ? server.data.xp : '—'} <small>XP</small></strong></div>
          <p className="ws-record-note">Imported progress and assessment attempts are unverified; no trusted grader issues XP or certificates yet.</p>
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
