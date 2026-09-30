import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Check, ClipboardList, LoaderCircle, RefreshCw, Save, ShieldCheck, UserCheck, UserX, Users, Gauge, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { AccountStatus } from '@/lib/access'

interface AdminSettings {
  signup_enabled: boolean
  approved_user_limit: number | null
  active_approved_users: number
  admins_excluded_from_limit: boolean
}
interface ManagedUser {
  user_id: string
  email: string | null
  display_name: string | null
  account_status: AccountStatus
  created_at: string | null
  reviewed_at: string | null
}
interface AuditEvent {
  id: number
  actor_user_id: string
  action: string
  target_user_id: string | null
  details: Record<string, unknown>
  created_at: string
}

const FILTERS: { id: 'all' | AccountStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'all', label: 'All' },
]

const STATUS_TONE: Record<AccountStatus, string> = {
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-200',
  active: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
  rejected: 'border-rose-300/20 bg-rose-300/10 text-rose-200',
  suspended: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
}

async function apiJson(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
    throw new Error(detail || (response.status === 403 ? 'Owner access is required.' : `The request failed (${response.status}).`))
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('The owner API returned an invalid response. Check the configured API origin.')
  }
  return body
}

export function AdminPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [filter, setFilter] = useState<'all' | AccountStatus>('pending')
  const [limit, setLimit] = useState('')
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(
    async (initial = false) => {
      if (!initial) {
        setBusy(true)
        setError('')
      }
      try {
        const usersQuery = filter === 'all' ? '' : `?status=${filter}&limit=200`
        const [settingsResult, usersResult, auditResult] = await Promise.all([
          apiJson('/api/v1/admin/settings'),
          apiJson(`/api/v1/admin/users${usersQuery}`),
          apiJson('/api/v1/admin/audit?limit=50'),
        ])
        setSettings(settingsResult as AdminSettings)
        setLimit(settingsResult.approved_user_limit == null ? '' : String(settingsResult.approved_user_limit))
        setUsers(usersResult.users as ManagedUser[])
        setAudit(auditResult.events as AuditEvent[])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The owner console could not be loaded.')
      } finally {
        setBusy(false)
      }
    },
    [filter],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(true)
    }, 0)
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
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(user: ManagedUser, status: AccountStatus) {
    setError('')
    setNotice('')
    setPendingUserId(user.user_id)
    try {
      await apiJson(`/api/v1/admin/users/${encodeURIComponent(user.user_id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account_status: status }),
      })
      setNotice(`Account moved to “${status}”.`)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account status could not be changed.')
    } finally {
      setPendingUserId(null)
    }
  }

  const capacity = useMemo(() => {
    if (!settings) return null
    const active = settings.active_approved_users
    if (settings.approved_user_limit == null) return { label: 'Fail-closed — no limit set', percent: 0, tone: 'text-amber-300' }
    const percent = settings.approved_user_limit === 0 ? 100 : Math.min((active / settings.approved_user_limit) * 100, 100)
    return {
      label: `${active} of ${settings.approved_user_limit} active`,
      percent,
      tone: active >= settings.approved_user_limit ? 'text-amber-300' : 'text-emerald-300',
    }
  }, [settings])

  return (
    <div className="space-y-6">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-violet-300">Owner-only</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Platform administration</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Account approvals, enrollment capacity, and an auditable record of every owner action. This console is separate
            from the learner application and grants nothing on its own.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </motion.header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm leading-6 text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      {/* Capacity summary — real numbers from the server, not client-side counting. */}
      {settings && capacity && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-slate-800 bg-[#081120] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Gauge className="h-4 w-4 text-violet-300" aria-hidden="true" />
              <h2 className="text-[14px] font-semibold text-white">Approved-user capacity</h2>
            </div>
            <span className={`font-mono text-sm font-semibold ${capacity.tone}`}>{capacity.label}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${capacity.percent}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${settings.approved_user_limit == null || settings.active_approved_users >= (settings.approved_user_limit ?? 0) ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`}
            />
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500">
            Counts active non-admin accounts only. Suspended, rejected, and pending accounts do not consume capacity, and
            owner-allowlisted accounts are excluded. Approvals are refused — not queued — when the limit is unset or full.
          </p>
        </motion.section>
      )}

      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
              <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Enrollment policy</h2>
              <p className="text-xs text-slate-500">Applied on the server, effective immediately</p>
            </div>
          </div>

          {settings ? (
            <form onSubmit={saveSettings} className="mt-5 space-y-5">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span>
                  <span className="block text-sm font-medium text-slate-200">Allow new account requests</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Checked by the API before any signup is forwarded. The identity provider remains independently
                    reachable — see the deployment notes.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.signup_enabled}
                  onChange={event => setSettings({ ...settings, signup_enabled: event.target.checked })}
                  className="h-5 w-5 shrink-0 accent-cyan-300"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Approved active user limit
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={limit}
                  onChange={event => setLimit(event.target.value)}
                  placeholder="Not configured — approvals disabled"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none placeholder:text-xs placeholder:text-slate-600 focus:border-cyan-300/50"
                />
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Leave blank to fail closed. A limit of 0 means no regular learner account can be activated.
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save enrollment settings'}
              </button>
            </form>
          ) : (
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-400" role="status" aria-live="polite">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading owner settings…
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10">
              <UserCheck className="h-5 w-5 text-violet-200" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Learner accounts</h2>
              <p className="text-xs text-slate-500">Email verification happens before an account can be reviewed.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter accounts by status">
            {FILTERS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`min-h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  filter === item.id ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {busy && !settings ? (
              <div className="flex items-center gap-2 text-sm text-slate-400" role="status" aria-live="polite">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading accounts…
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                <Users className="mx-auto h-5 w-5 text-slate-600" aria-hidden="true" />
                <p className="mt-2 text-sm text-slate-400">No accounts in this state.</p>
                <p className="mt-1 text-xs text-slate-500">Try a different filter above.</p>
              </div>
            ) : (
              users.map(user => {
                const busyRow = pendingUserId === user.user_id
                return (
                  <article key={user.user_id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">
                          {user.email || user.display_name || 'Verified SecCraft account'}
                        </div>
                        <div className="mt-1 break-all font-mono text-[10px] text-slate-500">{user.user_id}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Requested {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'date unavailable'}
                          {user.reviewed_at ? ` • reviewed ${new Date(user.reviewed_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-mono ${STATUS_TONE[user.account_status]}`}>
                        {user.account_status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.account_status !== 'active' && (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => void changeStatus(user, 'active')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-200 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                        </button>
                      )}
                      {user.account_status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => void changeStatus(user, 'rejected')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 text-xs text-rose-100 transition-colors hover:bg-rose-300/10 disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                        </button>
                      )}
                      {user.account_status !== 'suspended' && user.account_status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => void changeStatus(user, 'suspended')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
                        >
                          <UserX className="h-3.5 w-3.5" aria-hidden="true" /> Suspend
                        </button>
                      )}
                      {user.account_status === 'suspended' && (
                        <button
                          type="button"
                          disabled={busyRow}
                          onClick={() => void changeStatus(user, 'active')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-300/15 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Reactivate
                        </button>
                      )}
                      {busyRow && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Applying…
                        </span>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
            <ClipboardList className="h-5 w-5 text-amber-200" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Owner audit log</h2>
            <p className="text-xs text-slate-500">Every approval and policy change is recorded server-side.</p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-slate-800">
          {audit.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No owner actions recorded yet.</p>
          ) : (
            audit.map(event => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <span className="inline-flex items-center gap-2 text-slate-200">
                  <Activity className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  {event.action}
                  {event.target_user_id && <span className="font-mono text-slate-500">{event.target_user_id}</span>}
                </span>
                <time className="font-mono text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</time>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p>
          Only identities listed in the server&rsquo;s owner allowlist can open this console. Learner profiles have no role
          selector, and nothing on this page grants access to anyone. Suspending an account removes account-backed features
          only — the learner keeps full guest access.
        </p>
      </div>
    </div>
  )
}
