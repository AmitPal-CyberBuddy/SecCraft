import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, Shield, X, UserRound, LogOut, LayoutDashboard, CloudUpload } from 'lucide-react'
import { useSession } from '@/lib/session'
import { isOwner, isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'text-[var(--learning)] bg-[var(--nav-active)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--panel-raised)]'}`

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { userState, account, accountLoading, signOut } = useSession()
  const location = useLocation()

  // Close the mobile drawer on navigation so it never strands over the new page.
  useEffect(() => setMenuOpen(false), [location.pathname])

  const signedIn = isSignedIn(userState)

  return (
    <div className="public-layout min-h-screen">
      <a href="#public-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--action-fill)] focus:px-4 focus:py-2 focus:text-[var(--action-ink)]">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-[var(--line-normal)] bg-[var(--panel-inset)] backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="SecCraft home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--learning)]">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              Sec<span className="text-[var(--learning)]">Craft</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <NavLink to="/paths" className={navClass}>Learning paths</NavLink>
            <NavLink to="/how-it-works" className={navClass}>How it works</NavLink>
            <NavLink to="/about" className={navClass}>About</NavLink>
          </nav>

          {signedIn ? (
            <div className="hidden items-center gap-2 md:flex">
              {accountLoading ? <span role="status" className="text-xs text-[var(--ink-secondary)]">Checking account status…</span> : <StateChip state={userState} size="sm" />}
              <Link to={isOwner(userState) ? "/admin" : "/app"} className="inline-flex min-h-10 items-center gap-2 rounded-xl sc-learning-action px-4 text-sm font-bold  transition-colors ">
                {isOwner(userState) ? 'Owner console' : 'Open workspace'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-normal)] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]">Log in</Link>
              <Link to="/signup" className="rounded-lg border border-[var(--line-normal)] px-3 py-2 text-sm font-medium text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)]">
                Request access
              </Link>
              <Link to="/app" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 text-sm font-semibold text-[var(--learning)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]">
                Start the preview <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line-normal)] text-[var(--ink-primary)] md:hidden"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-nav"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="public-mobile-nav" aria-label="Mobile navigation" className="border-t border-[var(--line-normal)] px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <NavLink to="/paths" className={navClass}>Learning paths</NavLink>
              <NavLink to="/how-it-works" className={navClass}>How it works</NavLink>
              <NavLink to="/about" className={navClass}>About</NavLink>
              {signedIn ? (
                <div className="mt-2 flex flex-col gap-2 border-t border-[var(--line-normal)] pt-3">
                  <div className="flex items-center justify-between gap-2 px-3">
                    <span className="truncate text-xs text-[var(--ink-secondary)]">{accountLoading ? 'Checking account status…' : account?.email ?? STATE_META[userState].label}</span>
                    {accountLoading ? <span role="status" className="text-xs text-[var(--ink-secondary)]">Checking account status…</span> : <StateChip state={userState} size="sm" />}
                  </div>
                  <Link to="/app" className="flex items-center justify-center gap-2 rounded-lg sc-learning-action px-3 py-2 text-center text-sm font-semibold ">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Open workspace
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line-normal)] px-3 py-2 text-sm text-[var(--ink-primary)]">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2 border-t border-[var(--line-normal)] pt-3">
                  <Link to="/login" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--line-normal)] px-3 py-2 text-center text-sm text-[var(--ink-primary)]">
                    <UserRound className="h-4 w-4" aria-hidden="true" /> Log in
                  </Link>
                  <Link to="/signup" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--line-normal)] px-3 py-2 text-center text-sm text-[var(--ink-primary)]">
                    <CloudUpload className="h-4 w-4" aria-hidden="true" /> Request access
                  </Link>
                  <Link to="/app" className="flex-1 rounded-lg sc-learning-action px-3 py-2 text-center text-sm font-semibold ">Start the preview</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="public-main" tabIndex={-1} className="min-h-[calc(100vh-68px)]">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--line-normal)] bg-[var(--panel-inset)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-[var(--ink-secondary)] sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--learning)]">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-semibold text-[var(--ink-primary)]">SecCraft</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                Learn. Practice. Investigate. Improve. The Preview Curriculum is available without an account. Approved accounts have the Full Curriculum experience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:text-right">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--ink-muted)]">Platform</span>
                <Link to="/paths" className="hover:text-[var(--ink-primary)]">Learning paths</Link>
                <Link to="/how-it-works" className="hover:text-[var(--ink-primary)]">How it works</Link>
                <Link to="/about" className="hover:text-[var(--ink-primary)]">About</Link>
                <Link to="/feedback" className="hover:text-[var(--ink-primary)]">Contact & feedback</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--ink-muted)]">Start</span>
                <Link to="/app" className="hover:text-[var(--ink-primary)]">Guest workspace</Link>
                <Link to="/login" className="hover:text-[var(--ink-primary)]">Log in</Link>
                <Link to="/signup" className="hover:text-[var(--ink-primary)]">Request access</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--line-normal)] pt-5 text-[11.5px] text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Simulated and bundled lab artifacts. For authorized, legal security testing only.</span>
            <span className="font-mono">Learn. Practice. Investigate. Improve.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
