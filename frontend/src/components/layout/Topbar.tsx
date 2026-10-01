import { LayoutGroup, motion } from 'framer-motion'
import { useMotionPolicy } from '@/components/animations/motionPolicy'
import { motionTiming } from '@/lib/motion'
import { useId, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Menu, Moon, Search, Shield, Sun, UserRound } from 'lucide-react'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useSession } from '@/lib/session'
import { isOwner, isSignedIn } from '@/lib/access'
import { canAccessTier, currentCurriculumLabel } from '@/lib/contentAccess'
import { StateChip, UnavailableStatusChip } from '@/components/account/StateChip'

interface Props { onMenuToggle: () => void; sidebarOpen: boolean }
const primary = [{ to: '/app', label: 'Workspace' }, { to: '/paths', label: 'Paths' }, { to: '/modules', label: 'Modules' }, { to: '/labs', label: 'Labs' }, { to: '/challenges', label: 'Challenges' }]

export function Topbar({ onMenuToggle, sidebarOpen }: Props) {
  const motionScope = useId()
  const policy = useMotionPolicy()
  const travel = policy.finePointer && !policy.compact && !policy.reduced && !policy.paused
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    const shell = header?.closest<HTMLElement>('.sc-header-shell')
    if (!header || !shell) return
    const measure = () => shell.style.setProperty('--header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`)
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(header)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      shell.style.removeProperty('--header-height')
    }
  }, [])
  const { pathname } = useLocation()
  const { resolved, setTheme } = useTheme()
  const { userState, account, accountError, hasSession, signOut } = useSession()
  const statusUnavailable = hasSession && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const full = canAccessTier(userState, 'full')
  useEffect(() => { setAccountOpen(false) }, [pathname])
  useEffect(() => {
    if (!accountOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setAccountOpen(false); accountRef.current?.querySelector<HTMLButtonElement>('button')?.focus() } }
    const onPointer = (event: MouseEvent) => { if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onPointer) }
  }, [accountOpen])
  return <><header ref={headerRef} data-tour="topbar" className="sc-topbar sc-global-header">
    <div className="sc-global-row">
      <Link to="/" className="sc-global-brand" aria-label="SecCraft home"><Shield size={20} strokeWidth={1.8} aria-hidden="true" /><span>SecCraft</span></Link>
      <LayoutGroup id={motionScope}><nav className="sc-global-links" aria-label="Main destinations">{primary.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `sc-global-link${isActive ? ' is-active' : ''}`}>{({ isActive }) => <>{item.label}{isActive && <motion.span aria-hidden="true" className="sc-destination-marker" layoutId={travel ? 'destination-marker' : undefined} initial={false} transition={{ type: 'tween', duration: travel ? motionTiming.selection : 0, ease: motionTiming.ease }} />}</>}</NavLink>)}</nav></LayoutGroup>
      <div className="sc-topbar-actions">
        <button type="button" data-tour="search" onClick={() => document.dispatchEvent(new CustomEvent('open-search'))} className="sc-search-button" aria-label="Search SecCraft"><Search size={17} aria-hidden="true" /><span>Search</span><kbd>⌘ K</kbd></button>
        <button type="button" className="sc-icon-button sc-utility-icon" onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}>{resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" className="sc-icon-button sc-utility-icon" onClick={() => setNotificationsOpen(v => !v)} aria-label="Activity and notifications" aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-controls="activity-panel"><Bell size={18} /></button>
        <div className="sc-account-menu" ref={accountRef}><button type="button" className="sc-account-trigger sc-avatar-trigger" aria-expanded={accountOpen} aria-controls="account-menu" aria-label={`${isSignedIn(userState) ? 'Account' : 'Preview learner'} menu`} onClick={() => setAccountOpen(v => !v)}><UserRound size={18} aria-hidden="true" /><ChevronDown size={13} aria-hidden="true" /></button>
          {accountOpen && <div id="account-menu" className="sc-account-dropdown" onClick={event => { if ((event.target as HTMLElement).closest('a')) setAccountOpen(false) }}><div className="sc-account-identity"><strong>{account?.email ?? (hasSession ? 'Signed in · status unconfirmed' : 'Preview learner')}</strong>{statusUnavailable ? <UnavailableStatusChip size="sm" /> : <StateChip state={userState} size="sm" />}</div><Link to="/profile">Profile</Link><Link to="/sync">Progress sync</Link><Link to="/settings">Settings</Link><Link to={`/feedback?page=${encodeURIComponent(pathname)}`}>Contact & feedback</Link>{isSignedIn(userState) && <Link to="/account">Account status</Link>}{isOwner(userState) && <Link to="/admin">Owner console</Link>}{isSignedIn(userState) ? <button type="button" onClick={() => { setAccountOpen(false); void signOut() }}>Sign out</button> : <><Link to="/login">Log in</Link><Link to="/signup">Request access</Link></>}</div>}
        </div>
        <button type="button" id="mobile-navigation-toggle" className="sc-all-tools" aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={sidebarOpen} aria-controls="primary-navigation" onClick={onMenuToggle}><Menu size={19} aria-hidden="true" /><span>All tools</span></button>
      </div>
    </div>
    <div className="sc-experience-row"><div className="sc-experience-copy"><span className="sc-experience-marker" aria-hidden="true" /><strong>{currentCurriculumLabel(userState)}</strong><span className="sc-experience-divider" aria-hidden="true" /><span>{full ? 'Account experience · local practice is still unverified' : 'Practice stays in this browser · unverified'}</span></div>{full ? <Link to="/sync">View account records →</Link> : <Link to={isSignedIn(userState) ? '/account' : '/signup'}>{isSignedIn(userState) ? 'Check account status →' : 'About accounts →'}</Link>}</div>
  </header><NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} /></>
}
