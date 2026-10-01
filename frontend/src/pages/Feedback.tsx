import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Panel } from '@/components/common/Workspace'
import { Notice, TextField } from '@/components/common/Controls'
import { apiFetch } from '@/lib/api'

const DRAFT_KEY = 'platform-feedback-draft'
const categories = [['bug', 'Bug or broken lab'], ['content', 'Content correction'], ['suggestion', 'Suggestion'], ['general', 'General feedback']] as const
function initialDraft(page: string) {
  const blank = { request_id: crypto.randomUUID(), category: 'general', subject: '', message: '', reply_email: '', page_reference: page }
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    if (saved && Object.keys(blank).every(key => typeof saved[key] === 'string') && categories.some(([id]) => id === saved.category)) return { ...blank, ...saved } as typeof blank
  } catch { /* Draft recovery is best effort; never a server receipt. */ }
  return blank
}

export function FeedbackPage() {
  const [params] = useSearchParams()
  const [draft, setDraft] = useState(() => initialDraft((params.get('page') || '').split(/[?#]/)[0].slice(0, 300)))
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState<number | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    if (reference) return
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); setStorageError(false) }
    catch { setStorageError(true) }
  }, [draft, reference])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  function edit(key: keyof typeof draft, value: string) {
    setDraft(previous => ({ ...previous, [key]: value, request_id: crypto.randomUUID() }))
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current || cooldown) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const response = await apiFetch('/api/v1/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const body = await response.json().catch(() => null)
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After'))
        setCooldown(Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60)
      }
      if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : typeof body?.detail?.message === 'string' ? body.detail.message : response.status === 422 ? 'Check the field lengths, reply email and page path before sending.' : 'Feedback could not be saved. Your message is still here; please try again.')
      if (body?.saved !== true || !Number.isSafeInteger(body.reference) || body.reference < 1) throw new Error('The service did not return a valid receipt. Keep your message and retry.')
      setReference(body.reference); setCooldown(30)
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* Do not turn a confirmed receipt into a failed submission. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Feedback is unavailable. Your message has not been cleared.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <div className="sc-feedback-page">
    <PageHeader eyebrow="Help improve SecCraft" title="Contact & feedback" description="Report a broken lab, suggest a correction or tell us what would make learning easier. Guests are welcome." />
    <Notice title="Keep sensitive information out">Do not include passwords, tokens, personal data about others or sensitive evidence. For security vulnerabilities, use <a className="ws-text-action" href="https://github.com/AmitPal-CyberBuddy/SecCraft/security/policy" target="_blank" rel="noreferrer">our private security-reporting instructions</a>, not this form.</Notice>
    {reference ? <Notice live kind="success" title={`Feedback saved · reference #${reference}`}>Your message is in the owner inbox. A reply is not guaranteed; there is no automated email or public tracking page.<div className="mt-4"><button className="ws-action ws-action-secondary" disabled={cooldown > 0} onClick={() => { setDraft({ ...initialDraft(''), request_id: crypto.randomUUID(), subject: '', message: '', reply_email: '', page_reference: '' }); setReference(null) }}>{cooldown ? `New message in ${cooldown}s` : 'Write another message'}</button></div></Notice> : <Panel surface title="Send a message">
      <form onSubmit={submit} className="sc-feedback-form">
        <fieldset disabled={busy} className="sc-feedback-fields">
          <label>Category<select value={draft.category} onChange={event => edit('category', event.target.value)}>{categories.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
          <TextField label="Subject" required minLength={3} maxLength={160} value={draft.subject} onChange={event => edit('subject', event.target.value)} />
          <label htmlFor="feedback-message">Message</label><textarea id="feedback-message" required minLength={10} maxLength={5000} rows={8} value={draft.message} onChange={event => edit('message', event.target.value)} aria-describedby="feedback-message-hint" />
          <p id="feedback-message-hint" className="ws-muted">{draft.message.length}/5000 characters. Describe what happened, what you expected and how to reproduce it.</p>
          <TextField label="Reply email (optional)" hint="Only add an address if you want the owner to be able to contact you. It is not verified by this form." type="email" autoComplete="email" maxLength={320} value={draft.reply_email} onChange={event => edit('reply_email', event.target.value)} />
          <TextField label="Page or module path (optional)" hint="For example /labs. No query strings, fragments or full external URLs." maxLength={300} value={draft.page_reference} onChange={event => edit('page_reference', event.target.value)} />
        </fieldset>
        <p className="ws-muted">Visible only to platform owners. If a verified account session is available, its ID accompanies your message. Short-lived, hashed network identifiers help limit abuse; we do not fingerprint devices. Default feedback retention is 180 days; deployment operators may configure a different period.</p>
        <p className="ws-muted">A draft is kept in this tab’s session storage until sent. {storageError ? 'Browser storage is unavailable: keep a copy before navigating away.' : 'Sending requires the backend; offline drafts are not automatically submitted.'}</p>
        {error && <Notice live kind="error">{error}</Notice>}
        {cooldown > 0 && <p className="ws-muted">Try again in {cooldown} seconds. You can still edit or copy your message.</p>}
        <button type="submit" className="ws-action" aria-busy={busy} disabled={busy || cooldown > 0}>{busy ? 'Sending…' : 'Send feedback'}</button>
      </form>
    </Panel>}
  </div>
}
