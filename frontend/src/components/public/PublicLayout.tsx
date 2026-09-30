import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, Shield, X, UserRound, LogOut, LayoutDashboard, CloudUpload } from 'lucide-react'
import { useSession } from '@/lib/session'
import { isOwner, isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'text-cyan-300 bg-cyan-400/10' : 'text-slate-300 hover:text-white hover:bg-white/5'}`

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { userState, account, signOut } = useSession()
  const location = useLocation()

  // Close the mobile drawer on navigation so it never strands over the new page.
  useEffect(() => setMenuOpen(false), [location.pathname])

  const signedIn = isSignedIn(userState)

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <a href="#public-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-300 focus:px-4 focus:py-2 focus:text-slate-950">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="SecCraft home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              Sec<span className="text-cyan-300">Craft</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <NavLink to="/paths" className={navClass}>Learning paths</NavLink>
            <NavLink to="/how-it-works" className={navClass}>How it works</NavLink>
            <NavLink to="/about" className={navClass}>About</NavLink>
          </nav>

          {signedIn ? (
            <div className="hidden items-center gap-2 md:flex">
              <StateChip state={userState} size="sm" />
              <Link to="/app" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200">
                {isOwner(userState) ? 'Owner console' : 'Open workspace'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/60">
                Request access
              </Link>
              <Link to="/app" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/15">
                Explore as guest <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 md:hidden"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-nav"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="public-mobile-nav" aria-label="Mobile navigation" className="border-t border-slate-800 px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <NavLink to="/paths" className={navClass}>Learning paths</NavLink>
              <NavLink to="/how-it-works" className={navClass}>How it works</NavLink>
              <NavLink to="/about" className={navClass}>About</NavLink>
              {signedIn ? (
                <div className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between gap-2 px-3">
                    <span className="truncate text-xs text-slate-400">{account?.email ?? STATE_META[userState].label}</span>
                    <StateChip state={userState} size="sm" />
                  </div>
                  <Link to="/app" className="flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-center text-sm font-semibold text-slate-950">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Open workspace
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2 border-t border-slate-800 pt-3">
                  <Link to="/login" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-200">
                    <UserRound className="h-4 w-4" aria-hidden="true" /> Log in
                  </Link>
                  <Link to="/signup" className="hidden flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-200">
                    <CloudUpload className="h-4 w-4" aria-hidden="true" /> Request access
                  </Link>
                  <Link to="/app" className="flex-1 rounded-lg bg-cyan-300 px-3 py-2 text-center text-sm font-semibold text-slate-950">Explore as guest</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="public-main" className="min-h-[calc(100vh-68px)]">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 bg-[#050b18]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-slate-400 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="font-semibold text-slate-200">SecCraft</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-400">
                Learn. Practice. Investigate. Improve. Guest learning is complete and needs no account.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 sm:text-right">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Platform</span>
                <Link to="/paths" className="hover:text-slate-200">Learning paths</Link>
                <Link to="/how-it-works" className="hover:text-slate-200">How it works</Link>
                <Link to="/about" className="hover:text-slate-200">About</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">Start</span>
                <Link to="/app" className="hover:text-slate-200">Guest workspace</Link>
                <Link to="/login" className="hover:text-slate-200">Log in</Link>
                <Link to="/signup" className="hover:text-slate-200">Request access</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-5 text-[11.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Simulated and bundled lab artifacts. For authorized, legal security testing only.</span>
            <span className="font-mono">Static-first • backend-enhanced • local-first</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
