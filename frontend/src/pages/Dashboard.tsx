import { LearningPathScope } from '@/components/common/LearningPathScope'
import { moduleLink } from '@/lib/learningNavigation'
import { moduleOrdinal } from '@/content/module-ordinal'
import { Link } from 'react-router-dom'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import { OwnerNotice } from '@/components/account/AccountBanner'
import { StateChip, UnavailableStatusChip } from '@/components/account/StateChip'
import { PageHeader, ActionLink, SectionHeader } from '@/components/common/Workspace'
import { accessLabel, allows } from '@/lib/access'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'

/**
 * Dashboard — simple catalogue hub.
 *
 * The catalogue, module details, lesson outlines and selected public samples are public.
 * Signing in is for protected lesson text, knowledge checks, lab details and account records.
 * There is no browser-progress tracking here: no percentages, no XP, no recent-practice log.
 */
export function Dashboard() {
  return <LearningPathScope area="app">{id => <DashboardContent key={id} currentPathId={id} />}</LearningPathScope>
}

function DashboardContent({ currentPathId }: { currentPathId: string }) {
  const { userState, can, account, accountError, hasSession } = useSession()
  const statusUnavailable = hasSession && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const server = useServerProgress()
  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const pathModules = modules.filter(m => (currentPath.modules as string[]).includes(m.id))
  const firstModule = pathModules[0] || modules[0]
  const approved = allows(userState, 'learning-content')
  const accountBacked = can('account-progress')

  return <div className="ws-dashboard ws-dashboard-reset">
    <OwnerNotice />
    <PageHeader
      eyebrow={accessLabel(userState)}
      title={approved ? 'Your learning workspace' : 'Explore the catalogue'}
      description={statusUnavailable
        ? 'Account status is unavailable. The catalogue and content details remain public.'
        : 'Browse the catalogue and content details without signing in. Sign in for full learning materials and account records.'}
      action={statusUnavailable ? <UnavailableStatusChip /> : <StateChip state={userState} />}
    />

    <section className="ws-focus" aria-labelledby="ws-next-title">
      <div className="ws-focus-main">
        <div className="ws-focus-meta"><span className="ws-kicker">Start here</span><span className="ws-focus-step">{moduleOrdinal(firstModule.id)}</span></div>
        <p className="ws-focus-path">{currentPath.title} <span aria-hidden="true">/</span> {firstModule.title}</p>
        <h2 id="ws-next-title">{firstModule.title}</h2>
        <p className="ws-focus-summary">{firstModule.description}</p>
        <div className="ws-focus-actions">
          <ActionLink to={moduleLink(firstModule.id, 'overview', undefined, currentPath.id)}>Open this module <span aria-hidden="true">↗</span></ActionLink>
          <Link to={`/paths/${currentPath.id}`} className="ws-text-action">Explore the path <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="ws-focus-context">
        <span className="ws-kicker">Current path</span>
        <Link className="ws-focus-module" to={`/paths/${currentPath.id}`}><span className="ws-focus-index">{currentPath.shortTitle}</span><span>{currentPath.title}</span><span aria-hidden="true">↗</span></Link>
        <p>{currentPath.description}</p>
        <p className="ws-muted">{pathModules.length} modules · {currentPath.estimatedHours}h estimated</p>
      </div>
    </section>

    <section className="ws-dashboard-section" aria-labelledby="ws-paths-heading">
      <SectionHeader kicker="01 / Catalogue" title="Learning paths" id="ws-paths-heading" action={<Link to="/paths" className="ws-text-action">All paths →</Link>} />
      <ol className="ws-curriculum">{learningPaths.filter(path => path.status === 'available').map(path => (
        <li key={path.id} className={path.id === currentPath.id ? 'is-current' : ''}>
          <span className="ws-curriculum-index">{path.shortTitle}</span>
          <Link to={`/paths/${path.id}`}>{path.title}</Link>
          <span className="ws-muted">{path.modules.length} modules</span>
        </li>
      ))}</ol>
    </section>

    <div className="ws-dashboard-body">
      <section className="ws-dashboard-section ws-sequence" aria-labelledby="ws-sequence-heading">
        <SectionHeader kicker="02 / Curriculum" title="Modules in this path" id="ws-sequence-heading" action={<Link to={`/paths/${currentPath.id}/modules`} className="ws-text-action">All modules →</Link>} />
        <ol className="ws-curriculum">{pathModules.slice(0, 8).map(m => (
          <li key={m.id} className={m.id === firstModule.id ? 'is-current' : ''}>
            <span className="ws-curriculum-index">{moduleOrdinal(m.id)}</span>
            <Link to={`/modules/${m.id}`}>{m.title}</Link>
            <span className="ws-muted">{m.lessons.length} lessons</span>
          </li>
        ))}</ol>
      </section>
      <div className="ws-support-column">
        <section className="ws-dashboard-section ws-records" aria-labelledby="ws-records-heading">
          <SectionHeader kicker="03 / Account" title={accountBacked ? 'Account records' : 'Sign in for full learning'} id="ws-records-heading" />
          {accountBacked ? (
            <div className="ws-record-row">
              <div>
                <h3>Account snapshot</h3>
                <p>{server.data ? `${server.data.records.length} records · ${server.data.imported} imported · ${server.data.verified} verified` : server.state === 'loading' ? 'Reading account record…' : server.message}</p>
              </div>
              <strong>{server.data ? server.data.xp : '—'} <small>XP</small></strong>
            </div>
          ) : (
            <div className="ws-record-row">
              <div>
                <h3>Full learning materials</h3>
                <p>Protected lesson text, knowledge checks and lab details need an approved account. The catalogue and content details stay public.</p>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {accountBacked
              ? <Link to="/sync" className="ws-text-action">View account records →</Link>
              : <Link to="/login" className="ws-text-action">Log in →</Link>}
            <Link to="/paths" className="ws-text-action">Browse catalogue →</Link>
          </div>
        </section>
      </div>
    </div>
    <nav className="ws-quick-links" aria-label="Workspace shortcuts">{[
      ['/paths', 'Learning paths'], ['/modules', 'Modules'], ['/labs', 'Labs'], ['/challenges', 'Challenges'], ['/reference', 'Reference'], ['/sync', 'Account records'],
    ].map(([to, label]) => <Link key={to} to={to}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>
  </div>
}
