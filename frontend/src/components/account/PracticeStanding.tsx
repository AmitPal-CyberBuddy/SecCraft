import { Link } from 'react-router-dom'
import { Info, ShieldCheck, Sparkles } from 'lucide-react'
import { useSession } from '@/lib/session'
import { allows, PRACTICE_XP_NOTE, standingFor, type Standing } from '@/lib/access'

/**
 * A small inline marker that tells the reader whether a number on this screen is a practice
 * figure or a record.
 *
 * Every surface that reads XP, level, streak, or achievements from browser-local state must carry
 * one of these. A practice score is motivating and worth keeping; it is simply not a claim about
 * what the platform has verified, and the two should never be shown in the same visual language.
 */
export function StandingChip({ standing, className = '' }: { standing: Standing; className?: string }) {
  const isPractice = standing === 'practice'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
        isPractice
          ? 'border-[var(--line-normal)] bg-[var(--panel-raised)] text-[var(--ink-secondary)]'
          : 'border-[var(--line-normal)] bg-[var(--panel-raised)] text-[var(--success)]'
      } ${className}`}
    >
      {isPractice ? <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> : <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />}
      {isPractice ? 'Practice — unverified' : 'Account record'}
    </span>
  )
}

/**
 * The standing banner shown at the top of a screen whose figures are mostly local practice.
 *
 * It renders for *every* state, because local XP is local even when an account exists. The
 * difference is what the message says: without an account the figures are all there is, while for
 * an approved account they sit beside a separate account record and must not be confused with it.
 * Returning null for approved users — the earlier behaviour — left a bare "0 XP" on screen that
 * read as a record.
 */
export function PracticeStandingNotice({ className = '' }: { className?: string }) {
  const { userState } = useSession()
  const hasRecord = standingFor(userState) === 'record'

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        hasRecord ? 'border-[var(--line-normal)] bg-[var(--panel-inset)]' : 'border-[var(--line-normal)] bg-[var(--panel-inset)]'
      } ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
        <p className="min-w-0 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
          {hasRecord ? (
            <>
              <span className="font-semibold text-[var(--ink-secondary)]">These figures are practice, kept in this browser.</span>{' '}
              Your account record is separate and is shown on the dashboard — the platform has not
              issued verified XP yet, so it does not appear here.
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--ink-secondary)]">Everything on this screen is practice.</span>{' '}
              {PRACTICE_XP_NOTE}
            </>
          )}
        </p>
      </div>
      {hasRecord ? (
        <Link
          to="/app"
          className="ws-action ws-action-secondary"
        >
          See your account record
        </Link>
      ) : (
        allows(userState, 'request-account') && (
          <Link
            to="/account"
            className="ws-action ws-action-secondary"
          >
            Get an account record
          </Link>
        )
      )}
    </div>
  )
}
