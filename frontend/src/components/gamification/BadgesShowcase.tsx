import { ACHIEVEMENTS_DEF, useProgressStore } from '@/store/useProgressStore'
import { EmptyState } from '@/components/common/Workspace'
import { Link } from 'react-router-dom'

/** Earned and upcoming milestones share readable requirements; locked never means unreadable. */
export function BadgesShowcase({ className = '' }: { className?: string }) {
  const achievements = useProgressStore(s => s.achievements)
  const earned = new Set(achievements.map(item => item.id))
  const groups = [
    { title: 'Earned milestones', items: ACHIEVEMENTS_DEF.filter(item => earned.has(item.id)), unlocked: true },
    { title: 'Next milestones', items: ACHIEVEMENTS_DEF.filter(item => !earned.has(item.id)), unlocked: false },
  ]
  return <div className={`sc-badges ${className}`}>
    <p className="ws-muted">Milestones reflect practice in this browser, not verified competence. Each requirement below explains what to work toward.</p>
    {groups.map(group => <section key={group.title}>
      <h3>{group.title} <span>{group.items.length}</span></h3>
      {group.items.length ? <div className="sc-badge-grid">{group.items.map(badge => <article key={badge.id} className={group.unlocked ? 'is-earned' : ''}>
        <span className="sc-badge-symbol" aria-hidden="true">{badge.icon}</span>
        <div><h4>{badge.title}</h4><p>{badge.description}</p><small>{group.unlocked ? 'Earned locally' : 'Not yet earned'} · {badge.points} practice XP · unverified</small></div>
      </article>)}</div> : <EmptyState title={group.unlocked ? 'Your first milestone is ahead' : 'All current milestones earned locally'} description={group.unlocked ? 'Start a lesson to begin building your local practice record.' : 'Keep reviewing and practising; these milestones are not a certification.'} action={<Link to="/app" className="ws-action ws-action-secondary">Continue learning →</Link>} />}
    </section>)}
  </div>
}
