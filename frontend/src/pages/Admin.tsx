import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, Check, ClipboardList, LoaderCircle, RefreshCw, Save, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface AdminSettings {
  signup_enabled: boolean
  approved_user_limit: number | null
  active_approved_users: number
  admins_excluded_from_limit: boolean
}
interface PendingUser {
  user_id: string
  email: string | null
  display_name: string | null
  account_status: 'pending' | 'active' | 'rejected' | 'suspended'
  created_at: string | null
}
interface AuditEvent {
  id: number
  actor_user_id: string
  action: string
  target_user_id: string | null
  details: Record<string, unknown>
  created_at: string
}

async function apiJson(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
    throw new Error(detail || (response.status === 403 ? 'Owner access is required.' : `Request failed (${response.status}).`))
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The owner API returned an invalid response. Check the configured API origin.')
  return body
}

export function AdminPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [users, setUsers] = useState<PendingUser[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [limit, setLimit] = useState('')
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (initial = false) => {
    if (!initial) { setBusy(true); setError('') }
    try {
      const [settingsResult, usersResult, auditResult] = await Promise.all([
        apiJson('/api/v1/admin/settings'),
        apiJson('/api/v1/admin/users?status=pending&limit=200'),
        apiJson('/api/v1/admin/audit?limit=50'),
      ])
      setSettings(settingsResult as AdminSettings)
      setLimit(settingsResult.approved_user_limit == null ? '' : String(settingsResult.approved_user_limit))
      setUsers(usersResult.users as PendingUser[])
      setAudit(auditResult.events as AuditEvent[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The owner console could not be loaded.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(true) }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const parsedLimit = limit.trim() === '' ? null : Number(limit)
    if (parsedLimit !== null && (!Number.isSafeInteger(parsedLimit) || parsedLimit < 0)) {
      setSaving(false)
      setError('Enter a non-negative whole-number approved-user limit, or leave it empty to keep approvals fail-closed.')
      return
    }
    try {
      const result = await apiJson('/api/v1/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signup_enabled: settings?.signup_enabled ?? false, approved_user_limit: parsedLimit }),
      })
      setSettings(result as AdminSettings)
      setNotice('Owner-controlled settings saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Settings could not be saved.')
    } finally { setSaving(false) }
  }

  async function changeStatus(user: PendingUser, status: 'active' | 'rejected' | 'suspended') {
    setError('')
    setNotice('')
    try {
      await apiJson(`/api/v1/admin/users/${encodeURIComponent(user.user_id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account_status: status }),
      })
      setNotice(`Account status changed to ${status}.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account status could not be changed.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Owner-only</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Platform administration</h1><p className="mt-2 text-sm text-slate-400">Account approvals, enrollment controls, and an auditable owner action log.</p></div>
        <button onClick={() => void load()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}<div className="ml-auto"><Link to="/account" className="underline">View account status</Link></div></div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-sm text-emerald-100">{notice}</div>}

      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10"><ShieldCheck className="h-5 w-5 text-cyan-200" /></span><div><h2 className="font-semibold text-white">Enrollment policy</h2><p className="text-xs text-slate-500">Changes apply on the server</p></div></div>
          {settings ? <form onSubmit={saveSettings} className="mt-5 space-y-5">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span><span className="block text-sm font-medium text-slate-200">Allow new account requests</span><span className="block text-xs text-slate-500">The API checks this before forwarding signup to Supabase Auth.</span></span>
              <input type="checkbox" checked={settings.signup_enabled} onChange={event => setSettings({ ...settings, signup_enabled: event.target.checked })} className="h-5 w-5 accent-cyan-300" />
            </label>
            <label className="block text-sm text-slate-300">Approved active user limit<input inputMode="numeric" pattern="[0-9]*" value={limit} onChange={event => setLimit(event.target.value)} placeholder="Not configured — approvals disabled" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none placeholder:text-xs placeholder:text-slate-600 focus:border-cyan-300/50" /><span className="mt-1 block text-xs leading-5 text-slate-500">Counts active, non-admin accounts only. Suspended accounts do not count. Leave blank to fail closed.</span></label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"><span className="text-slate-400">Active approved accounts</span><span className="font-mono font-semibold text-slate-100">{settings.active_approved_users}{settings.approved_user_limit == null ? ' / limit not set' : ` / ${settings.approved_user_limit}`}</span></div>
            <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save enrollment settings'}</button>
          </form> : <div className="mt-5 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading owner settings…</div>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10"><UserCheck className="h-5 w-5 text-violet-200" /></span><div><h2 className="font-semibold text-white">Pending account requests</h2><p className="text-xs text-slate-500">Email verification happens before the account can be reviewed.</p></div></div>
          <div className="mt-5 space-y-3">
            {busy && !settings ? <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading requests…</div> : users.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">No pending requests are waiting for review.</div> : users.map(user => (
              <article key={user.user_id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-100">{user.email || user.display_name || 'Verified SecCraft account'}</div><div className="mt-1 break-all font-mono text-[10px] text-slate-500">{user.user_id}</div><div className="mt-1 text-xs text-slate-500">Requested {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'date unavailable'}</div></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-mono text-amber-200">pending</span></div>
                <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void changeStatus(user, 'active')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-200"><Check className="h-3.5 w-3.5" /> Approve</button><button onClick={() => void changeStatus(user, 'rejected')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 text-xs text-rose-100 hover:bg-rose-300/10"><UserX className="h-3.5 w-3.5" /> Reject</button><button onClick={() => void changeStatus(user, 'suspended')} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"><UserX className="h-3.5 w-3.5" /> Suspend</button></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10"><ClipboardList className="h-5 w-5 text-amber-200" /></span><div><h2 className="font-semibold text-white">Owner audit log</h2><p className="text-xs text-slate-500">Approval and settings changes are recorded server-side.</p></div></div>
        <div className="mt-4 divide-y divide-slate-800">
          {audit.length === 0 ? <p className="py-4 text-sm text-slate-500">No owner actions recorded yet.</p> : audit.map(event => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"><span className="inline-flex items-center gap-2 text-slate-200"><Activity className="h-3.5 w-3.5 text-cyan-300" />{event.action}<span className="font-mono text-slate-500">{event.target_user_id || ''}</span></span><time className="font-mono text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</time></div>)}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p>Only Supabase Auth UUIDs listed in <code>platform_admins</code> can open this console. User profiles have no role selector, and this page does not grant admin access to anyone.</p></div>
    </div>
  )
}
