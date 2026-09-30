import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Lock, Shield, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import platform from '@/content/platform.json'
import { useSession } from '@/lib/session'
import { isOwner } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

/**
 * Owner console chrome.
 *
 * Deliberately separate from the learner `Shell`: no learning navigation, no XP, no streak, no
 * learning surface at all. Owner privileges come from a server-side allowlist, and this component
 * only decides what to *render* — the API rejects every non-owner call regardless.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { userState, account, ready } = useSession()

  // Owner status cannot be known until the account request settles, so nothing is rendered until
  // `ready` flips. The console is never briefly shown to a non-owner.
  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050b18] px-4 text-slate-400">
        <div className="flex items-center gap-2.5 text-sm" role="status" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" />
          Checking owner access…
        </div>
      </div>
    )
  }

  if (!isOwner(userState)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050b18] px-4 py-12 text-slate-100">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#081120] p-7 text-center shadow-[0_24px_90px_rgba(0,0,0,.4)] sm:p-9">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-[#020617]">
            <Lock className="h-5 w-5 text-slate-300" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-white">Owner access required</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The owner console is restricted to accounts on the server-controlled owner allowlist. If you are expecting
            owner access, sign in with the owner account. Learning features are unaffected either way.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200">
              Sign in
            </Link>
            <Link to="/app" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-200 transition-colors hover:bg-slate-800">
              Back to the workspace
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <StateChip state={userState} size="sm" />
            <span className="text-[11px] text-slate-500">{account?.email ?? 'Not signed in'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#050b18] text-slate-100">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-xl focus:bg-[#0f172a] focus:px-4 focus:py-2 focus:text-slate-100">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-violet-500/20 bg-[#050b18]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/10">
              <Sparkles className="h-4 w-4 text-violet-200" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-bold tracking-tight text-white">Owner console</span>
                <span className="hidden rounded-md border border-violet-300/20 bg-violet-300/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-violet-200 sm:inline">owner only</span>
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {platform.name} • enrollment, capacity, and audit
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/app"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Learner workspace</span>
              <span className="sm:hidden">Workspace</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="admin-main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Owner privileges come from a server-side allowlist. This page cannot grant access to anyone.
          </p>
          <a href="https://github.com/AmitPal-CyberBuddy/SecCraft" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 hover:text-slate-300">
            Repository <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  )
}
