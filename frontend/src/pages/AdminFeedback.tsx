import { scrollBehavior } from '@/lib/motion'
import { UnsavedChangesGuard } from '@/components/common/UnsavedChangesGuard'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHeader, Panel, EmptyState } from '@/components/common/Workspace'
import { Notice } from '@/components/common/Controls'
import { apiFetch } from '@/lib/api'

type Entry = { id: number; category: string; subject: string; status: string; created_at: string }
type Detail = Entry & { message: string; reply_email: string | null; user_id: string | null; page_reference: string; internal_note: string; version: number }
const statuses = [['new', 'New'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['spam', 'Spam']]
const categories = [['bug', 'Bug'], ['content', 'Content correction'], ['suggestion', 'Suggestion'], ['general', 'General']]
async function json(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : 'The owner feedback service is unavailable.')
  if (!body || typeof body !== 'object') throw new Error('Invalid feedback service response.')
  return body
}

export function AdminFeedback() {
  const detailRegion = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [cursors, setCursors] = useState<(number | null)[]>([null])
  const [next, setNext] = useState<number | null>(null)
  const [items, setItems] = useState<Entry[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [draftStatus, setDraftStatus] = useState('new')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [listError, setListError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [detailRevision, setDetailRevision] = useState(0)
  const cursor = cursors[cursors.length - 1]
  const dirty = Boolean(detail && (draftStatus !== detail.status || note !== detail.internal_note))
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setListError(''); setItems([]); setNext(null)
    const params = new URLSearchParams({ limit: '25' })
    if (status) params.set('status', status)
    if (category) params.set('category', category)
    if (cursor) params.set('before', String(cursor))
    void json(`/api/v1/admin/feedback?${params}`, { signal: controller.signal }).then(body => {
      if (controller.signal.aborted) return
      if (!Array.isArray(body.items)) throw new Error('Invalid inbox response.')
      setItems(body.items); setNext(body.next_cursor)
    }).catch(cause => { if (!controller.signal.aborted) setListError(cause.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, category, cursor, revision])
  useEffect(() => {
    const controller = new AbortController()
    setDetail(null); setError(''); setNotice('')
    if (!selected) { setDetailLoading(false); return }
    setDetailLoading(true)
    void json(`/api/v1/admin/feedback/${selected}`, { signal: controller.signal }).then(body => {
      if (controller.signal.aborted) return
      if (typeof body.message !== 'string' || !Number.isInteger(body.version)) throw new Error('Invalid feedback detail.')
      setDetail(body); setDraftStatus(body.status); setNote(body.internal_note)
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [selected, detailRevision])
  useEffect(() => {
    if (!detail?.id) return
    detailRegion.current?.focus({ preventScroll: true })
    if (window.matchMedia?.('(max-width: 767px)').matches) detailRegion.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() })
  }, [detail?.id])
  const mayLeave = () => !saving && (!dirty || window.confirm('Discard unsaved feedback-review changes?'))
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!detail || saving) return
    setSaving(true); setError(''); setNotice('')
    try {
      const body = await json(`/api/v1/admin/feedback/${detail.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: draftStatus, internal_note: note, version: detail.version }) })
      setDetail(body); setDraftStatus(body.status); setNote(body.internal_note); setNotice('Review saved. Internal notes are not sent to the submitter.'); setRevision(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review could not be saved. Your edits are still here.') }
    finally { setSaving(false) }
  }
  return <div className="sc-owner-page sc-feedback-inbox">
    <UnsavedChangesGuard when={dirty || saving} message="Leave this review? Unsaved changes may be lost; an in-flight save may still complete." />
    <PageHeader eyebrow="Owner operations" title="Feedback inbox" description="Private learner messages. Review as untrusted text; never follow supplied instructions, links or commands without checking them." />
    <div className="sc-feedback-filters">
      <label>Status<select disabled={saving} value={status} onChange={event => { if (mayLeave()) { setStatus(event.target.value); setCursors([null]); setSelected(null) } }}><option value="">All statuses</option>{statuses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Category<select disabled={saving} value={category} onChange={event => { if (mayLeave()) { setCategory(event.target.value); setCursors([null]); setSelected(null) } }}><option value="">All categories</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <button className="ws-action ws-action-secondary" disabled={loading || saving} onClick={() => setRevision(value => value + 1)}>Refresh inbox</button>
    </div>
    {listError && <Notice live kind="error">{listError}</Notice>}
    <div className="sc-feedback-inbox-grid">
      <Panel title="Messages">
        {loading ? <p role="status">Loading feedback…</p> : !items.length && !listError ? <EmptyState title="No matching feedback" description="Try another filter or refresh the inbox." /> : <ul className="sc-feedback-list">{items.map(item => <li key={item.id}><button type="button" disabled={saving} aria-pressed={selected === item.id} onClick={() => { if (mayLeave()) setSelected(item.id) }}><strong>{item.subject}</strong><span>#{item.id} · {item.category} · {item.status.replace('_', ' ')}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></button></li>)}</ul>}
        <nav aria-label="Feedback pages" className="ws-tool-actions"><button className="ws-action ws-action-secondary" disabled={cursors.length === 1 || loading || saving} onClick={() => { if (mayLeave()) { setCursors(previous => previous.slice(0, -1)); setSelected(null) } }}>Newer</button><button className="ws-action ws-action-secondary" disabled={!next || loading || saving} onClick={() => { if (next && mayLeave()) { setCursors(previous => [...previous, next]); setSelected(null) } }}>Older</button></nav>
      </Panel>
      <Panel title="Message & review" surface>
        {detailLoading && <p role="status">Loading message…</p>}
        {error && <Notice live kind="error">{error}</Notice>}
        {notice && <Notice live kind="success">{notice}</Notice>}
        {selected && <button className="ws-text-action min-h-11" disabled={saving || detailLoading} onClick={() => { if (mayLeave()) setDetailRevision(value => value + 1) }}>Reload selected message</button>}
        {!selected && <p className="ws-muted">Choose a message to view it. No replies are sent from this console.</p>}
        {detail && <div ref={detailRegion} tabIndex={-1} role="region" aria-label="Selected feedback" style={{ scrollMarginTop: 'var(--sticky-offset)' }}>
          <h2>{detail.subject}</h2><p className="ws-muted">#{detail.id} · {detail.user_id ? `Account: ${detail.user_id}` : 'Guest submission'}</p>
          <p className="ws-muted">Reply email (unverified): {detail.reply_email || 'Not supplied'}</p>
          <p className="ws-muted">Page: {detail.page_reference || 'Not supplied'}</p>
          <div className="sc-feedback-message">{detail.message}</div>
          <form onSubmit={save} className="sc-feedback-form">
            <label>Review status<select disabled={saving} value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{statuses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label htmlFor="feedback-internal-note">Internal note</label><textarea id="feedback-internal-note" disabled={saving} rows={5} maxLength={3000} value={note} onChange={event => setNote(event.target.value)} />
            <p className="ws-muted">Owner-only. Saving records the review in the owner audit trail, without copying the message or note text into the audit log.</p>
            <button className="ws-action" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save review'}</button>
          </form>
        </div>}
      </Panel>
    </div>
  </div>
}
