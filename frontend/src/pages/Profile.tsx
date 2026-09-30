import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CloudUpload, KeyRound, LogIn, LogOut, ShieldCheck, Sparkles, UserRound, Check, Info, RefreshCw, Database, Eye } from 'lucide-react'
import { useLocalProfile } from '@/components/profile/LocalProfile'
import { useSession } from '@/lib/session'
import { useServerProgress } from '@/lib/useServerProgress'
import { useProgressStore } from '@/store/useProgressStore'
import { ACCOUNT_SYNC_NOTE, isSignedIn, STATE_META } from '@/lib/access'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'
import { StateExplainer } from '@/components/account/AccountBanner'
import { AnimatedCard, FadeIn } from '@/components/animations'

function Row({ label, value, mono = false, chip }: { label: string; value: React.ReactNode; mono?: boolean; chip?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b]/50 py-2.5 last:border-b-0">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span className={`flex min-w-0 items-center gap-2 text-[12.5px] text-slate-100 ${mono ? 'font-mono' : ''}`}>
        <span className="truncate">{value}</span>
        {chip}
      </span>
    </div>
  )
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
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const streak = useProgressStore(s => s.getStreak())

  useEffect(() => setName(profile?.displayName ?? ''), [profile?.displayName])

  const localCount = useMemo(
    () => completedLessons.length + completedLabs.length + completedChallenges.length + quizScores.length,
    [completedLessons, completedLabs, completedChallenges, quizScores],
  )

  const signedIn = isSignedIn(userState)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshAccount()
    if (can('account-progress')) await server.reload()
    setRefreshing(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] min-w-0 space-y-4 xs:space-y-6">
      <FadeIn>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-violet-500/10">
                <UserRound className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="font-heading text-[22px] font-bold leading-none tracking-tight text-slate-100 xs:text-[26px] sc-page-title">Profile</h1>
                <p className="mt-1.5 text-[12.5px] text-slate-400">Who you are in SecCraft, and where your record lives.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StateChip state={userState} />
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] bg-[#0f172a] px-3 text-[12px] text-slate-300 transition-colors hover:bg-[#1e293b] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 xs:p-5">
          <StateExplainer state={userState} />
        </div>
      </FadeIn>

      {/* ── Authenticated account ───────────────────────────────────────── */}
      {signedIn ? (
        <FadeIn delay={0.08}>
          <AnimatedCard glowColor="cyan" className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
                <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Account
              </h2>
              <ProvenanceChip provenance="server" />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              Held on the platform and returned by the account service. The browser cannot change any of it.
            </p>

            <div className="mt-4">
              <Row label="Email" value={account?.email ?? 'Not provided by the provider'} />
              <Row label="Account status" value={STATE_META[userState].label} chip={<StateChip state={userState} size="sm" />} />
              <Row label="Member since" value={formatDate(account?.created_at)} />
              <Row label="Status reviewed" value={account?.reviewed_at ? formatDate(account.reviewed_at) : 'Not reviewed yet'} />
              <Row label="Account id" value={account?.user_id ? `${account.user_id.slice(0, 8)}…${account.user_id.slice(-4)}` : '—'} mono />
              <Row
                label="Account service"
                value={apiState === 'reachable' ? 'Reachable' : apiState === 'unreachable' ? 'Not reachable' : 'Checking…'}
                chip={
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${apiState === 'reachable' ? 'bg-emerald-400' : apiState === 'unreachable' ? 'bg-rose-400' : 'bg-amber-400'}`}
                    aria-hidden="true"
                  />
                }
              />
            </div>

            {accountError.kind !== 'none' && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[12px] leading-relaxed text-amber-100/90">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {accountError.message}
              </p>
            )}

            {userState === 'owner' && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.06] p-3.5">
                <Sparkles className="h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-violet-100/90">
                  This account is on the server-controlled owner allowlist.
                </p>
                <Link to="/admin" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-300 px-3 text-[12px] font-bold text-slate-950 transition-colors hover:bg-violet-200">
                  Owner console <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/account" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
                Account status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link to="/reset-password" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Change password
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-300 transition-colors hover:bg-[#1e293b] hover:text-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
              </button>
            </div>
          </AnimatedCard>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}>
          <AnimatedCard glowColor="none" className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
                <LogIn className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Platform account
              </h2>
              <ProvenanceChip provenance="local" />
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
              You are learning as a guest. Everything in the workspace is open, and your progress stays in this browser.
              An account adds an approval state and a platform-side copy of your progress — it does not unlock new material.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                'Keeps your current local record — nothing is reset when you sign in.',
                'Adds a real approval state you can check at any time.',
                'Lets you move a progress file to another device by hand.',
                'Is entirely optional, and can be discarded at any time.',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 rounded-lg border border-[#1e293b] bg-[#020617]/50 p-3 text-[12px] leading-relaxed text-slate-300">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Log in
              </Link>
              {can('request-account') && authAvailability === 'ready' && (
                <Link to="/signup" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 text-[12px] font-bold text-slate-950 transition-colors hover:bg-cyan-400">
                  Request an account <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
            {authAvailability === 'unavailable' && (
              <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                Account services are not configured in this build, so sign-in is unavailable. Guest learning is complete
                on its own.
              </p>
            )}
          </AnimatedCard>
        </FadeIn>
      )}

      {/* ── Local record ────────────────────────────────────────────────── */}
      <FadeIn delay={0.11}>
        <AnimatedCard glowColor="none" className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
              <Eye className="h-4 w-4 text-cyan-400" aria-hidden="true" /> This browser&rsquo;s record
            </h2>
            <ProvenanceChip provenance="local" />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            Progress, XP, and achievements computed in this browser from what you have completed here. Not confirmed by the
            platform, and not transferable on its own.
          </p>
          <div className="mt-4">
            <Row label="Recorded activities" value={`${localCount}`} />
            <Row label="Local XP" value={`${totalXp} XP`} chip={<ProvenanceChip provenance="derived" />} />
            <Row label="Local level" value={`${level.title} · Lv.${level.level}`} chip={<ProvenanceChip provenance="derived" />} />
            <Row label="Day streak" value={`${streak}d`} chip={<ProvenanceChip provenance="derived" />} />
          </div>
        </AnimatedCard>
      </FadeIn>

      {/* ── Guest profile — a display name, deliberately not an identity ── */}
      <FadeIn delay={0.14}>
        <AnimatedCard glowColor="none" className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
              <UserRound className="h-4 w-4 text-violet-400" aria-hidden="true" /> Guest display name
            </h2>
            {hasProfile && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">saved locally</span>}
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
            A label for this browser only. It is not an account, it is not a role, and it grants nothing — it cannot sign
            you in, reach the account service, or unlock a feature. It stays useful after you sign in, and it is never
            merged with your account identity.
          </p>

          {hasProfile ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-bold text-slate-100">{profile?.displayName}</div>
                <div className="truncate text-[11px] font-mono text-slate-400">Stored in this browser only</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setName(profile?.displayName ?? '')}
                  className="inline-flex min-h-9 items-center rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clear()
                    setName('')
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-300 transition-colors hover:bg-[#1e293b]"
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
            <label htmlFor="guest-display-name" className="sr-only">Guest display name</label>
            <input
              id="guest-display-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Display name (optional)"
              maxLength={64}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#1e293b] bg-[#020617] px-3.5 text-[13px] text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-500/40"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Save locally
            </button>
          </form>
        </AnimatedCard>
      </FadeIn>

      {/* ── Synchronization summary ─────────────────────────────────────── */}
      <FadeIn delay={0.17}>
        <AnimatedCard glowColor="none" className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
              <Database className="h-4 w-4 text-emerald-400" aria-hidden="true" /> Synchronization
            </h2>
            <Link to="/sync" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
              Open progress sync <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{ACCOUNT_SYNC_NOTE}</p>

          <div className="mt-4">
            {can('account-progress') ? (
              server.state === 'loading' ? (
                <p className="flex items-center gap-2 text-[12px] text-slate-400" role="status" aria-live="polite">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" /> Checking what the platform holds…
                </p>
              ) : server.data ? (
                <div className="rounded-xl border border-[#1e293b] bg-[#020617]/50 p-3.5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Server records', value: server.data.records.length, chip: 'server' as const },
                      { label: 'Verified', value: server.data.verified, chip: 'server' as const },
                      { label: 'Imported (unverified)', value: server.data.imported, chip: 'imported' as const },
                      { label: 'Server XP ledger', value: server.data.xp, chip: 'server' as const },
                    ].map(stat => (
                      <div key={stat.label}>
                        <div className="font-mono text-[18px] font-bold text-slate-100">{stat.value}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">{stat.label}</span>
                          <ProvenanceChip provenance={stat.chip} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">Read from the platform at {server.data.checkedAt}.</p>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[12px] leading-relaxed text-amber-100/90">{server.message}</p>
              )
            ) : (
              <p className="rounded-lg border border-[#1e293b] bg-[#020617]/50 p-3 text-[12px] leading-relaxed text-slate-400">
                Account-backed progress is not available in this state. {STATE_META[userState].summary}
              </p>
            )}
          </div>
        </AnimatedCard>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#1e293b] bg-[#020617]/50 p-4 text-center">
          <CloudUpload className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <p className="text-[12px] leading-relaxed text-slate-400">
            Changing your display name, signing in, or signing out never changes your learning record, your XP, or your
            notes. Those live in this browser and only move when you export and import a progress file.
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
