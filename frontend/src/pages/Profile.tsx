import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CloudUpload, KeyRound, LogIn, LogOut, ShieldCheck, Sparkles, UserRound, Check, Info, RefreshCw, Database, Eye } from 'lucide-react'
import { useLocalProfile } from '@/components/profile/LocalProfile'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'
import { useProgressStore } from '@/store/useProgressStore'
import {
  accessLabel,
  ACCOUNT_SYNC_NOTE,
  CATALOGUE_NOTE,
  isSignedIn,
  PRACTICE_XP_NOTE,
  STATE_META,
} from '@/lib/access'
import { StandingChip } from '@/components/account/PracticeStanding'
import { ProvenanceChip, StateChip, UnavailableStatusChip } from '@/components/account/StateChip'
import { StateExplainer } from '@/components/account/AccountBanner'
import { MetadataRow } from '@/components/common/Workspace'

function Row({ label, value, mono = false, chip }: { label: string; value: React.ReactNode; mono?: boolean; chip?: React.ReactNode }) {
  return <MetadataRow label={label} value={value} aside={chip} mono={mono} />
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Profile.
 *
 * Two clearly separated branches: a **guest profile** (a browser-local display name that is not an
 * identity and grants nothing) and an **authenticated account** (server-held identity, status, and
 * membership). The account branch never renames the guest profile into a login; they are different
 * things and the UI says so.
 */
export function Profile() {
  const { userState, account, accountError, apiState, authAvailability, refreshAccount, signOut, can } = useSession()
  const { profile, hasProfile, save, clear } = useLocalProfile()
  const [name, setName] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const server = useServerProgress()

  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const completedChallenges = useProgressStore(s => s.completedChallenges)
  const quizScores = useProgressStore(s => s.quizScores)
  const retiredRecords = useProgressStore(s => s.retiredRecords)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.getStreak())

  useEffect(() => setName(profile?.displayName ?? ''), [profile?.displayName])

  const localCount = useMemo(
    () => completedLessons.length + completedLabs.length + completedChallenges.length + quizScores.length,
    [completedLessons, completedLabs, completedChallenges, quizScores],
  )

  const signedIn = isSignedIn(userState)
  const statusUnavailable = signedIn && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')

  async function handleRefresh() {
    setRefreshing(true)
    await refreshAccount()
    if (can('account-progress')) await server.reload()
    setRefreshing(false)
  }

  return (
    <div className="ws-account-area sc-profile-page mx-auto w-full max-w-[1000px] min-w-0">
      <header className="sc-record-header"><div><p className="sc-library-domain">Account / Identity</p><h1>Profile</h1><p>Who you are in SecCraft, and where each record lives.</p></div><div className="sc-profile-actions">{statusUnavailable ? <UnavailableStatusChip /> : <StateChip state={userState} />}<button type="button" onClick={() => void handleRefresh()} disabled={refreshing} className="ws-action ws-action-secondary"><RefreshCw size={15} aria-hidden="true" />{refreshing ? 'Refreshing…' : 'Refresh'}</button></div></header>
      <nav aria-label="Profile destinations" className="sc-profile-destinations"><Link to="/paths">Learning</Link><Link to="/progress">Practice activity</Link><Link to="/engagement">Assessments</Link><Link to="/achievements">Local achievements</Link><Link to="/sync">Progress transfer</Link></nav>
      <div className="sc-profile-state">{statusUnavailable ? <p role="status">Signed in; account status unavailable. The catalogue remains available. Refresh to try again.</p> : <StateExplainer state={userState} />}</div>

      {/* ── Authenticated account ───────────────────────────────────────── */}
      {signedIn ? (
        <>
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
              <Row label="Account status" value={statusUnavailable ? "Unavailable — not an approval decision" : STATE_META[userState].label} chip={statusUnavailable ? <UnavailableStatusChip size="sm" /> : <StateChip state={userState} size="sm" />} />
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

            {accountError.kind !== 'none' && (
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
              <Link to="/account" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                Account status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link to="/reset-password" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Change password
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="sc-profile-section">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
                <LogIn className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" /> Platform account
              </h2>
              <ProvenanceChip provenance="local" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
              You have <span className="text-[var(--ink-primary)]">{accessLabel(userState)}</span>. The catalogue is public;
              lessons, labs and assessments are for approved accounts. Your progress, XP, and achievements stay in this browser —
              they are practice, not a record.
            </p>
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                What an approved account changes
              </p>
              <ul className="ws-account-benefits mt-2">
                {[
                  'Lessons, labs and assessments, including the final assessment.',
                  'Progress held on the platform for your account, instead of only in this browser.',
                  'Account-held XP and achievement records are distinct from local practice; without a trusted grader they are not proof of mastery.',
                  'Assessment attempt history, and a manual way to move a progress file between devices.',
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
              <Link to="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Log in
              </Link>
              {can('request-account') && authAvailability === 'ready' && (
                <Link to="/signup" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg sc-learning-action px-3 text-sm font-bold  transition-colors ">
                  Request an account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
            {authAvailability === 'unavailable' && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                Account services are not configured in this build, so sign-in is unavailable. The public catalogue
                works on its own.
              </p>
            )}
          </section>
        </>
      )}

      {/* ── Local record ────────────────────────────────────────────────── */}
      <>
        <section className="sc-profile-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
              <Eye className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" /> This browser&rsquo;s practice record
            </h2>
            <StandingChip standing="practice" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
            {PRACTICE_XP_NOTE} Nothing here is confirmed by the platform, and it does not follow you to another device
            unless you export it yourself.
          </p>
          <div className="mt-4">
            <Row label="Recorded activities" value={`${localCount}`} />
            {retiredRecords.length > 0 && <Row label="Earlier course activities" value={`${retiredRecords.length} archived locally; not counted as current quiz/lesson credit or verified mastery`} />}
            <Row label="Practice XP" value={`${totalXp} XP`} chip={<ProvenanceChip provenance="derived" />} />
            <Row label="Practice level" value={`${level.title} · Lv.${level.level}`} chip={<ProvenanceChip provenance="derived" />} />
            <Row label="Practice day streak" value={`${streak}d`} chip={<ProvenanceChip provenance="derived" />} />
            <Row
              label="Curriculum"
              value={accessLabel(userState)}
              chip={<ProvenanceChip provenance="derived" />}
            />
          </div>
        </section>
      </>

      {/* ── Guest profile — a display name, deliberately not an identity ── */}
      <>
        <section className="sc-profile-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
              <UserRound className="h-4 w-4 text-[var(--owner)]" aria-hidden="true" /> Guest display name
            </h2>
            {hasProfile && <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--success)]">saved locally</span>}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
            A label for this browser only. It is not an account, it is not a role, and it grants nothing — it cannot sign
            you in, reach the account service, or unlock a feature. It stays useful after you sign in, and it is never
            merged with your account identity.
          </p>

          {hasProfile ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold text-[var(--ink-primary)]">{profile?.displayName}</div>
                <div className="truncate text-sm font-mono text-[var(--ink-secondary)]">Stored in this browser only</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setName(profile?.displayName ?? '')}
                  className="inline-flex min-h-9 items-center rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clear()
                    setName('')
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)]"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Clear
                </button>
              </div>
            </div>
          ) : null}

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={event => {
              event.preventDefault()
              save({ displayName: name.trim() || 'Guest learner' })
            }}
          >
            <label htmlFor="guest-display-name" className="sc-form-label">Guest display name (optional)</label>
            <input
              id="guest-display-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Display name (optional)"
              maxLength={64}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3.5 text-sm text-[var(--ink-primary)] outline-none transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--owner-border)]"
            />
            <button
              type="submit"
              className="ws-action"
            >
              Save locally
            </button>
          </form>
        </section>
      </>

      {/* ── Synchronization summary ─────────────────────────────────────── */}
      <>
        <section className="sc-profile-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-[var(--ink-primary)]">
              <Database className="h-4 w-4 text-[var(--success)]" aria-hidden="true" /> Synchronization
            </h2>
            <Link to="/sync" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
              Open progress sync <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">{ACCOUNT_SYNC_NOTE}</p>

          <div className="mt-4">
            {can('account-progress') ? (
              server.state === 'loading' ? (
                <p className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]" role="status" aria-live="polite">
                  <span className="h-2 w-2  rounded-full bg-[var(--action-fill)]" aria-hidden="true" /> Checking what the platform holds…
                </p>
              ) : server.data ? (
                <div className="rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3.5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Server records', value: server.data.records.length, chip: 'server' as const },
                      { label: 'Verified', value: server.data.verified, chip: 'server' as const },
                      { label: 'Imported (unverified)', value: server.data.imported, chip: 'imported' as const },
                      { label: 'Server XP ledger', value: server.data.xp, chip: 'server' as const },
                    ].map(stat => (
                      <div key={stat.label}>
                        <div className="font-mono text-[18px] font-bold text-[var(--ink-primary)]">{stat.value}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-[var(--ink-secondary)]">{stat.label}</span>
                          <ProvenanceChip provenance={stat.chip} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-[var(--ink-muted)]">Read from the platform at {server.data.checkedAt}.</p>
                </div>
              ) : (
                <p className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-sm leading-relaxed text-[var(--attention)]">{server.message}</p>
              )
            ) : (
              <p className="rounded-lg border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3 text-sm leading-relaxed text-[var(--ink-secondary)]">
                Account-backed progress is not available in this state. {STATE_META[userState].summary}
              </p>
            )}
          </div>
        </section>
      </>

      <>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-4 text-center">
          <CloudUpload className="h-4 w-4 shrink-0 text-[var(--ink-secondary)]" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
            Changing your display name, signing in, or signing out never changes your learning record, your XP, or your
            notes. Those live in this browser and only move when you export and import a progress file.
          </p>
        </div>
      </>
    </div>
  )
}
