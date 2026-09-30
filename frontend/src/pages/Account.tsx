import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Compass, KeyRound, LoaderCircle, LockKeyhole, Mail, RefreshCw, ShieldCheck, Sparkles, UserRound, WifiOff } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { accountRedirect, supabase, supabaseConfigured } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { ACCOUNT_ADDS_NOTE, isSignedIn, STATE_META } from '@/lib/access'
import { currentCurriculumLabel } from '@/lib/contentAccess'
import { StateChip } from '@/components/account/StateChip'

interface PublicConfig {
  auth_configured: boolean
  signup_enabled: boolean
  email_verification_required?: boolean
}

function AccountFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-[#07101e] shadow-[0_24px_90px_rgba(0,0,0,.35)] md:grid-cols-[.85fr_1.15fr]">
        <aside className="hidden flex-col justify-between border-r border-slate-800 bg-[radial-gradient(ellipse_at_10%_0%,rgba(34,211,238,.12),transparent_55%),#050b17] p-8 md:flex">
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
              <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            </span>
            <div className="mt-5 text-xl font-bold text-white">
              Sec<span className="text-cyan-300">Craft</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">Learn and practise as a guest. An account is an optional addition, not a requirement.</p>
          </div>
          <div className="text-xs leading-5 text-slate-500">
            New accounts verify their email and then wait for owner approval before any account-backed feature is enabled.
            Nothing about that changes the learning material.
          </div>
        </aside>
        <section className="p-6 sm:p-9">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to SecCraft
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{title}</h1>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  )
}

function ServiceUnavailable({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/90">
      {children}
    </div>
  )
}

function FormAlert({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' | 'info' }) {
  const styles =
    kind === 'error'
      ? 'border-rose-300/20 bg-rose-300/[0.06] text-rose-100'
      : kind === 'success'
      ? 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100'
      : 'border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100'
  const Icon = kind === 'error' ? CircleAlert : kind === 'success' ? CheckCircle2 : Compass
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-5 ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </div>
  )
}

function SubmitButton({ children, busy, disabled = false }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={busy || disabled}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
    >
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

/** The one thing a person in any state needs: what can I do right now? */
function NextActions() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">What still works</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {[
          { to: '/app', label: 'Guest workspace' },
          { to: '/paths', label: 'Learning paths' },
          { to: '/labs', label: 'Labs' },
          { to: '/challenges', label: 'Challenges' },
          { to: '/sync', label: 'Export your progress' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex min-h-8 items-center rounded-lg border border-slate-700 px-2.5 text-[11.5px] text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">{ACCOUNT_ADDS_NOTE}</p>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { refreshAccount } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!supabase) {
      setError('Account services are not configured in this build. You can continue learning as a guest.')
      return
    }
    setBusy(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError
      await refreshAccount()
      navigate('/account')
    } catch {
      setError('Sign-in did not complete. That usually means the details are wrong, the email is not verified yet, or the account service is unavailable. Guest learning stays available in the meantime.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountFrame eyebrow="Account access" title="Sign in to SecCraft">
      <p className="mb-5 text-sm leading-6 text-slate-400">
        Guest learning is complete on its own. Sign in only if you already have an account.
      </p>
      {!supabaseConfigured && (
        <ServiceUnavailable>
          Account services are not configured for this build. The guest workspace and all static learning content remain
          available.
        </ServiceUnavailable>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          Email address
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="Your password"
            />
          </span>
        </label>
        <div className="text-right">
          <Link to="/reset-password" className="text-xs text-cyan-200 hover:text-cyan-100">
            Forgot password?
          </Link>
        </div>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        Need access?{' '}
        <Link to="/signup" className="font-semibold text-cyan-200 hover:text-cyan-100">
          Request an account
        </Link>
      </p>
    </AccountFrame>
  )
}

export function SignupPage() {
  const navigate = useNavigate()
  const { refreshAccount } = useSession()
  const [searchParams] = useSearchParams()
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(searchParams.get('sent') === '1')

  useEffect(() => {
    let current = true
    apiFetch('/api/v1/public-config')
      .then(async response => {
        const body = await response.json().catch(() => null)
        if (!response.ok || !body || typeof body.auth_configured !== 'boolean' || typeof body.signup_enabled !== 'boolean') {
          throw new Error('Account configuration is unavailable.')
        }
        if (current) setConfig(body as PublicConfig)
      })
      .catch(() => {
        if (current) setConfigError('The account service is not reachable right now. Guest learning is unaffected.')
      })
    return () => {
      current = false
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice(false)
    if (!supabase) {
      setError('Account services are not configured in this build.')
      return
    }
    if (!config?.auth_configured) {
      setError('Account services are not fully configured. Please continue as a guest for now.')
      return
    }
    if (!config.signup_enabled) {
      setError('New account requests are currently closed by the platform owner. Guest learning is unaffected.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      const response = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof body.detail === 'string' ? body.detail : 'The account request could not be completed. Please try again shortly.')
      }
      if (body.access_token && body.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token })
        if (sessionError) throw sessionError
        await refreshAccount()
        navigate('/account')
        return
      }
      setNotice(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account request could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const closed = Boolean(config && !config.signup_enabled)
  const canSubmit = Boolean(supabaseConfigured && config?.auth_configured && config.signup_enabled && !busy)

  return (
    <AccountFrame eyebrow="Request access" title="Create your account">
      <p className="mb-5 text-sm leading-6 text-slate-400">
        First verify your email. Then the account stays pending until the platform owner approves access. Nothing about
        the learning material waits on that.
      </p>

      {configError && (
        <div className="mb-4">
          <ServiceUnavailable>{configError}</ServiceUnavailable>
        </div>
      )}
      {!supabaseConfigured && (
        <div className="mb-4">
          <ServiceUnavailable>Account services are not configured for this build. Guest learning remains available.</ServiceUnavailable>
        </div>
      )}
      {closed && (
        <div className="mb-4">
          <ServiceUnavailable>
            New account requests are currently closed by the platform owner. Everything in the guest workspace is open to
            you regardless.
          </ServiceUnavailable>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <FormAlert kind="success">
            If that address can be registered, a verification email is on its way. Open it, confirm the address, then sign
            in to see your approval status.
          </FormAlert>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          Email address
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <KeyRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="new-password"
              type="password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="At least 8 characters"
            />
          </span>
        </label>
        <label className="block text-sm text-slate-300">
          Confirm password
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <LockKeyhole className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="new-password"
              type="password"
              minLength={8}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="Re-enter your password"
            />
          </span>
        </label>
        <p className="text-xs leading-5 text-slate-500">
          By continuing you accept that an account is optional, and that progress imported from a browser is never treated
          as a verified result.
        </p>
        <SubmitButton busy={busy} disabled={!canSubmit}>
          {busy ? 'Submitting request…' : 'Send verification email'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SubmitButton>
        {!canSubmit && !configError && !closed && supabaseConfigured && (
          <p className="text-center text-xs text-slate-500">The form opens when the account service and the owner's signup setting are both ready.</p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
          Sign in
        </Link>
      </p>
    </AccountFrame>
  )
}

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!supabase) {
      setError('Account services are not configured in this build.')
      return
    }
    setBusy(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: accountRedirect('/update-password') })
      if (resetError) throw resetError
      setDone(true)
    } catch {
      // The recovery flow deliberately does not disclose whether an address is registered.
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountFrame eyebrow="Account recovery" title="Reset your password">
      <p className="mb-5 text-sm leading-6 text-slate-400">
        Enter the email used for your account. If recovery is available for it, instructions will arrive.
      </p>
      {done && (
        <div className="mb-4">
          <FormAlert kind="success">If an account matches that address, recovery instructions will arrive shortly.</FormAlert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          Email address
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50">
            <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          Send recovery email
        </SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
          Back to sign in
        </Link>
      </p>
    </AccountFrame>
  )
}

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase) {
      setError('Account services are not configured in this build.')
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage('Password updated. Sign in with your new password.')
      await supabase.auth.signOut()
      window.setTimeout(() => navigate('/login'), 900)
    } catch {
      setError('That recovery link may have expired. Request a new password reset email and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AccountFrame eyebrow="Account recovery" title="Choose a new password">
      {message && (
        <div className="mb-4">
          <FormAlert kind="success">{message}</FormAlert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">
          New password
          <input
            autoComplete="new-password"
            type="password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Confirm password
          <input
            autoComplete="new-password"
            type="password"
            minLength={8}
            maxLength={128}
            required
            value={confirm}
            onChange={event => setConfirm(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          Update password
        </SubmitButton>
      </form>
    </AccountFrame>
  )
}

/**
 * Account status — the record of truth for a signed-in person.
 *
 * It reads the shared session rather than doing its own one-shot fetch, so a sign-in, sign-out, or an
 * approval performed by the owner is reflected immediately instead of only after a reload.
 */
export function AccountStatusPage() {
  const [params] = useSearchParams()
  const { userState, account, accountError, ready, refreshAccount, signOut, can } = useSession()
  const [checking, setChecking] = useState(false)
  const signedIn = ready && isSignedIn(userState)
  const justRegistered = params.get('sent') === '1'

  const recheck = useCallback(async () => {
    setChecking(true)
    await refreshAccount()
    setChecking(false)
  }, [refreshAccount])

  const toneBorder =
    userState === 'active' || userState === 'owner'
      ? 'border-emerald-300/20 bg-emerald-300/[0.06]'
      : userState === 'rejected' || userState === 'suspended'
      ? 'border-rose-300/20 bg-rose-300/[0.06]'
      : 'border-amber-300/20 bg-amber-300/[0.06]'

  const toneText =
    userState === 'active' || userState === 'owner'
      ? 'text-emerald-100'
      : userState === 'rejected' || userState === 'suspended'
      ? 'text-rose-100'
      : 'text-amber-100'

  const headline = !signedIn
    ? 'Check your account'
    : userState === 'owner'
    ? 'Owner access'
    : userState === 'active'
    ? 'Account active'
    : userState === 'rejected'
    ? 'Request not approved'
    : userState === 'suspended'
    ? 'Account suspended'
    : 'Approval pending'

  return (
    <AccountFrame eyebrow="Account status" title={signedIn ? headline : 'Check your account'}>
      {!ready ? (
        <div className="flex items-center gap-2 text-sm text-slate-400" role="status" aria-live="polite">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking account status…
        </div>
      ) : !signedIn ? (
        <div className="space-y-4">
          {justRegistered && (
            <FormAlert kind="success">
              A verification email has been sent if that address can be registered. Open it, confirm your email, then sign
              in to check the approval status.
            </FormAlert>
          )}
          {accountError.kind !== 'none' && <ServiceUnavailable>{accountError.message}</ServiceUnavailable>}
          <p className="text-sm leading-6 text-slate-400">
            Sign in after confirming your email to view your account state. New accounts stay pending until the owner
            approves access — and in the meantime you keep the full Preview Curriculum.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
            >
              Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/app" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-200 transition-colors hover:bg-slate-800">
              Continue in the Preview Curriculum
            </Link>
          </div>
          <NextActions />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
          <div className={`rounded-xl border p-4 ${toneBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-semibold leading-6 ${toneText}`}>
                {userState === 'owner'
                  ? 'This account is on the server-controlled owner allowlist.'
                  : STATE_META[userState].summary}
              </p>
              <StateChip state={userState} size="sm" />
            </div>
            {account?.email && (
              <p className="mt-3 text-xs text-slate-400">
                Signed in as <span className="font-medium text-slate-200">{account.email}</span>
              </p>
            )}
            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-300">{STATE_META[userState].nextAction}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Your curriculum
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  can('full-curriculum')
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
                }`}
              >
                {currentCurriculumLabel(userState)}
              </span>
              {!can('full-curriculum') && (
                <span className="text-[11.5px] leading-relaxed text-slate-500">
                  Approval switches on the Full Curriculum and account-backed records.
                </span>
              )}
            </div>
          </div>

          {accountError.kind !== 'none' && accountError.kind !== 'unverified' && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[12.5px] leading-6 text-amber-100/90">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {accountError.message}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {userState === 'owner' && (
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Open owner console
              </Link>
            )}
            <Link
              to="/app"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            >
              Go to workspace
            </Link>
            <button
              type="button"
              onClick={() => void recheck()}
              disabled={checking}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" /> Re-check status
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-300 transition-colors hover:bg-slate-800"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>

          <NextActions />
        </motion.div>
      )}
    </AccountFrame>
  )
}
