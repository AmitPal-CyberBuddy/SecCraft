import { CopyButton } from '@/components/common/TechnicalContent'
import { useState, useRef } from 'react'
import { Upload, FileCode, X, Shield, File, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react'

/**
 * Custom capture intake.
 *
 * What this does — and only what this does: accept a .pcap/.pcapng/.cap file, keep it in memory in
 * this browser tab, and compute its real SHA-256 so you can cite the artefact. It does **not**
 * invent frame counts, SSIDs or EAPOL statistics: frame-level parsing of an arbitrary capture needs
 * a parser (the optional local FastAPI service or your own tshark/scapy run), and this build would
 * rather send you to the right tool than show numbers it cannot derive.
 */

const MAX_CAPTURE_BYTES = 50 * 1024 * 1024

interface UploadedFile {
  id: string
  error?: string
  name: string
  size: number
  type: string
  sha256: string | null
  hashing: boolean
}

async function sha256Of(buf: ArrayBuffer): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export function PcapUploader({ onAnalyze }: { onAnalyze?: (file: File) => void }) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')
  const chooseButton = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    void processFiles(Array.from(e.dataTransfer.files))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void processFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  const processFiles = async (fileList: File[]) => {
    const invalid = fileList.filter(file => !/\.(pcap|pcapng|cap)$/i.test(file.name) || file.size === 0 || file.size > MAX_CAPTURE_BYTES)
    setError(invalid.length ? `${invalid.map(file => file.name).join(', ')}: choose non-empty .pcap, .pcapng or .cap files up to 50 MB each.` : '')
    for (const file of fileList.filter(file => !invalid.includes(file))) {
      const id = crypto.randomUUID()
      const entry: UploadedFile = { id, name: file.name, size: file.size, type: file.name.split('.').pop() || 'pcap', sha256: null, hashing: true }
      setFiles(previous => [...previous, entry])
      try {
        const hash = await sha256Of(await file.arrayBuffer())
        setFiles(previous => previous.map(item => item.id === id ? { ...item, sha256: hash, hashing: false } : item))
        onAnalyze?.(file)
      } catch {
        setFiles(previous => previous.map(item => item.id === id ? { ...item, hashing: false, error: 'Could not read this file. Remove it and choose it again.' } : item))
      }
    }
  }

  const removeFile = (id: string) => { setFiles(previous => previous.filter(file => file.id !== id)); chooseButton.current?.focus({ preventScroll: true }) }

  return (
    <div className="sc-technical-surface ws-capture-upload space-y-4 min-w-0 w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-6 xs:p-8 text-center sc-technical-transition min-w-0 ${
          dragActive
            ? 'border-[var(--accent-border)] bg-[var(--accent-bg)]'
            : 'border-[var(--line-strong)] bg-[var(--panel-bg)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-bg)]'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pcap,.pcapng,.cap" multiple onChange={handleChange} className="hidden" />

        <div className="w-12 h-12 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4">
          <Upload className={`w-6 h-6 ${dragActive ? 'text-[var(--learning)]' : 'text-[var(--ink-muted)]'}`} />
        </div>

        <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)]">Custom capture — hash it, then analyse it</h3>
        <p className="text-sm xs:text-sm text-[var(--ink-secondary)] mt-2 max-w-[460px] mx-auto leading-relaxed">
          Files stay in this browser tab; nothing is uploaded anywhere. This panel gives you the SHA-256 you need to
          cite the artefact. Frame-level parsing of a custom capture is done by the optional local parser API
          (backend/, <span className="font-mono">uvicorn app.main:app</span>) or by your own
          <span className="font-mono"> tshark</span>/<span className="font-mono">scapy</span> run against the file on
          your machine — no numbers are guessed here.
        </p>

        <div className="mt-4 flex flex-col xs:flex-row items-center justify-center gap-2">
          <button ref={chooseButton} onClick={() => inputRef.current?.click()} className="w-full xs:w-auto px-5 py-2.5 rounded-xl sc-learning-action   font-semibold text-sm flex items-center justify-center gap-2 touch-manipulation min-h-[44px]">
            <FileCode className="w-4 h-4" />
            Select capture files
          </button>
          <span className="text-sm font-mono text-[var(--ink-muted)]">or drag &amp; drop here</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)]">.pcap / .pcapng / .cap · 50 MB maximum per file</span>
          <span className="px-2 py-1 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)]">SHA-256 in-browser</span>
          <span className="px-2 py-1 rounded-full bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[var(--owner)]">no upload, no cloud</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-sm text-[var(--attention)] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{error}
        </div>
      )}

      <>
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--ink-secondary)] flex items-center gap-2">
                <File className="w-4 h-4 text-[var(--learning)]" />
                Selected ({files.length})
              </h4>
              <button onClick={() => { setFiles([]); chooseButton.current?.focus({ preventScroll: true }) }} className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear list
              </button>
            </div>
            {files.map(file => (
              <div key={file.id} className="p-3 xs:p-4 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
                    <FileCode className="w-5 h-5 text-[var(--learning)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-sm font-mono font-medium text-[var(--ink-primary)] truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-muted)] font-mono shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                      {file.hashing ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--attention)] border border-[var(--warning-border)] font-mono flex items-center gap-1 shrink-0">
                          <div className="w-3 h-3 border-2 border-[var(--warning-border)] border-t-[var(--attention)] rounded-full animate-spin" />
                          hashing
                        </span>
                      ) : file.sha256 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] font-mono flex items-center gap-1 shrink-0">
                          <CheckCircle className="w-3 h-3" /> SHA-256 ready
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--attention)] border border-[var(--warning-border)] font-mono shrink-0">
                          hash unavailable (needs HTTPS or localhost)
                        </span>
                      )}
                    </div>
                    {file.error && <p role="alert" className="ws-field-error">{file.error}</p>}
                    {file.sha256 && (
                      <div className="mt-1.5 text-[10.5px] font-mono text-[var(--ink-muted)] break-all">
                        sha256: <span className="text-[var(--ink-secondary)]">{file.sha256}</span><CopyButton text={file.sha256} label="Copy SHA-256" />
                      </div>
                    )}
                  </div>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file.id)} className="w-11 h-11 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] transition-colors shrink-0 touch-manipulation">
                    <X className="w-4 h-4 text-[var(--ink-secondary)]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>

      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[var(--learning)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--ink-secondary)] leading-relaxed min-w-0">
          <span className="font-semibold text-[var(--ink-secondary)]">Next step:</span> add the file to the Evidence Vault with its
          SHA-256, the claim it supports and the filter you used. To decode it yourself, run for example
          <span className="font-mono text-[var(--ink-secondary)]"> tshark -r {files[0]?.name || 'your.pcapng'} -Y "wlan.fc.type_subtype==8" -V</span> on
          your own machine (or the Kali lab host) and paste the reproducible parts into the vault record — the vault is
          designed for hash + filter + frame numbers, not for screenshots.
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-[var(--attention)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--ink-secondary)] leading-relaxed min-w-0">
          <span className="font-semibold text-[var(--attention)]">Client data:</span> if the capture came from an engagement,
          treat this browser profile as in-scope storage — export the vault record you need and erase local data from
          Settings when you are done.
        </div>
      </div>
    </div>
  )
}
