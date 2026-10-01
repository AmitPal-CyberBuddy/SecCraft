import { TextField, Notice } from '@/components/common/Controls'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FileLock2, Hash, Plus, Trash2, Download, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react'

export interface EvidenceRecord {
  id: string
  label: string
  kind: 'capture' | 'config' | 'log' | 'hash' | 'note'
  claim: string
  filter: string
  frames: string
  sha256: string
  bytes: number
  createdAt: string
}

const STORE_KEY = 'platform-evidence-vault'
const LEGACY_STORE_KEY = 'wififorge-evidence-vault'

const KIND_COLORS: Record<EvidenceRecord['kind'], string> = {
  capture: 'text-[var(--learning)] border-[var(--accent-border)] bg-[var(--accent-bg)]',
  config: 'text-[var(--owner)] border-[var(--owner-border)] bg-[var(--owner-bg)]',
  log: 'text-[var(--attention)] border-[var(--warning-border)] bg-[var(--warning-bg)]',
  hash: 'text-[var(--success)] border-[var(--success-border)] bg-[var(--success-bg)]',
  note: 'text-[var(--ink-secondary)] border-[var(--line-strong)] bg-[var(--panel-raised)]',
}

async function sha256Of(data: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) return ''
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256OfText(text: string): Promise<string> {
  return sha256Of(new TextEncoder().encode(text).buffer as ArrayBuffer)
}

/**
 * Evidence vault — the evidence standard, as a tool.
 *
 * Every artefact is stored with a real SHA-256 (computed in the browser), the claim it supports, and the
 * reproducible extraction (filter / frame numbers). Hash-only records are allowed for offline captures:
 * paste `sha256sum` output from your own machine.
 */
export function EvidenceVault({ className = '' }: { className?: string }) {
  const [records, setRecords] = useState<EvidenceRecord[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY) || '[]')
      return Array.isArray(parsed) ? parsed.filter(item => item && ['id', 'label', 'kind', 'claim', 'filter', 'frames', 'sha256', 'createdAt'].every(key => typeof item[key] === 'string') && ['capture', 'config', 'log', 'hash', 'note'].includes(item.kind) && typeof item.bytes === 'number') : []
    } catch { return [] }
  })
  const [form, setForm] = useState({ label: '', kind: 'capture' as EvidenceRecord['kind'], claim: '', filter: '', frames: '', sha256: '', bytes: 0 })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [storageMessage, setStorageMessage] = useState('')
  const [recordFeedback, setRecordFeedback] = useState('')
  const recordList = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(records))
      // keep legacy in sync for backward compat during migration
      try { localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(records)) } catch {}
      setStorageMessage('Evidence records saved in this browser only. Files themselves are not stored in the vault.')
    } catch { setStorageMessage('Records could not be saved. Export them before closing this page.') }
  }, [records])

  const stats = useMemo(() => ({
    total: records.length,
    hashed: records.filter(r => r.sha256).length,
    withFrames: records.filter(r => r.frames.trim()).length,
  }), [records])

  async function handleFile(file: File) {
    if (file.size > 50 * 1024 * 1024) { setError('Choose a file up to 50 MB, or paste its SHA-256 instead.'); return }
    setBusy(true)
    setError('')
    try {
      const buf = await file.arrayBuffer()
      const hash = await sha256Of(buf)
      setForm(f => ({
        ...f,
        label: f.label || file.name,
        sha256: hash,
        bytes: file.size,
        kind: /\.(pcapng?|cap)$/i.test(file.name) ? 'capture' : f.kind,
      }))
      if (!hash) setError('crypto.subtle unavailable (needs HTTPS or localhost) — paste the hash from `sha256sum` instead.')
    } catch {
      setError('Could not read this file. Choose it again or paste its SHA-256.')
    } finally {
      setBusy(false)
    }
  }

  async function handleHashOnly(hashText: string) {
    const clean = hashText.trim().toLowerCase().replace(/^[0-9a-f]{64}\s+\*?/, m => m)
    const match = clean.match(/[0-9a-f]{64}/)
    if (match) setForm(f => ({ ...f, sha256: match[0] }))
  }

  function add() {
    if (!form.label.trim()) { setError('Give the artefact a label (file name or "RADIUS log — Monday").'); return }
    if (!form.claim.trim()) { setError('State the claim this artefact supports — evidence without a claim is just data.'); return }
    setError('')
    setRecords(rs => [{
      id: `ev-${Date.now().toString(36)}`,
      label: form.label.trim(),
      kind: form.kind,
      claim: form.claim.trim(),
      filter: form.filter.trim(),
      frames: form.frames.trim(),
      sha256: form.sha256,
      bytes: form.bytes,
      createdAt: new Date().toISOString(),
    }, ...rs])
    setRecordFeedback(`Added ${form.label.trim()} to this evidence list.`)
    setForm({ label: '', kind: 'capture', claim: '', filter: '', frames: '', sha256: '', bytes: 0 })
    if (fileInput.current) fileInput.current.value = ''
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch { setError('Copy unavailable. Select the hash and copy it manually.') }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ generated: new Date().toISOString(), records }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `platform-evidence-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`sc-technical-surface ws-evidence-vault space-y-4 ${className}`}>
      <p className="sc-technical-status" role="status">{recordFeedback}</p>
      {storageMessage && <Notice live>{storageMessage}</Notice>}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0">
            <FileLock2 className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-[var(--ink-primary)]">Evidence vault</h3>
            <p className="mt-1 text-sm text-[var(--ink-secondary)] leading-relaxed">
              Every claim in a report needs an artefact, a hash and a reproducible extraction. This vault hashes
              files in your browser (nothing is uploaded) and stores the record locally.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-[10.5px] font-mono">
              <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{stats.total} artefacts</span>
              <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{stats.hashed} with hash</span>
              <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{stats.withFrames} with frame references</span>
            </div>
          </div>
          <button
            onClick={exportJson}
            disabled={!records.length}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-sm text-[var(--ink-secondary)] hover:bg-[var(--panel-raised)] disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Artifact label (required)" value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Artefact label (wpa2-handshake.pcapng)"
              className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <label className="ws-vault-label">Artifact type<select
              value={form.kind}
              onChange={e => setForm(f => ({ ...f, kind: e.target.value as EvidenceRecord['kind'] }))}
              className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            >
              <option value="capture">Capture</option>
              <option value="config">Configuration</option>
              <option value="log">Log</option>
              <option value="hash">Hash record</option>
              <option value="note">Note</option>
            </select></label>
          </div>

          <TextField label="Claim supported (required)" value={form.claim}
            onChange={e => setForm(f => ({ ...f, claim: e.target.value }))}
            placeholder="Claim this artefact supports (required)"
            className="w-full rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Filter or extraction" value={form.filter}
              onChange={e => setForm(f => ({ ...f, filter: e.target.value }))}
              placeholder="Filter / extraction (eapol.type == 3)"
              className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <TextField label="Frame references" value={form.frames}
              onChange={e => setForm(f => ({ ...f, frames: e.target.value }))}
              placeholder="Frames (9-12)"
              className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Hash evidence file (up to 50 MB)"
              ref={fileInput}
              type="file"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
              className="min-w-0 max-w-full text-sm text-[var(--ink-secondary)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--panel-raised)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--ink-primary)]"
            />
            <span className="text-sm text-[var(--ink-muted)]">or paste a hash:</span>
            <input
              aria-label="Paste SHA-256 hash"
              onChange={e => void handleHashOnly(e.target.value)}
              placeholder="sha256sum output"
              className="flex-1 min-w-[160px] rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] px-3 py-2 text-sm font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </div>

          {form.sha256 && (
            <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--success-border)] p-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--success)]">
                <Hash className="w-3 h-3" /> SHA-256
                {form.bytes > 0 && <span className="text-[var(--ink-muted)]">({(form.bytes / 1024).toFixed(1)} KiB)</span>}
              </div>
              <div className="mt-1.5 text-[10.5px] font-mono text-[var(--ink-secondary)] break-all">{form.sha256}</div>
            </div>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-[var(--attention)] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <button
            onClick={add}
            disabled={busy}
            className="sc-learning-action inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add artefact record
          </button>
        </div>

        <div ref={recordList} role="region" aria-label="Evidence records" tabIndex={0} className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
          <>
            {records.map(r => (
              <div
                key={r.id}
                data-evidence-record={r.id}
                className="rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                      <span className="text-sm font-medium text-[var(--ink-primary)] break-all">{r.label}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--ink-secondary)] leading-relaxed">{r.claim}</p>
                    {(r.filter || r.frames) && (
                      <p className="mt-1.5 text-[10.5px] font-mono text-[var(--ink-muted)] break-all">
                        {r.filter && <>filter: {r.filter} </>}
                        {r.frames && <>• frames: {r.frames}</>}
                      </p>
                    )}
                    {r.sha256 ? (
                      <button
                        onClick={() => void copy(r.sha256, r.id)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--success)] hover:text-[var(--success)] break-all text-left"
                        title="Copy SHA-256"
                      >
                        {copied === r.id ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                        {r.sha256}
                      </button>
                    ) : (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[var(--attention)]">
                        <ShieldCheck className="w-3 h-3" /> no hash recorded — add one before reporting this artefact
                      </p>
                    )}
                  </div>
                  <button
                    data-delete-evidence=""
                    aria-label={`Delete ${r.label}`}
                    onClick={event => {
                      if (!window.confirm(`Delete evidence record “${r.label}” from this browser?`)) return
                      const row = event.currentTarget.closest('[data-evidence-record]')
                      const neighbor = row?.nextElementSibling || row?.previousElementSibling
                      const target = neighbor?.querySelector<HTMLButtonElement>('[data-delete-evidence]') || recordList.current
                      setRecords(rs => rs.filter(x => x.id !== r.id))
                      setRecordFeedback(`Removed ${r.label} from this evidence list.`)
                      target?.focus({ preventScroll: true })
                    }}
                    className="shrink-0 w-11 h-11 rounded-lg bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--danger)] hover:border-[var(--danger-border)] transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </>
          {!records.length && (
            <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center">
              <p className="text-sm text-[var(--ink-muted)]">
                No artefact records yet. Add one for each claim you intend to make in a report — including the
                "no finding" sections.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
