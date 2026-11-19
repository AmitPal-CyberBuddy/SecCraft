import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, KeyRound, LogIn, LogOut, ShieldCheck, Sparkles, Check, Info, RefreshCw } from 'lucide-react'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'
import {
  accessLabel,
  CATALOGUE_NOTE,
  isSignedIn,
  STATE_META,
} from '@/lib/access'
import { EmailNotVerifiedChip, ProvenanceChip, StateChip, UnavailableStatusChip } from '@/components/account/StateChip'
import { StateExplainer } from '@/components/account/AccountBanner'
import { Breadcrumb, Button, MetadataRow } from '@/components/common/Workspace'

function Row({ label, value, mono = false, chip }: { label: string; value: React.ReactNode; mono?: boolean; chip?: React.ReactNode }) {
  return <MetadataRow label={label} value={value} aside={chip} mono={mono} />
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Profile — account only.
 *
 * SecCraft keeps this deliberately simple: visitors browse the catalogue and content details
 * without signing in. Signing in is only for full learning materials and account-held records.
 * There is no separate visitor profile and no browser-progress profile here.
 */
export function Profile() {
  const { userState, account, accountError, apiState, authAvailability, refreshAccount, resendVerificationEmail, signOut, can } = useSession()
  const [refreshing, setRefreshing] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const server = useServerProgress()

  const signedIn = isSignedIn(userState)
  const statusUnavailable = signedIn && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const emailUnverified = signedIn && accountError.kind === 'unverified'

  async function handleRefresh() {
    setRefreshing(true)
    await refreshAccount()
    if (can('account-progress')) await server.reload()
    setRefreshing(false)
  }

  return (
    <div className="ws-account-area sc-profile-page mx-auto w-full max-w-[1000px] min-w-0">
      <Breadcrumb items={[{ label: 'Account' }, { label: 'Profile' }]} />
      <header className="sc-record-header"><div><p className="sc-library-domain">Account</p><h1>Profile</h1><p>Sign in only for full learning materials and account records. The catalogue stays public.</p></div><div className="sc-profile-actions">{statusUnavailable ? <UnavailableStatusChip /> : emailUnverified ? <EmailNotVerifiedChip /> : <StateChip state={userState} />}<Button tone="secondary" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}><RefreshCw size={15} aria-hidden="true" />{refreshing ? 'Refreshing…' : 'Refresh'}</Button></div></header>
      <nav aria-label="Profile destinations" className="sc-profile-destinations"><Link to="/paths">Catalogue</Link><Link to="/modules">Modules</Link><Link to="/engagement">Assessments</Link><Link to="/account">Account status</Link></nav>
      <div className="sc-profile-state">{statusUnavailable ? <p role="status">Signed in; account status unavailable. The catalogue remains available. Refresh to try again.</p> : emailUnverified ? (
        <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <EmailNotVerifiedChip size="sm" />
            <span className="text-sm font-medium text-[var(--ink-secondary)]">Confirm your email address to continue with your account.</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">Open the verification message sent to your inbox, then refresh. Until then, full learning materials stay unavailable; the catalogue and content details remain public.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={resendBusy} onClick={async () => { setResendBusy(true); setResendMessage(''); const result = await resendVerificationEmail(); setResendMessage(result.message); setResendBusy(false) }} className="inline-flex min-h-9 items-center rounded-lg border border-[var(--accent-border)] px-3 text-sm font-semibold text-[var(--learning)] disabled:opacity-60">{resendBusy ? 'Sending…' : 'Resend verification email'}</button>
            {resendMessage && <p role="status" className="text-[12px] leading-relaxed text-[var(--ink-secondary)]">{resendMessage}</p>}
          </div>
        </div>
      ) : <StateExplainer state={userState} />}</div>

      {signedIn ? (
        <section className="sc-profile-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" /> Account
            </h2>
            <ProvenanceChip provenance="server" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
            Held on the platform and returned by the account service. The browser cannot change any of it.
          </p>

          <div className="mt-4">
            <Row label="Email" value={account?.email ?? 'Not provided by the provider'} />
            <Row label="Account status" value={statusUnavailable ? "Unavailable — not an approval decision" : emailUnverified ? 'Email not verified' : STATE_META[userState].label} chip={statusUnavailable ? <UnavailableStatusChip size="sm" /> : emailUnverified ? <EmailNotVerifiedChip size="sm" /> : <StateChip state={userState} size="sm" />} />
            <Row label="Member since" value={formatDate(account?.created_at)} />
            <Row label="Status reviewed" value={account?.reviewed_at ? formatDate(account.reviewed_at) : 'Not reviewed yet'} />
            <Row label="Account id" value={account?.user_id ? `${account.user_id.slice(0, 8)}…${account.user_id.slice(-4)}` : '—'} mono />
            <Row
              label="Account service"
              value={apiState === 'reachable' ? 'Reachable' : apiState === 'unreachable' ? 'Not reachable' : 'Checking…'}
              chip={
                <span
                  className={`h-1.5 w-1.5 rounded-full ${apiState === 'reachable' ? 'bg-[var(--success)]' : apiState === 'unreachable' ? 'bg-[var(--danger)]' : 'bg-[var(--attention)]'}`}
                  aria-hidden="true"
                />
              }
            />
          </div>

          {accountError.kind !== 'none' && accountError.kind !== 'unverified' && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-sm leading-relaxed text-[var(--attention)]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {accountError.message}
            </p>
          )}

          {userState === 'owner' && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--owner-border)] bg-[var(--owner-bg)] p-3.5">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--owner)]" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--owner)]">
                This account is on the server-controlled owner allowlist.
              </p>
              <Link to="/admin" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--owner)] px-3 text-sm font-bold text-[var(--on-owner)] transition-colors hover:bg-[var(--owner)]">
                Owner console <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/account" tone="secondary" size="sm">Account status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            <Button to="/reset-password" tone="secondary" size="sm"><KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Change password</Button>
            <Button tone="secondary" size="sm" onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out</Button>
          </div>
        </section>
      ) : (
        <section className="sc-profile-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
              <LogIn className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" /> Sign in for full learning materials
            </h2>
            <ProvenanceChip provenance="local" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
            You have <span className="text-[var(--ink-primary)]">{accessLabel(userState)}</span>. The catalogue, module details, lesson outlines, and selected public samples are available without signing in. Sign in for protected lesson text, knowledge checks, lab details, and account records.
          </p>
          <div className="mt-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              What signing in adds
            </p>
            <ul className="ws-account-benefits mt-2">
              {[
                'Protected lesson text and knowledge-check prompts.',
                'Lab details and downloadable learning artifacts.',
                'Account-held records for approved accounts.',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">{CATALOGUE_NOTE}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/login" tone="secondary" size="sm"><LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Log in</Button>
            {can('request-account') && authAvailability === 'ready' && (
              <Button to="/signup" size="sm">Request an account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            )}
            <Button to="/paths" tone="secondary" size="sm">Browse catalogue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
          </div>
          {authAvailability === 'unavailable' && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
              Account services are not configured in this build, so sign-in is unavailable. The public catalogue works on its own.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
