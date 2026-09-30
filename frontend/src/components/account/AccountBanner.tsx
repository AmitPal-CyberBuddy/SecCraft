import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  const { userState, accountError, signOut, ready } = useSession()
  const [dismissedFor, setDismissedFor] = useState<UserState | null>(null)

  if (!ready) return null

  const unverified = accountError.kind === 'unverified'
  const transient = accountError.kind === 'unavailable' || accountError.kind === 'unknown'
  const isAccountState = userState === 'pending' || userState === 'rejected' || userState === 'suspended'

  // Dismissal is scoped to the state that was dismissed, so a later state still gets its banner.
  const dismissed = dismissedFor === userState
  if (!unverified && !transient && !(isAccountState && !dismissed)) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      className="mb-4 min-w-0"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-[#081120]/90 p-4 sm:p-5">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
            unverified || userState === 'pending'
              ? 'from-amber-400/[0.07] via-transparent to-transparent'
              : userState === 'rejected' || userState === 'suspended'
              ? 'from-rose-400/[0.07] via-transparent to-transparent'
              : 'from-slate-500/[0.06] via-transparent to-transparent'
          }`}
        />
        <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#020617]">
              {unverified ? (
                <Fingerprint className="h-4 w-4 text-amber-300" aria-hidden="true" />
              ) : userState === 'rejected' || userState === 'suspended' ? (
                <ShieldAlert className="h-4 w-4 text-rose-300" aria-hidden="true" />
              ) : userState === 'pending' ? (
                <Clock className="h-4 w-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Info className="h-4 w-4 text-slate-300" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-[14px] font-bold text-slate-100">
                  {unverified ? 'Confirm your email address' : transient ? 'Account services unavailable' : STATE_META[userState as Exclude<UserState, 'public' | 'guest'>].label}
                </h2>
                {!transient && <StateChip state={userState} size="sm" />}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300">
                {unverified
                  ? 'Open the verification message sent to your inbox, then come back. Until then, account features stay unavailable — guest learning does not.'
                  : transient
                  ? `${accountError.message} Nothing below depends on it: the Preview Curriculum, your labs and challenges, and the progress kept in this browser all keep working.`
                  : STATE_META[userState as Exclude<UserState, 'public' | 'guest'>].summary}
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
                <Compass className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
                {allows(userState, 'full-curriculum')
                  ? 'The Full Curriculum and your account records are both available.'
                  : PREVIEW_NOTE}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {userState === 'rejected' || userState === 'suspended' ? (
              <Link
                to="/profile"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-600 bg-[#020617]/60 px-3 text-[12px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                Account details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/paths"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-[12px] font-semibold text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/15"
              >
                Keep learning <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-[12px] text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
            {!transient && (
              <button
                type="button"
                onClick={() => setDismissedFor(userState)}
                aria-label="Dismiss this account notice"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** A short, inline explanation of what a state means. Used on the account and profile screens. */
export function StateExplainer({ state, children }: { state: UserState; children?: ReactNode }) {
  const meta = STATE_META[state]
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020617]/60 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <StateChip state={state} size="sm" />
        <span className="text-[11.5px] font-medium text-slate-300">{meta.nextAction}</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{children ?? meta.summary}</p>
    </div>
  )
}

/** Positive confirmation used when an owner account reaches the learner chrome. */
export function OwnerNotice() {
  const { userState } = useSession()
  if (userState !== 'owner') return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <UserCheck className="h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />
        <p className="min-w-0 text-[12.5px] leading-relaxed text-violet-100/90">
          You are signed in as the platform owner. Learner tools and owner controls are separate — approvals and policy
          live in the owner console.
        </p>
      </div>
      <Link
        to="/admin"
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200/30 bg-violet-300/15 px-3 text-[12px] font-semibold text-violet-100 transition-colors hover:bg-violet-300/25"
      >
        Open owner console <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </motion.div>
  )
}
