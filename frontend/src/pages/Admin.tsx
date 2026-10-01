import { TextField } from '@/components/common/Controls'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Check, ClipboardList, LoaderCircle, RefreshCw, Save, UserX, X } from 'lucide-react'
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
  { id: 'pending', label: 'Pending' }, { id: 'active', label: 'Active' },
  { id: 'rejected', label: 'Rejected' }, { id: 'suspended', label: 'Suspended' }, { id: 'all', label: 'All' },
]
const STATUSES: AccountStatus[] = ['pending', 'active', 'rejected', 'suspended']
const PAGE_LIMIT = 200 // The existing API has a maximum of 200; it does not expose pagination or total counts.

async function apiJson(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message
    throw new Error(detail || (response.status === 403 ? 'Owner access is required.' : `The request failed (${response.status}).`))
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The owner API returned an invalid response. Check the configured API origin.')
  return body
}
function parseSettings(body: Record<string, unknown>): AdminSettings {
  if (typeof body.signup_enabled !== 'boolean' || !Number.isInteger(body.active_approved_users) || Number(body.active_approved_users) < 0 ||
    (body.approved_user_limit !== null && (!Number.isInteger(body.approved_user_limit) || Number(body.approved_user_limit) < 0))) {
    throw new Error('The account policy response is incomplete. Refresh or check the account service.')
  }
  return body as unknown as AdminSettings
}
function parseUsers(body: Record<string, unknown>): ManagedUser[] {
  if (!Array.isArray(body.users) || body.users.some((u: unknown) => !u || typeof u !== 'object' ||
    typeof (u as ManagedUser).user_id !== 'string' || !STATUSES.includes((u as ManagedUser).account_status))) {
    throw new Error('The account list response is incomplete. Refresh or check the account service.')
  }
  return body.users as ManagedUser[]
}
function parseAudit(body: Record<string, unknown>): AuditEvent[] {
  if (!Array.isArray(body.events)) throw new Error('The audit response is incomplete. Refresh or check the account service.')
  return body.events as AuditEvent[]
}
function dateLabel(value: string | null): string {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString()
}
function timestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString()
}

export function AdminPage() {
  const [accountQuery, setAccountQuery] = useState('')
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const visibleUsers = users.filter(user => [user.email, user.display_name, user.user_id].some(value => value?.toLowerCase().includes(accountQuery.trim().toLowerCase())))
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [filter, setFilter] = useState<'all' | AccountStatus>('pending')
  const [signupDraft, setSignupDraft] = useState(false)
  const [limit, setLimit] = useState('')
  const [reload, setReload] = useState(0)
  const [usersLoading, setUsersLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [auditLoading, setAuditLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [auditError, setAuditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ userId: string; status: AccountStatus } | null>(null)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const preserveDraft = useRef(false)
  const dirty = settings !== null && (signupDraft !== settings.signup_enabled || limit.trim() !== (settings.approved_user_limit == null ? '' : String(settings.approved_user_limit)))

  useEffect(() => {
    const controller = new AbortController()
    // Never leave rows from another filter visible while a new request is in flight or has failed.
    const timer = window.setTimeout(() => {
      setUsers([]); setUsersLoading(true); setUsersError('')
      void apiJson(`/api/v1/admin/users?${filter === 'all' ? '' : `status=${filter}&`}limit=${PAGE_LIMIT}`, { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) setUsers(parseUsers(result)) })
        .catch(cause => { if (!controller.signal.aborted) setUsersError(cause instanceof Error ? cause.message : 'Accounts could not be loaded.') })
        .finally(() => { if (!controller.signal.aborted) setUsersLoading(false) })
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [filter, reload])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSettingsLoading(true); setSettingsError(''); setAuditLoading(true); setAuditError('')
      void apiJson('/api/v1/admin/settings', { signal: controller.signal })
        .then(result => {
          if (controller.signal.aborted) return
          const next = parseSettings(result)
          setSettings(next)
          if (!preserveDraft.current) { setSignupDraft(next.signup_enabled); setLimit(next.approved_user_limit == null ? '' : String(next.approved_user_limit)) }
        })
        .catch(cause => { if (!controller.signal.aborted) { setSettings(null); setSettingsError(cause instanceof Error ? cause.message : 'Policy could not be loaded.') } })
        .finally(() => { if (!controller.signal.aborted) setSettingsLoading(false) })
      void apiJson('/api/v1/admin/audit?limit=50', { signal: controller.signal })
        .then(result => { if (!controller.signal.aborted) setAudit(parseAudit(result)) })
        .catch(cause => { if (!controller.signal.aborted) { setAudit([]); setAuditError(cause instanceof Error ? cause.message : 'Audit could not be loaded.') } })
        .finally(() => { if (!controller.signal.aborted) setAuditLoading(false) })
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [reload])

  function refresh() {
    if (dirty && !window.confirm('Discard unsaved enrollment changes and refresh from the server?')) return
    preserveDraft.current = false
    setConfirmation(null); setActionError(''); setNotice('')
    setReload(value => value + 1)
  }
  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settings || saving) return
    setActionError(''); setNotice('')
    const parsedLimit = limit.trim() === '' ? null : Number(limit)
    if (parsedLimit !== null && (!Number.isSafeInteger(parsedLimit) || parsedLimit < 0)) {
      setActionError('Enter a non-negative whole-number approved-user limit, or leave it empty to keep approvals fail-closed.')
      return
    }
    setSaving(true)
    try {
      const result = parseSettings(await apiJson('/api/v1/admin/settings', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signup_enabled: signupDraft, approved_user_limit: parsedLimit }),
      }))
      setSettings(result); setSignupDraft(result.signup_enabled); setLimit(result.approved_user_limit == null ? '' : String(result.approved_user_limit))
      preserveDraft.current = false
      setNotice('Enrollment policy saved on the server.')
      setReload(value => value + 1)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Settings could not be saved.') }
    finally { setSaving(false) }
  }
  async function changeStatus(user: ManagedUser, status: AccountStatus) {
    if (pendingUserId) return
    setConfirmation(null); setActionError(''); setNotice(''); setPendingUserId(user.user_id)
    try {
      await apiJson(`/api/v1/admin/users/${encodeURIComponent(user.user_id)}/status`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account_status: status }),
      })
      setNotice(`${user.email || user.display_name || 'Account'} moved to ${status}.`)
      preserveDraft.current = dirty
      setReload(value => value + 1)
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'The account status could not be changed.') }
    finally { setPendingUserId(null) }
  }
  const capacity = useMemo(() => {
    if (!settings) return null
    const active = settings.active_approved_users
    const max = settings.approved_user_limit
    return { label: max === null ? `${active} active · limit not set` : `${active} of ${max} active`,
      percent: max === null ? 0 : max === 0 ? 100 : Math.min((active / max) * 100, 100),
      available: max !== null && active < max,
    }
  }, [settings])
  const canApprove = capacity?.available === true

  return <div className="ws-admin sc-owner-page">
    <header className="sc-owner-intro"><div><p className="sc-library-domain">SecCraft / Owner operations</p><h1>Platform administration</h1><p>Manage enrollment, review learner accounts and inspect recent owner actions. Access and capacity are enforced by the server—not by this screen.</p></div><button type="button" onClick={refresh} disabled={usersLoading || settingsLoading || auditLoading || saving || Boolean(pendingUserId)} className="ws-action ws-action-secondary"><RefreshCw size={16} aria-hidden="true" /> Refresh data</button></header>
    {(actionError || notice) && <div role={actionError ? 'alert' : 'status'} className={`sc-owner-feedback ${actionError ? 'is-error' : 'is-success'}`}>{actionError || notice}</div>}

    <section className="sc-owner-overview" aria-labelledby="owner-overview"><h2 id="owner-overview">Owner overview</h2><div className="sc-owner-overview-grid">
      <div><span>Pending approvals</span><strong>{usersLoading || usersError ? 'Unavailable' : filter === 'pending' || filter === 'all' ? `${users.filter(user => user.account_status === 'pending').length}${users.length === PAGE_LIMIT ? '+' : ''}` : 'Switch to Pending'}</strong><small>Current {filter} list only; not a platform-wide total.</small></div>
      <div><span>Active learners</span><strong>{settingsLoading || settingsError || !settings ? 'Unavailable' : settings.active_approved_users}</strong><small>Server-reported approved non-owner accounts.</small></div>
      <div><span>Recent owner events</span><strong>{auditLoading || auditError ? 'Unavailable' : audit.length}</strong><small>Up to 50 recent events, not a complete audit export.</small></div>
    </div></section>
    <section className="sc-owner-capacity" aria-labelledby="capacity-heading"><div className="sc-owner-section-head"><div><h2 id="capacity-heading">Enrollment capacity</h2><p>Approved non-owner accounts only. Pending, rejected, suspended and owner-allowlisted accounts are excluded.</p></div></div>
      {settingsError ? <p role="alert" className="sc-owner-error">{settingsError} <button type="button" onClick={refresh}>Retry</button></p> : settingsLoading || !settings || !capacity ? <p role="status">Loading enrollment policy…</p> : <div className="sc-capacity-grid"><div><strong>{capacity.label}</strong><p>{capacity.available ? 'Space available for another approval.' : 'Approvals currently fail closed or capacity is full.'}</p></div><div>{settings.approved_user_limit !== null && settings.approved_user_limit > 0 ? <div className="ws-progress" role="progressbar" aria-label="Approved account capacity used" aria-valuemin={0} aria-valuemax={settings.approved_user_limit} aria-valuenow={Math.min(settings.active_approved_users, settings.approved_user_limit)}><span style={{ width: `${capacity.percent}%` }} /></div> : null}<small>{settings.approved_user_limit === null ? 'Set a limit to enable approvals.' : settings.approved_user_limit === 0 ? 'Zero approved-account places configured.' : 'Capacity is rechecked by the server for every approval.'}</small></div></div>}
    </section>

    <section className="sc-owner-policy" aria-labelledby="policy-heading"><div className="sc-owner-section-head"><div><h2 id="policy-heading">Enrollment policy</h2><p>Changes are not applied until you save. The API checks signup before forwarding it; the identity provider is independently reachable.</p></div></div>
      {settingsError ? <p className="sc-owner-error">Policy is unavailable until the account service responds.</p> : settingsLoading || !settings ? <p role="status">Loading policy controls…</p> : <form onSubmit={saveSettings} className="sc-owner-form">
        <label className="sc-owner-toggle"><span><strong>Allow new account requests</strong><small>This controls requests sent through the SecCraft API. Configure provider-side signup restrictions separately if required.</small></span><input type="checkbox" checked={signupDraft} onChange={event => setSignupDraft(event.target.checked)} /></label>
        <label className="sc-owner-limit"><strong>Approved active user limit</strong><input inputMode="numeric" type="number" min="0" step="1" value={limit} onChange={event => setLimit(event.target.value)} placeholder="No limit set — approvals disabled" /><small>Leave blank to fail closed. Zero permits no regular learner approvals.</small></label>
        <div className="sc-owner-form-actions"><button type="submit" className="ws-action" aria-busy={saving} disabled={saving || !dirty}>{saving ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{saving ? 'Saving…' : 'Save policy'}</button><span aria-live="polite">{dirty ? 'Unsaved changes' : 'No unsaved changes'}</span></div>
      </form>}
    </section>

    <section className="sc-owner-accounts" aria-labelledby="accounts-heading"><div className="sc-owner-section-head"><div><h2 id="accounts-heading">Learner accounts</h2><p>Only email-verified accounts appear for review. Owner-allowlisted identities are not in this list.</p></div><span>Oldest requests first · up to {PAGE_LIMIT} per filter</span></div>
      <TextField label="Search loaded accounts" hint="Searches only the accounts loaded for the selected status, not the full server directory." type="search" value={accountQuery} onChange={event => setAccountQuery(event.target.value)} />
      <div className="sc-owner-filters" role="group" aria-label="Filter accounts by status">{FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setAccountQuery(''); setConfirmation(null); setActionError(''); setUsers([]); setUsersLoading(true) }}>{item.label}</button>)}</div>
      {!canApprove && !settingsLoading && settings && <p className="sc-owner-advisory" role="status">Approvals and reactivations are unavailable until a positive limit with spare capacity is saved. The API independently checks every request.</p>}
      {usersError ? <p role="alert" className="sc-owner-error">{usersError} <button type="button" onClick={refresh}>Retry</button></p> : usersLoading ? <p role="status" className="sc-owner-loading"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Loading {filter === 'all' ? '' : `${filter} `}accounts…</p> : users.length === 0 ? <p className="sc-owner-empty">No accounts in this filter. Try another status or refresh the list.</p> : <>
        <p className="sc-owner-count" role="status">Showing {visibleUsers.length} of {users.length} loaded{users.length === PAGE_LIMIT ? ' (first 200 only; the API has no next page)'  : ''} · {filter === 'all' ? 'all statuses' : filter}</p>
        {visibleUsers.length === 0 && <p className="sc-owner-empty">No loaded accounts match. <button type="button" className="ws-text-action" onClick={() => setAccountQuery('')}>Clear search</button></p>}
        <div className="sc-owner-table" role="table" aria-label="Learner accounts"><div className="sc-owner-columns" role="row"><span role="columnheader">Account / requested</span><span role="columnheader">Status</span><span role="columnheader">Actions</span></div>
        {visibleUsers.map(user => {
          const actionPending = pendingUserId !== null
          const approveDisabled = actionPending || !canApprove
          return <div key={user.user_id} className="sc-owner-row" role="row"><div className="sc-owner-person" role="cell"><strong>{user.email || user.display_name || 'Learner account'}</strong><code>{user.user_id}</code><small>Requested {dateLabel(user.created_at)}{user.reviewed_at ? ` · reviewed ${dateLabel(user.reviewed_at)}` : ''}</small></div><div className="sc-owner-status" role="cell"><span data-status={user.account_status}>{user.account_status}</span></div><div className="sc-owner-actions" role="cell">
            {user.account_status !== 'active' && user.account_status !== 'suspended' && <button type="button" disabled={approveDisabled} aria-describedby={!canApprove ? `approval-help-${user.user_id}` : undefined} title={!canApprove ? 'Set a limit or free capacity before approving.' : undefined} onClick={() => setConfirmation({ userId: user.user_id, status: 'active' })}><Check size={15} aria-hidden="true" /> Approve</button>}
            {user.account_status === 'suspended' && <button type="button" disabled={approveDisabled} aria-describedby={!canApprove ? `approval-help-${user.user_id}` : undefined} title={!canApprove ? 'Set a limit or free capacity before reactivating.' : undefined} onClick={() => setConfirmation({ userId: user.user_id, status: 'active' })}><Check size={15} aria-hidden="true" /> Reactivate</button>}
            {user.account_status !== 'rejected' && <button type="button" disabled={actionPending} onClick={() => setConfirmation({ userId: user.user_id, status: 'rejected' })}><X size={15} aria-hidden="true" /> Reject</button>}
            {user.account_status !== 'suspended' && user.account_status !== 'rejected' && <button type="button" disabled={actionPending} onClick={() => setConfirmation({ userId: user.user_id, status: 'suspended' })}><UserX size={15} aria-hidden="true" /> Suspend</button>}
            {!canApprove && user.account_status !== 'active' && <small id={`approval-help-${user.user_id}`} className="sc-owner-disabled-reason">{settingsLoading ? 'Approval requires the policy to finish loading.' : !settings ? 'Approval is unavailable while enrollment policy cannot be checked.' : 'Approval requires a saved positive limit with spare capacity.'}</small>}
            {pendingUserId === user.user_id && <span role="status">Applying…</span>}
          </div>
          {confirmation?.userId === user.user_id && <div className="sc-owner-confirm" role="cell" aria-colspan={3}><p>Change <strong>{user.email || user.user_id}</strong> from {user.account_status} to <strong>{confirmation.status}</strong>? The server will check capacity and record this action. Browser-local practice remains available.</p><div><button type="button" onClick={() => setConfirmation(null)}>Cancel</button><button type="button" disabled={actionPending || (confirmation.status === 'active' && !canApprove)} onClick={() => void changeStatus(user, confirmation.status)}>Confirm {confirmation.status === 'active' ? user.account_status === 'suspended' ? 'reactivation' : 'approval' : confirmation.status}</button></div></div>}
          </div>
        })}</div>
      </>}
      <p className="sc-owner-footnote">This is a bounded server list, not a total account count. The server remains authoritative for every change.</p>
    </section>

    <section className="sc-owner-audit" aria-labelledby="audit-heading"><div className="sc-owner-section-head"><div><h2 id="audit-heading"><ClipboardList size={18} aria-hidden="true" /> Recent owner activity</h2><p>The latest 50 server-held events, not a complete audit export.</p></div></div>
      {auditError ? <p role="alert" className="sc-owner-error">{auditError} <button type="button" onClick={refresh}>Retry</button></p> : auditLoading ? <p role="status">Loading recent activity…</p> : audit.length === 0 ? <p className="sc-owner-empty">No owner actions recorded yet.</p> : <ol className="sc-owner-events">{audit.map(event => <li key={event.id}><div><strong>{event.action === 'account.status_changed' ? 'Account status changed' : event.action === 'settings.updated' ? 'Enrollment policy updated' : event.action === 'feedback.reviewed' ? 'Feedback reviewed' : event.action}</strong>{['account.status_changed', 'feedback.reviewed'].includes(event.action) && typeof event.details?.from === 'string' && typeof event.details?.to === 'string' && <span>{event.details.from} → {event.details.to}</span>}</div><div><span>{event.action === 'feedback.reviewed' && typeof event.details?.feedback_id === 'number' ? `Feedback #${event.details.feedback_id}` : event.target_user_id ? `Target ${event.target_user_id}` : 'Platform settings'} · Actor {event.actor_user_id}</span><time dateTime={event.created_at}>{timestamp(event.created_at)}</time></div></li>)}</ol>}
    </section>
    <p className="sc-owner-boundary"><AlertTriangle size={16} aria-hidden="true" /> Only server-allowlisted owners can operate here. This UI cannot grant owner access; learner access checks remain on the API.</p>
  </div>
}
