import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  capture: 'text-cyan-400 border-cyan-500/25 bg-cyan-500/10',
  config: 'text-violet-400 border-violet-500/25 bg-violet-500/10',
  log: 'text-amber-400 border-amber-500/25 bg-amber-500/10',
  hash: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10',
  note: 'text-slate-400 border-slate-500/25 bg-slate-500/10',
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
  const [records, setRecords] = useState<EvidenceRecord[]>([])
  const [form, setForm] = useState({ label: '', kind: 'capture' as EvidenceRecord['kind'], claim: '', filter: '', frames: '', sha256: '', bytes: 0 })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY)
      if (raw) setRecords(JSON.parse(raw))
    } catch { /* ignore malformed storage */ }
  }, [])

  useEffect(() => {
    try { 
      localStorage.setItem(STORE_KEY, JSON.stringify(records))
      // keep legacy in sync for backward compat during migration
      try { localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(records)) } catch {}
    } catch { /* storage full/blocked */ }
  }, [records])

  const stats = useMemo(() => ({
    total: records.length,
    hashed: records.filter(r => r.sha256).length,
    withFrames: records.filter(r => r.frames.trim()).length,
  }), [records])

  async function handleFile(file: File) {
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
    setForm({ label: '', kind: 'capture', claim: '', filter: '', frames: '', sha256: '', bytes: 0 })
    if (fileInput.current) fileInput.current.value = ''
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* clipboard blocked */ }
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
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <FileLock2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-slate-100">Evidence vault</h3>
            <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
              Every claim in a report needs an artefact, a hash and a reproducible extraction. This vault hashes
              files in your browser (nothing is uploaded) and stores the record locally.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-[10.5px] font-mono">
              <span className="px-2 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">{stats.total} artefacts</span>
              <span className="px-2 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">{stats.hashed} with hash</span>
              <span className="px-2 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">{stats.withFrames} with frame references</span>
            </div>
          </div>
          <button
            onClick={exportJson}
            disabled={!records.length}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[11px] text-slate-300 hover:bg-[#25354f] disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Artefact label (wpa2-handshake.pcapng)"
              className="rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
            />
            <select
              value={form.kind}
              onChange={e => setForm(f => ({ ...f, kind: e.target.value as EvidenceRecord['kind'] }))}
              className="rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[12px] text-slate-200 focus:outline-none focus:border-cyan-500/30"
            >
              <option value="capture">Capture</option>
              <option value="config">Configuration</option>
              <option value="log">Log</option>
              <option value="hash">Hash record</option>
              <option value="note">Note</option>
            </select>
          </div>

          <input
            value={form.claim}
            onChange={e => setForm(f => ({ ...f, claim: e.target.value }))}
            placeholder="Claim this artefact supports (required)"
            className="w-full rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.filter}
              onChange={e => setForm(f => ({ ...f, filter: e.target.value }))}
              placeholder="Filter / extraction (eapol.type == 3)"
              className="rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[11.5px] font-mono text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
            />
            <input
              value={form.frames}
              onChange={e => setForm(f => ({ ...f, frames: e.target.value }))}
              placeholder="Frames (9-12)"
              className="rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[11.5px] font-mono text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
              className="text-[11px] text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-[#1e293b] file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200"
            />
            <span className="text-[11px] text-slate-500">or paste a hash:</span>
            <input
              onChange={e => void handleHashOnly(e.target.value)}
              placeholder="sha256sum output"
              className="flex-1 min-w-[160px] rounded-xl bg-[#020617]/60 border border-[#1e293b] px-3 py-2 text-[11px] font-mono text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
            />
          </div>

          {form.sha256 && (
            <div className="rounded-xl bg-[#020617]/60 border border-emerald-500/20 p-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                <Hash className="w-3 h-3" /> SHA-256
                {form.bytes > 0 && <span className="text-slate-500">({(form.bytes / 1024).toFixed(1)} KiB)</span>}
              </div>
              <div className="mt-1.5 text-[10.5px] font-mono text-slate-300 break-all">{form.sha256}</div>
            </div>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-400 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <button
            onClick={add}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-[12px] font-semibold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add artefact record
          </button>
        </div>

        <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
          <AnimatePresence initial={false}>
            {records.map(r => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="rounded-xl bg-[#0f172a] border border-[#1e293b] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase ${KIND_COLORS[r.kind]}`}>{r.kind}</span>
                      <span className="text-[12px] font-medium text-slate-200 break-all">{r.label}</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-slate-400 leading-relaxed">{r.claim}</p>
                    {(r.filter || r.frames) && (
                      <p className="mt-1.5 text-[10.5px] font-mono text-slate-500 break-all">
                        {r.filter && <>filter: {r.filter} </>}
                        {r.frames && <>• frames: {r.frames}</>}
                      </p>
                    )}
                    {r.sha256 ? (
                      <button
                        onClick={() => void copy(r.sha256, r.id)}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 break-all text-left"
                        title="Copy SHA-256"
                      >
                        {copied === r.id ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                        {r.sha256}
                      </button>
                    ) : (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-amber-400/90">
                        <ShieldCheck className="w-3 h-3" /> no hash recorded — add one before reporting this artefact
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setRecords(rs => rs.filter(x => x.id !== r.id))}
                    className="shrink-0 w-7 h-7 rounded-lg bg-[#020617]/60 border border-[#1e293b] flex items-center justify-center text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {!records.length && (
            <div className="rounded-xl border border-dashed border-[#334155]/60 p-6 text-center">
              <p className="text-[12px] text-slate-500">
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
