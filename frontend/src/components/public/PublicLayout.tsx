import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ArrowRight, Menu, Shield, X } from 'lucide-react'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'text-cyan-300 bg-cyan-400/10' : 'text-slate-300 hover:text-white hover:bg-white/5'}`

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

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
            <span className="text-[17px] font-bold tracking-tight">Sec<span className="text-cyan-300">Craft</span></span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <NavLink to="/how-it-works" className={navClass}>How it works</NavLink>
            <NavLink to="/about" className={navClass}>About</NavLink>
            <Link to="/paths" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">Learning paths</Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">Sign in</Link>
            <Link to="/app" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/15">
              Explore as guest <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

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
              <NavLink onClick={() => setMenuOpen(false)} to="/how-it-works" className={navClass}>How it works</NavLink>
              <NavLink onClick={() => setMenuOpen(false)} to="/about" className={navClass}>About</NavLink>
              <Link onClick={() => setMenuOpen(false)} to="/paths" className="rounded-lg px-3 py-2 text-sm text-slate-300">Learning paths</Link>
              <div className="mt-2 flex gap-2 border-t border-slate-800 pt-3">
                <Link onClick={() => setMenuOpen(false)} to="/login" className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-200">Sign in</Link>
                <Link onClick={() => setMenuOpen(false)} to="/app" className="flex-1 rounded-lg bg-cyan-300 px-3 py-2 text-center text-sm font-semibold text-slate-950">Explore as guest</Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main id="public-main" className="min-h-[calc(100vh-68px)]">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/80 bg-[#050b18]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div><span className="font-semibold text-slate-200">SecCraft</span><span className="mx-2 text-slate-600">·</span>Learn. Practice. Investigate. Improve.</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/about" className="hover:text-slate-200">About</Link>
            <Link to="/how-it-works" className="hover:text-slate-200">How it works</Link>
            <Link to="/paths" className="hover:text-slate-200">Learning paths</Link>
            <Link to="/settings" className="hover:text-slate-200">Privacy &amp; settings</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
