import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { accountRedirect, supabase, supabaseConfigured } from '@/lib/supabase'

interface PublicConfig {
  auth_configured: boolean
  signup_enabled: boolean
}

interface AccountDetails {
  email: string | null
  account_status: 'pending' | 'active' | 'rejected' | 'suspended'
  is_admin: boolean
  created_at?: string | null
  reviewed_at?: string | null
}

function AccountFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-[#07101e] shadow-[0_24px_90px_rgba(0,0,0,.35)] md:grid-cols-[.85fr_1.15fr]">
        <aside className="hidden flex-col justify-between border-r border-slate-800 bg-[radial-gradient(ellipse_at_10%_0%,rgba(34,211,238,.12),transparent_55%),#050b17] p-8 md:flex">
          <div><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10"><ShieldCheck className="h-5 w-5 text-cyan-200" /></span><div className="mt-5 text-xl font-bold text-white">Sec<span className="text-cyan-300">Craft</span></div><p className="mt-3 text-sm leading-6 text-slate-400">Learn and practice as a guest. An account is optional for cross-device synchronization.</p></div>
          <div className="text-xs leading-5 text-slate-500">New accounts must verify their email and wait for owner approval before synchronized features are enabled.</div>
        </aside>
        <section className="p-6 sm:p-9">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"><ArrowLeft className="h-3.5 w-3.5" /> Back to SecCraft</Link>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{title}</h1>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  )
}

function ServiceUnavailable({ children }: { children: ReactNode }) {
  return <div role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/90">{children}</div>
}

function FormAlert({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-5 ${kind === 'error' ? 'border-rose-300/20 bg-rose-300/[0.06] text-rose-100' : 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100'}`}>
      {kind === 'error' ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{children}
    </div>
  )
}

function SubmitButton({ children, busy, disabled = false }: { children: ReactNode; busy: boolean; disabled?: boolean }) {
  return <button disabled={busy || disabled} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{children}</button>
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!supabase) { setError('Account services are not configured here. You can continue learning as a guest.'); return }
    setBusy(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError
      navigate('/account')
    } catch {
      setError('Sign-in could not be completed. Check your details, verify your email, or try again later.')
    } finally {
      setBusy(false)
    }
  }

  return <AccountFrame eyebrow="Account access" title="Sign in to SecCraft">
    <p className="mb-5 text-sm leading-6 text-slate-400">Guest learning remains available. Sign in only if you already have an account.</p>
    {!supabaseConfigured && <ServiceUnavailable>Account services are not configured for this build. The guest workspace and static learning content remain available.</ServiceUnavailable>}
    {error && <div className="mb-4"><FormAlert>{error}</FormAlert></div>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-slate-300">Email address<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><Mail className="h-4 w-4 text-slate-500" /><input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="you@example.com" /></span></label>
      <label className="block text-sm text-slate-300">Password<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><KeyRound className="h-4 w-4 text-slate-500" /><input autoComplete="current-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Your password" /></span></label>
      <div className="text-right"><Link to="/reset-password" className="text-xs text-cyan-200 hover:text-cyan-100">Forgot password?</Link></div>
      <SubmitButton busy={busy} disabled={!supabaseConfigured}>Sign in <ArrowRight className="h-4 w-4" /></SubmitButton>
    </form>
    <p className="mt-5 text-center text-sm text-slate-400">Need access? <Link to="/signup" className="font-semibold text-cyan-200 hover:text-cyan-100">Request an account</Link></p>
  </AccountFrame>
}

export function SignupPage() {
  const navigate = useNavigate()
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
    apiFetch('/api/v1/public-config').then(async response => {
      const body = await response.json().catch(() => null)
      if (!response.ok || !body || typeof body.auth_configured !== 'boolean' || typeof body.signup_enabled !== 'boolean') {
        throw new Error('Account configuration is unavailable.')
      }
      if (current) setConfig(body as PublicConfig)
    }).catch(() => { if (current) setConfigError('Account services are not reachable. Guest learning is still available.') })
    return () => { current = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice(false)
    if (!supabase) { setError('Account services are not configured for this build.'); return }
    if (!config?.auth_configured) { setError('Account services are not fully configured. Please continue as a guest for now.'); return }
    if (!config.signup_enabled) { setError('New account requests are currently closed. You can continue learning as a guest.'); return }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return }

    setBusy(true)
    try {
      const response = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Account request could not be completed.')
      if (body.access_token && body.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token })
        if (sessionError) throw sessionError
        navigate('/account')
        return
      }
      setNotice(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account request could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = Boolean(supabaseConfigured && config?.auth_configured && config.signup_enabled && !busy)

  return <AccountFrame eyebrow="Request access" title="Create your account">
    <p className="mb-5 text-sm leading-6 text-slate-400">First verify your email. Then your account remains pending until the platform owner approves access.</p>
    {configError && <div className="mb-4"><ServiceUnavailable>{configError}</ServiceUnavailable></div>}
    {!supabaseConfigured && <div className="mb-4"><ServiceUnavailable>Account services are not configured for this build. Guest learning remains available.</ServiceUnavailable></div>}
    {config && !config.signup_enabled && <div className="mb-4"><ServiceUnavailable>New account requests are currently closed by the platform owner.</ServiceUnavailable></div>}
    {error && <div className="mb-4"><FormAlert>{error}</FormAlert></div>}
    {notice && <div className="mb-4"><FormAlert kind="success">If this address can be registered, a verification email will arrive shortly. Verify it, then sign in to view your approval status.</FormAlert></div>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-slate-300">Email address<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><Mail className="h-4 w-4 text-slate-500" /><input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="you@example.com" /></span></label>
      <label className="block text-sm text-slate-300">Password<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><KeyRound className="h-4 w-4 text-slate-500" /><input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="At least 8 characters" /></span></label>
      <label className="block text-sm text-slate-300">Confirm password<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><LockKeyhole className="h-4 w-4 text-slate-500" /><input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Re-enter your password" /></span></label>
      <p className="text-xs leading-5 text-slate-500">By continuing, you understand that an account is optional and that imported browser progress is not server-verified.</p>
      <SubmitButton busy={busy} disabled={!canSubmit}>{busy ? 'Submitting request…' : 'Send verification email'} <ArrowRight className="h-4 w-4" /></SubmitButton>
      {!canSubmit && !configError && supabaseConfigured && <p className="text-center text-xs text-slate-500">The form becomes available when the API and owner-controlled signup setting are ready.</p>}
    </form>
    <p className="mt-5 text-center text-sm text-slate-400">Already registered? <Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Sign in</Link></p>
  </AccountFrame>
}

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!supabase) { setError('Account services are not configured for this build.'); return }
    setBusy(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: accountRedirect('/update-password') })
      if (resetError) throw resetError
      setDone(true)
    } catch {
      // Supabase's recovery flow is configured to avoid disclosing whether an email is registered.
      setDone(true)
    } finally { setBusy(false) }
  }

  return <AccountFrame eyebrow="Account recovery" title="Reset your password">
    <p className="mb-5 text-sm leading-6 text-slate-400">Enter the email used for your account. If recovery is available, instructions will be sent.</p>
    {done && <div className="mb-4"><FormAlert kind="success">If an account matches that address, recovery instructions will arrive shortly.</FormAlert></div>}
    {error && <div className="mb-4"><FormAlert>{error}</FormAlert></div>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-slate-300">Email address<span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-300/50"><Mail className="h-4 w-4 text-slate-500" /><input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="you@example.com" /></span></label>
      <SubmitButton busy={busy} disabled={!supabaseConfigured}>Send recovery email</SubmitButton>
    </form>
    <p className="mt-5 text-center text-sm text-slate-400"><Link to="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">Back to sign in</Link></p>
  </AccountFrame>
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
    if (!supabase) { setError('Account services are not configured for this build.'); return }
    if (password !== confirm) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage('Password updated. Sign in with your new password.')
      await supabase.auth.signOut()
      window.setTimeout(() => navigate('/login'), 900)
    } catch {
      setError('The recovery link may be expired. Request a new password reset email and try again.')
    } finally { setBusy(false) }
  }

  return <AccountFrame eyebrow="Account recovery" title="Choose a new password">
    {message && <div className="mb-4"><FormAlert kind="success">{message}</FormAlert></div>}
    {error && <div className="mb-4"><FormAlert>{error}</FormAlert></div>}
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-slate-300">New password<input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-300/50" /></label>
      <label className="block text-sm text-slate-300">Confirm password<input autoComplete="new-password" type="password" minLength={8} maxLength={128} required value={confirm} onChange={event => setConfirm(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-300/50" /></label>
      <SubmitButton busy={busy} disabled={!supabaseConfigured}>Update password</SubmitButton>
    </form>
  </AccountFrame>
}

export function AccountStatusPage() {
  const [params] = useSearchParams()
  const [account, setAccount] = useState<AccountDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedOut, setSignedOut] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!supabase) { if (mounted) { setError('Account services are not configured for this build.'); setLoading(false) } return }
      try {
        let sessionTimer: ReturnType<typeof window.setTimeout> | undefined
        let sessionData: Awaited<ReturnType<typeof supabase.auth.getSession>>
        try {
          sessionData = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) => {
              sessionTimer = window.setTimeout(() => reject(new Error('Sign-in session lookup timed out.')), 1_500)
            }),
          ])
        } finally {
          if (sessionTimer !== undefined) window.clearTimeout(sessionTimer)
        }
        if (sessionData.error) throw sessionData.error
        if (!sessionData.data.session) { if (mounted) setLoading(false); return }
        const response = await apiFetch('/api/v1/account')
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : body.detail?.code === 'email_not_verified' ? 'Verify your email before checking account status.' : 'Account status could not be loaded.')
        if (!body || typeof body.account_status !== 'string' || typeof body.is_admin !== 'boolean') throw new Error('The account API returned an invalid response. Account services may not be configured for this site.')
        if (mounted) setAccount(body as AccountDetails)
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Account status could not be loaded.')
      } finally { if (mounted) setLoading(false) }
    }
    void load()
    return () => { mounted = false }
  }, [])

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSignedOut(true)
    setAccount(null)
  }

  const justRegistered = params.get('sent') === '1'
  const title = signedOut ? 'Signed out' : account?.is_admin ? 'Owner access' : account?.account_status === 'active' ? 'Account active' : account?.account_status === 'rejected' ? 'Request not approved' : account?.account_status === 'suspended' ? 'Account suspended' : account?.account_status === 'pending' ? 'Approval pending' : 'Check your account'

  return <AccountFrame eyebrow="Account status" title={title}>
    {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking account status…</div> : error ? <ServiceUnavailable>{error} Guest learning is still available.</ServiceUnavailable> : account ? (
      <div className="space-y-4">
        <div className={`rounded-xl border p-4 ${account.account_status === 'active' || account.is_admin ? 'border-emerald-300/20 bg-emerald-300/[0.06]' : 'border-amber-300/20 bg-amber-300/[0.06]'}`}>
          <p className="text-sm leading-6 text-slate-200">{account.is_admin ? 'This account is on the server-controlled owner allowlist.' : account.account_status === 'active' ? 'Your email is verified and the owner has approved your account. Synchronized features are available.' : account.account_status === 'pending' ? 'Your account is waiting for owner review. You can continue using the public learning content as a guest.' : account.account_status === 'rejected' ? 'This access request was not approved. Public guest learning remains available.' : 'This account is suspended. Public guest learning remains available.'}</p>
          {account.email && <p className="mt-3 text-xs text-slate-400">Signed in as <span className="font-medium text-slate-200">{account.email}</span></p>}
        </div>
        {account.is_admin && <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200"><UserRound className="h-4 w-4" /> Open owner console <ArrowRight className="h-4 w-4" /></Link>}
        <div className="flex flex-wrap gap-3"><Link to="/app" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-200 hover:bg-slate-800">Go to workspace</Link><button onClick={signOut} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-800">Sign out</button></div>
      </div>
    ) : justRegistered ? (
      <div className="space-y-4"><FormAlert kind="success">A verification email has been sent if the address can be registered. Open it, confirm your email, then sign in to check the approval status.</FormAlert><Link to="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950">Continue to sign in <ArrowRight className="h-4 w-4" /></Link></div>
    ) : signedOut ? <FormAlert kind="success">You are signed out. Guest learning remains available without an account.</FormAlert> : (
      <div className="space-y-4"><p className="text-sm leading-6 text-slate-400">Sign in after confirming your email to view your account state. New accounts remain pending until the owner approves access.</p><Link to="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950">Sign in <ArrowRight className="h-4 w-4" /></Link></div>
    )}
  </AccountFrame>
}
