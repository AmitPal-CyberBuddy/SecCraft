import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Compass, Fingerprint, Info, LogOut, ShieldAlert, UserCheck, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSession } from '@/lib/session'
import { allows, PREVIEW_NOTE, STATE_META, type UserState } from '@/lib/access'
import { StateChip } from './StateChip'

/**
 * The account-state banner.
 *
 * It appears only when there is something the learner must know about their account: unverified
 * email, a transient account-service outage, or a pending / rejected / suspended state. Guest and
 * approved users never see a banner — the product does not nag.
 */
export function AccountBanner() {
  const { userState, accountError, signOut, ready, accountLoading, hasSession, refreshAccount } = useSession()
  const [dismissedFor, setDismissedFor] = useState<UserState | null>(null)

  if (!ready || accountLoading) return null

  const unverified = accountError.kind === 'unverified'
  // Account availability belongs on sign-in screens, not every guest lesson.
  if (userState === 'guest' && !hasSession && !unverified) return null
  const transient = accountError.kind === 'unavailable' || accountError.kind === 'unknown'
  const isAccountState = userState === 'pending' || userState === 'rejected' || userState === 'suspended'

  // Dismissal is scoped to the state that was dismissed, so a later state still gets its banner.
  const dismissed = dismissedFor === userState
  if (!unverified && !transient && !(isAccountState && !dismissed)) return null

  return (
    <div
      role="status"
      className="mb-4 min-w-0"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-4 sm:p-5">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
            unverified || userState === 'pending'
              ? 'from-[var(--warning-bg)] via-transparent to-transparent'
              : userState === 'rejected' || userState === 'suspended'
              ? 'from-[var(--danger-bg)] via-transparent to-transparent'
              : 'from-[var(--panel-raised)] via-transparent to-transparent'
          }`}
        />
        <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)]">
              {unverified ? (
                <Fingerprint className="h-4 w-4 text-[var(--attention)]" aria-hidden="true" />
              ) : userState === 'rejected' || userState === 'suspended' ? (
                <ShieldAlert className="h-4 w-4 text-[var(--danger)]" aria-hidden="true" />
              ) : userState === 'pending' ? (
                <Clock className="h-4 w-4 text-[var(--attention)]" aria-hidden="true" />
              ) : (
                <Info className="h-4 w-4 text-[var(--ink-secondary)]" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-[14px] font-bold text-[var(--ink-primary)]">
                  {unverified ? 'Confirm your email address' : transient ? hasSession ? 'Signed in · account status unavailable' : 'Account services unavailable' : STATE_META[userState as Exclude<UserState, 'public' | 'guest'>].label}
                </h2>
                {!transient && <StateChip state={userState} size="sm" />}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-secondary)]">
                {unverified
                  ? 'Open the verification message sent to your inbox, then come back. Until then, account features stay unavailable — guest learning does not.'
                  : transient
                  ? `${accountError.message} ${hasSession ? 'Your approval and owner access cannot be confirmed right now. This is not a pending-approval decision.' : 'Your account status cannot be checked right now.'} Preview learning and browser-local practice remain available.`
                  : STATE_META[userState as Exclude<UserState, 'public' | 'guest'>].summary}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                <Compass className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
                {allows(userState, 'full-curriculum')
                  ? 'The Full Curriculum and your account records are both available.'
                  : PREVIEW_NOTE}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {transient && hasSession && (
              <button type="button" onClick={() => void refreshAccount()} className="inline-flex min-h-11 items-center rounded-lg border border-[var(--accent-border)] px-3 text-[12px] font-semibold text-[var(--learning)] hover:bg-[var(--accent-bg)]">Re-check status</button>
            )}
            {userState === 'rejected' || userState === 'suspended' ? (
              <Link
                to="/profile"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--panel-inset)] px-3 text-[12px] font-medium text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)]"
              >
                Account details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/paths"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 text-[12px] font-semibold text-[var(--learning)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
              >
                Keep learning <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--line-normal)] px-3 text-[12px] text-[var(--ink-secondary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
            {!transient && (
              <button
                type="button"
                onClick={() => setDismissedFor(userState)}
                aria-label="Dismiss this account notice"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line-normal)] text-[var(--ink-secondary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A short, inline explanation of what a state means. Used on the account and profile screens. */
export function StateExplainer({ state, children }: { state: UserState; children?: ReactNode }) {
  const meta = STATE_META[state]
  return (
    <div className="rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <StateChip state={state} size="sm" />
        <span className="text-sm font-medium text-[var(--ink-secondary)]">{meta.nextAction}</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">{children ?? meta.summary}</p>
    </div>
  )
}

/** Positive confirmation used when an owner account reaches the learner chrome. */
export function OwnerNotice() {
  const { userState } = useSession()
  if (userState !== 'owner') return null
  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--owner-border)] bg-[var(--owner-bg)] px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <UserCheck className="h-4 w-4 shrink-0 text-[var(--owner)]" aria-hidden="true" />
        <p className="min-w-0 text-sm leading-relaxed text-[var(--owner)]">
          You are signed in as the platform owner. Learner tools and owner controls are separate — approvals and policy
          live in the owner console.
        </p>
      </div>
      <Link
        to="/admin"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--owner-border)] bg-[var(--owner-bg)] px-3 text-[12px] font-semibold text-[var(--owner)] transition-colors hover:bg-[var(--owner-bg)]"
      >
        Open owner console <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}
