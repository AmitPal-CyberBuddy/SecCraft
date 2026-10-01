import { scrollBehavior } from '@/lib/motion'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ArrowUp } from 'lucide-react'
import { useSession } from '@/lib/session'
import { AccountBanner } from '@/components/account/AccountBanner'
import { canAccessTier } from '@/lib/contentAccess'

/** Header-first workspace. The full navigation remains available in a drawer at every width. */
export function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const location = useLocation()
  const { userState, accountLoading, hasSession } = useSession()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#primary-navigation button[aria-label="Close menu"]')?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        requestAnimationFrame(() => document.getElementById('mobile-navigation-toggle')?.focus())
      }
      // Keep keyboard focus inside the modal navigation until it closes.
      if (event.key === 'Tab') {
        const elements = [...document.querySelectorAll<HTMLElement>('#primary-navigation a, #primary-navigation button:not([disabled])')]
        const first = elements[0], last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { cancelAnimationFrame(focusFrame); document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow }
  }, [menuOpen])
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const closeMenu = () => { setMenuOpen(false); requestAnimationFrame(() => document.getElementById('mobile-navigation-toggle')?.focus()) }
  if (accountLoading && hasSession) return <div role="status" aria-live="polite" className="sc-owner-gate">Checking account status…</div>
  return <div className="ws-shell sc-header-shell min-h-screen min-h-[100dvh]" data-experience={canAccessTier(userState, 'full') ? 'full' : 'preview'}>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--panel-bg)]">Skip to content</a>
    {menuOpen && <button type="button" className="sc-drawer-backdrop" aria-label="Close navigation" onClick={closeMenu} tabIndex={-1} />}
    <div className={`sc-drawer ${menuOpen ? 'is-open' : ''}`} role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen ? true : undefined} aria-label={menuOpen ? 'All workspace destinations' : undefined}>
      <Sidebar onClose={closeMenu} isMobile isOpen={menuOpen} />
    </div>
    <Topbar onMenuToggle={() => setMenuOpen(open => !open)} sidebarOpen={menuOpen} />
    <main id="main-content" tabIndex={-1} className="sc-shell-main">
      <div className="ws-main sc-shell-content"><div className="min-w-0 w-full max-w-[1400px] mx-auto"><AccountBanner />{children}</div></div>
    </main>
    {showScrollTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} className="sc-scroll-top fixed bottom-4 right-4 z-30 w-10 h-10 flex items-center justify-center" aria-label="Scroll to top"><ArrowUp size={17} /></button>}
  </div>
}
