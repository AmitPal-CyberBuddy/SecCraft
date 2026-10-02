import { NavLink, Link, useLocation } from 'react-router-dom'
import { Shield, X } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'
import learningPaths from '@/content/learning-paths.json'
import { useSession } from '@/lib/session'
import { isOwner, isSignedIn } from '@/lib/access'
import { buildAccountSections, buildLearnerSections, buildOwnerSection, type NavItem } from './navModel'

interface Props { onClose?: () => void; isMobile?: boolean; isOpen?: boolean }

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`))
  return <NavLink to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`sc-navigation-link${active ? ' is-active' : ''}`}>
    <item.icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{item.label}</span>
  </NavLink>
}

export function Sidebar({ onClose, isMobile, isOpen }: Props) {
  const { userState, signOut } = useSession()
  const pathId = useProgressStore(s => s.currentLearningPathId)
  const path = learningPaths.find(p => p.id === pathId)
  const progress = useProgressStore(s => s.getPathProgress(pathId ?? ''))
  const learner = buildLearnerSections()
  const account = buildAccountSections(userState)
  const owner = isOwner(userState) ? buildOwnerSection() : []
  return <aside id="primary-navigation" aria-label="Primary navigation" aria-hidden={isMobile && !isOpen ? true : undefined} inert={Boolean(isMobile && !isOpen)} className="sc-navigation">
    <div className="sc-navigation-brand"><Link to="/" onClick={isMobile ? onClose : undefined} aria-label="SecCraft home" className="sc-brand"><span className="sc-brand-symbol"><Shield size={19} strokeWidth={1.8} aria-hidden="true" /></span><span>SecCraft<small>Security learning</small></span></Link>{isMobile && <button type="button" onClick={onClose} aria-label="Close menu" className="sc-icon-button"><X size={19} /></button>}</div>
    <nav aria-label="Workspace" className="sc-navigation-scroll">
      {learner.map(section => <div className="sc-navigation-group" key={section.key}><h2>{section.label}</h2>{section.items.map(item => <NavRow key={item.to} item={item} onNavigate={isMobile ? onClose : undefined} />)}</div>)}
      {account.map(section => <div className="sc-navigation-group" key={section.key}><h2>{section.label}</h2>{section.items.map(item => <NavRow key={item.to} item={item} onNavigate={isMobile ? onClose : undefined} />)}</div>)}
      {owner.map(section => <div className="sc-navigation-group sc-owner-group" key={section.key}><h2>{section.label}</h2>{section.items.map(item => <NavRow key={item.to} item={item} onNavigate={isMobile ? onClose : undefined} />)}</div>)}
    </nav>
    <div className="sc-navigation-footer"><Link to={path ? `/paths/${path.id}` : '/paths'} onClick={isMobile ? onClose : undefined} className="sc-nav-path"><span className="sc-nav-path-label">{path ? 'CURRENT PATH' : 'LEARNING PATHS'} {path && <span>{progress}%</span>}</span><strong>{path?.title ?? 'Choose your path'}</strong>{path && <span className="sc-nav-track"><span style={{ width: `${progress}%` }} /></span>}<small>Local practice in this browser</small></Link><div className="sc-nav-account"><span>{isSignedIn(userState) ? 'Account' : 'Visitor'} · {userState}</span>{isSignedIn(userState) ? <button type="button" onClick={() => void signOut()}>Sign out</button> : <Link to="/signup" onClick={isMobile ? onClose : undefined}>Request access</Link>}</div></div>
  </aside>
}
