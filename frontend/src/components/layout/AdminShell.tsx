import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Lock, Shield } from 'lucide-react'
import { useSession } from '@/lib/session'
import { isOwner } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

/** Presentation guard only. The API independently verifies the server-side owner allowlist. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { userState, account, ready, accountLoading } = useSession()
  if (!ready || accountLoading) return <div className="sc-owner-gate" role="status" aria-live="polite">Checking owner access…</div>
  if (!isOwner(userState)) return <main className="sc-owner-gate"><div><Lock size={25} aria-hidden="true" /><h1>Owner access required</h1><p>Only accounts on the server-controlled owner allowlist can use these operations. Learning features remain available.</p><div className="sc-owner-gate-actions"><Link to="/login" className="ws-action">Sign in</Link><Link to="/app" className="ws-action ws-action-secondary">Back to workspace</Link></div><p><StateChip state={userState} size="sm" /> {account?.email ?? 'Not signed in'}</p></div></main>
  return <div className="ws-admin-shell sc-owner-shell">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--panel-bg)]">Skip to content</a>
    <header className="sc-owner-masthead"><div><Link to="/app" className="sc-owner-brand"><Shield size={18} aria-hidden="true" /> SecCraft <span>/ Owner console</span></Link><Link to="/app" className="sc-owner-return"><ArrowLeft size={16} aria-hidden="true" /> Learner workspace</Link></div></header>
    <nav aria-label="Owner sections" className="ws-tool-actions p-4"><Link className="ws-action ws-action-secondary" to="/admin">Accounts & policy</Link><Link className="ws-action ws-action-secondary" to="/admin/feedback">Feedback inbox</Link></nav>
    <main tabIndex={-1} id="admin-main" className="sc-owner-main">{children}</main>
    <footer className="sc-owner-footer"><p>Owner privileges come from the server-side allowlist; this page cannot grant access.</p><a href="https://github.com/AmitPal-CyberBuddy/SecCraft" target="_blank" rel="noreferrer noopener">Repository <ExternalLink size={14} aria-hidden="true" /></a></footer>
  </div>
}
