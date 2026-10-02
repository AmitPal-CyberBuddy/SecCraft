import { PasswordFeedback } from '@/components/account/PasswordFeedback'
import { Notice } from '@/components/common/Controls'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, RefreshCw, ShieldCheck, Sparkles, UserRound, WifiOff } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { accountRedirect, supabase, supabaseConfigured } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { generatePassword, passwordGuidance } from '@/lib/passwordGuidance'
import { accessLabel, ACCOUNT_ADDS_NOTE, isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

interface PublicConfig {
  auth_configured: boolean
  signup_enabled: boolean
  email_verification_required?: boolean
}

function AccountFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="ws-account-frame mx-auto max-w-[980px] px-4 py-10 sm:px-6">
      <div className="sc-account-layout grid w-full md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">

        <section className="sc-account-form p-6 sm:p-9">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to SecCraft
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--learning)]">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)]">{title}</h1>
          <div className="mt-6">{children}</div>
        </section>
        <aside className="sc-account-context flex flex-col justify-between p-6 md:p-8">
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center text-[var(--learning)]">
              <ShieldCheck className="h-5 w-5 text-[var(--learning)]" aria-hidden="true" />
            </span>
            <div className="mt-5 text-xl font-bold text-[var(--ink-primary)]">
              Sec<span className="text-[var(--learning)]">Craft</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">Explore the catalogue as a visitor. Lessons, labs and assessments are for approved accounts.</p>
          </div>
          <div className="text-xs leading-5 text-[var(--ink-muted)]">
            Verify your email to request an account. You can explore the catalogue while you wait for approval.
          </div>
        </aside>
      </div>
    </div>
  )
}

function ServiceUnavailable({ children }: { children: ReactNode }) {
  return <Notice kind="warning" live>{children}</Notice>
}

function FormAlert({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' | 'info' }) {
  return <Notice kind={kind} live>{children}</Notice>
}

function SubmitButton({ children, busy, disabled = false }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={busy || disabled}
      aria-busy={busy}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl sc-learning-action px-4 text-sm font-bold  transition  disabled:cursor-wait disabled:opacity-60"
    >
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

/** The one thing a person in any state needs: what can I do right now? */
function NextActions() {
  return (
    <div className="rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--ink-muted)]">What still works</p>
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
            className="inline-flex min-h-8 items-center rounded-lg border border-[var(--line-normal)] px-2.5 text-[11.5px] text-[var(--ink-secondary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)]"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{ACCOUNT_ADDS_NOTE}</p>
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
      <p className="mb-5 text-sm leading-6 text-[var(--ink-secondary)]">
        The catalogue is public. Sign in if you already have an approved account.
      </p>
      {!supabaseConfigured && (
        <ServiceUnavailable>
          Sign-in is unavailable right now. You can still explore the catalogue.
        </ServiceUnavailable>
      )}
      {error && (
        <div className="mb-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-[var(--ink-secondary)]">
          Email address
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <Mail className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label className="block text-sm text-[var(--ink-secondary)]">
          Password
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <KeyRound className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="Your password"
            />
          </span>
        </label>
        <div className="text-right">
          <Link to="/reset-password" className="text-xs text-[var(--learning)] hover:text-[var(--learning)]">
            Forgot password?
          </Link>
        </div>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          {busy ? 'Signing in…' : 'Sign in'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--ink-secondary)]">
        Need access?{' '}
        <Link to="/signup" className="font-semibold text-[var(--learning)] hover:text-[var(--learning)]">
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
  const [showPassword, setShowPassword] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const guidance = useMemo(() => passwordGuidance(password, [email, email.split('@')[0]]), [password, email])
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
      <p className="mb-5 text-sm leading-6 text-[var(--ink-secondary)]">
        Verify your email to request access. You can keep exploring the catalogue while your account awaits approval.
      </p>

      {configError && supabaseConfigured && (
        <div className="mb-4">
          <ServiceUnavailable>{configError}</ServiceUnavailable>
        </div>
      )}
      {!supabaseConfigured && (
        <div className="mb-4">
          <ServiceUnavailable>Account registration is unavailable right now. You can still explore the catalogue.</ServiceUnavailable>
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
        <label className="block text-sm text-[var(--ink-secondary)]">
          Email address
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <Mail className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <label className="block text-sm text-[var(--ink-secondary)]">
          Password
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <KeyRound className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="new-password"
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              maxLength={128}
              required
              aria-describedby="signup-password-guidance"
              value={password}
              onChange={event => { setPassword(event.target.value); setCopyStatus('') }}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="At least 8 characters"
            />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)} className="shrink-0 rounded p-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-color)]">{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
          </span>
        </label>
        <div id="signup-password-guidance" className="space-y-2 text-xs text-[var(--ink-secondary)]">
          <PasswordFeedback guidance={guidance} />
          <button type="button" className="min-h-10 rounded-lg border border-[var(--accent-border)] px-3 font-semibold text-[var(--learning)] hover:bg-[var(--accent-bg)]" onClick={() => {
            try { setPassword(generatePassword()); setConfirmPassword(''); setShowPassword(true); setCopyStatus(''); setError('') }
            catch { setError('Secure password generation is unavailable in this browser. Please create a unique password yourself.') }
          }}>Suggest a strong password</button>
          {password && <button type="button" className="ml-2 min-h-10 rounded-lg border border-[var(--line-strong)] px-3 text-[var(--ink-primary)] hover:bg-[var(--panel-raised)]" onClick={async () => {
            try { await navigator.clipboard.writeText(password); setCopyStatus('Copied. Paste into your password manager and the confirmation field.') }
            catch { setCopyStatus('Copy unavailable. Select the shown password to save it yourself.') }
          }}>Copy password</button>}
          {copyStatus && <p role="status">{copyStatus}</p>}
          <p>Save the suggestion in your password manager, then re-enter it below.</p>
        </div>
        <label className="block text-sm text-[var(--ink-secondary)]">
          Confirm password
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <LockKeyhole className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="new-password"
              type="password"
              minLength={8}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="Re-enter your password"
            />
          </span>
        </label>
        <p className="text-xs leading-5 text-[var(--ink-muted)]">
          An account is optional. Imported practice progress remains unverified.
        </p>
        <SubmitButton busy={busy} disabled={!canSubmit}>
          {busy ? 'Submitting request…' : 'Send verification email'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </SubmitButton>
        {!canSubmit && !configError && !closed && supabaseConfigured && (
          <p className="text-center text-xs text-[var(--ink-muted)]">The form opens when the account service and the owner's signup setting are both ready.</p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-[var(--ink-secondary)]">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-[var(--learning)] hover:text-[var(--learning)]">
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
      <p className="mb-5 text-sm leading-6 text-[var(--ink-secondary)]">
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
        <label className="block text-sm text-[var(--ink-secondary)]">
          Email address
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <Mail className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden="true" />
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
              placeholder="you@example.com"
            />
          </span>
        </label>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          {busy ? 'Sending recovery email…' : 'Send recovery email'}
        </SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--ink-secondary)]">
        <Link to="/login" className="font-semibold text-[var(--learning)] hover:text-[var(--learning)]">
          Back to sign in
        </Link>
      </p>
    </AccountFrame>
  )
}

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const guidance = useMemo(() => passwordGuidance(password), [password])
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
        <label className="block text-sm text-[var(--ink-secondary)]">
          New password
          <span className="sc-input-shell mt-1.5 flex min-h-11 items-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 focus-within:border-[var(--accent-border)]">
            <input autoComplete="new-password" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} required
              aria-describedby="recovery-password-guidance" value={password}
              onChange={event => { setPassword(event.target.value); setCopyStatus('') }}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink-primary)] outline-none" />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)} className="rounded p-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-color)]">{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
          </span>
        </label>
        <div id="recovery-password-guidance" className="space-y-2 text-xs text-[var(--ink-secondary)]">
          <PasswordFeedback guidance={guidance} />
          <button type="button" className="min-h-10 rounded-lg border border-[var(--accent-border)] px-3 font-semibold text-[var(--learning)] hover:bg-[var(--accent-bg)]" onClick={() => {
            try { setPassword(generatePassword()); setConfirm(''); setShowPassword(true); setCopyStatus(''); setError('') }
            catch { setError('Secure password generation is unavailable in this browser. Please create a unique password yourself.') }
          }}>Suggest a strong password</button>
          {password && <button type="button" className="ml-2 min-h-10 rounded-lg border border-[var(--line-strong)] px-3 text-[var(--ink-primary)] hover:bg-[var(--panel-raised)]" onClick={async () => {
            try { await navigator.clipboard.writeText(password); setCopyStatus('Copied. Paste into your password manager and the confirmation field.') }
            catch { setCopyStatus('Copy unavailable. Select the shown password to save it yourself.') }
          }}>Copy password</button>}
          {copyStatus && <p role="status">{copyStatus}</p>}
          <p>Save a suggested password in your password manager; re-enter it below to confirm.</p>
        </div>
        <label className="block text-sm text-[var(--ink-secondary)]">
          Confirm password
          <input
            autoComplete="new-password"
            type="password"
            minLength={8}
            maxLength={128}
            required
            value={confirm}
            onChange={event => setConfirm(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] px-3 text-sm text-[var(--ink-primary)] outline-none focus:border-[var(--accent-border)]"
          />
        </label>
        <SubmitButton busy={busy} disabled={!supabaseConfigured}>
          {busy ? 'Updating password…' : 'Update password'}
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
  const { userState, account, accountError, ready, accountLoading, refreshAccount, signOut, can } = useSession()
  const [checking, setChecking] = useState(false)
  const signedIn = ready && !accountLoading && isSignedIn(userState)
  const statusUnavailable = signedIn && !account && (accountError.kind === 'unavailable' || accountError.kind === 'unknown')
  const justRegistered = params.get('sent') === '1'

  const recheck = useCallback(async () => {
    setChecking(true)
    await refreshAccount()
    setChecking(false)
  }, [refreshAccount])

  const toneBorder =
    userState === 'active' || userState === 'owner'
      ? 'border-[var(--success-border)] bg-[var(--success-bg)]'
      : userState === 'rejected' || userState === 'suspended'
      ? 'border-[var(--danger-border)] bg-[var(--danger-bg)]'
      : 'border-[var(--warning-border)] bg-[var(--warning-bg)]'

  const toneText =
    userState === 'active' || userState === 'owner'
      ? 'text-[var(--success)]'
      : userState === 'rejected' || userState === 'suspended'
      ? 'text-[var(--danger)]'
      : 'text-[var(--attention)]'

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
    <AccountFrame eyebrow="Account status" title={!ready || accountLoading ? 'Checking account status' : statusUnavailable ? 'Account status unavailable' : signedIn ? headline : 'Check your account'}>
      {!ready || accountLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]" role="status" aria-live="polite">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking account status…
        </div>
      ) : statusUnavailable ? (
        <div className="space-y-4">
          <ServiceUnavailable>{accountError.message}</ServiceUnavailable>
          <p className="text-sm text-[var(--ink-secondary)]">You are signed in, but the account service has not confirmed approval or owner access. This is not an approval decision. Preview learning and browser-local practice remain available.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void recheck()} disabled={checking} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-primary)] disabled:opacity-60">{checking ? 'Checking…' : 'Re-check status'}</button>
            <Link to="/app" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-primary)]">Go to workspace</Link>
          </div>
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
          <p className="text-sm leading-6 text-[var(--ink-secondary)]">
            Sign in after confirming your email to view your account state. New accounts stay pending until the owner
            approves access — and in the meantime you can explore the catalogue.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl sc-learning-action px-4 text-sm font-bold  transition-colors "
            >
              Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/paths" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
              Explore the catalogue
            </Link>
          </div>
          <NextActions />
        </div>
      ) : (
        <div className="space-y-4">
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
              <p className="mt-3 text-xs text-[var(--ink-secondary)]">
                Signed in as <span className="font-medium text-[var(--ink-primary)]">{account.email}</span>
              </p>
            )}
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-secondary)]">{STATE_META[userState].nextAction}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line-normal)] pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Your access
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  can('learning-content')
                    ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]'
                    : 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--learning)]'
                }`}
              >
                {accessLabel(userState)}
              </span>
              {!can('learning-content') && (
                <span className="text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                  Approval switches on lessons, labs, assessments and account-backed records.
                </span>
              )}
            </div>
          </div>

          {accountError.kind !== 'none' && accountError.kind !== 'unverified' && (
            <div className="flex items-start gap-2 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-[12.5px] leading-6 text-[var(--attention)]">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {accountError.message}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {userState === 'owner' && (
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl sc-learning-action px-4 text-sm font-bold  transition-colors "
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Open owner console
              </Link>
            )}
            <Link
              to="/app"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]"
            >
              Go to workspace
            </Link>
            <button
              type="button"
              onClick={() => void recheck()}
              disabled={checking}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" /> Re-check status
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-normal)] px-4 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)]"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>

          <NextActions />
        </div>
      )}
    </AccountFrame>
  )
}
