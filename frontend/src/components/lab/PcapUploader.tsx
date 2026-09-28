import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

interface UploadedFile {
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
    const dropped = Array.from(e.dataTransfer.files).filter(f => /\.(pcap|pcapng|cap)$/i.test(f.name))
    if (dropped.length === 0) setError('No capture files found — this accepts .pcap, .pcapng and .cap.')
    processFiles(dropped)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []))
  }

  const processFiles = async (fileList: File[]) => {
    setError('')
    for (const file of fileList) {
      const entry: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop() || 'pcap',
        sha256: null,
        hashing: true,
      }
      setFiles(f => [...f, entry])
      const buf = await file.arrayBuffer()
      const hash = await sha256Of(buf)
      setFiles(f => f.map(uf => (uf.name === file.name ? { ...uf, sha256: hash, hashing: false } : uf)))
      onAnalyze?.(file)
    }
  }

  const removeFile = (name: string) => setFiles(f => f.filter(file => file.name !== name))

  return (
    <div className="space-y-4 min-w-0 w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-6 xs:p-8 text-center transition-all duration-200 min-w-0 ${
          dragActive
            ? 'border-cyan-500/50 bg-cyan-500/5'
            : 'border-[#334155]/60 bg-[#0f172a]/40 hover:border-[#475569]/60 hover:bg-[#0f172a]/60'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pcap,.pcapng,.cap" multiple onChange={handleChange} className="hidden" />

        <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4">
          <Upload className={`w-6 h-6 ${dragActive ? 'text-cyan-400' : 'text-slate-500'}`} />
        </div>

        <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Custom capture — hash it, then analyse it</h3>
        <p className="text-[12px] xs:text-[13px] text-slate-400 mt-2 max-w-[460px] mx-auto leading-relaxed">
          Files stay in this browser tab; nothing is uploaded anywhere. This panel gives you the SHA-256 you need to
          cite the artefact. Frame-level parsing of a custom capture is done by the optional local parser API
          (backend/, <span className="font-mono">uvicorn app.main:app</span>) or by your own
          <span className="font-mono"> tshark</span>/<span className="font-mono">scapy</span> run against the file on
          your machine — no numbers are guessed here.
        </p>

        <div className="mt-4 flex flex-col xs:flex-row items-center justify-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => inputRef.current?.click()} className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#020617] font-semibold text-[13px] flex items-center justify-center gap-2 touch-manipulation min-h-[44px]">
            <FileCode className="w-4 h-4" />
            Select capture files
          </motion.button>
          <span className="text-[11px] font-mono text-slate-500">or drag &amp; drop here</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500">.pcap / .pcapng / .cap</span>
          <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">SHA-256 in-browser</span>
          <span className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">no upload, no cloud</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11.5px] text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{error}
        </div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-bold text-slate-300 flex items-center gap-2">
                <File className="w-4 h-4 text-cyan-400" />
                Selected ({files.length})
              </h4>
              <button onClick={() => setFiles([])} className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear list
              </button>
            </div>
            {files.map(file => (
              <motion.div key={file.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-3 xs:p-4 rounded-xl bg-[#0f172a] border border-[#1e293b] min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[13px] font-mono font-medium text-slate-200 truncate">{file.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-slate-500 font-mono shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                      {file.hashing ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1 shrink-0">
                          <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                          hashing
                        </span>
                      ) : file.sha256 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1 shrink-0">
                          <CheckCircle className="w-3 h-3" /> SHA-256 ready
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono shrink-0">
                          hash unavailable (needs HTTPS or localhost)
                        </span>
                      )}
                    </div>
                    {file.sha256 && (
                      <div className="mt-1.5 text-[10.5px] font-mono text-slate-500 break-all">
                        sha256: <span className="text-slate-300">{file.sha256}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeFile(file.name)} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors shrink-0 touch-manipulation">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed min-w-0">
          <span className="font-semibold text-slate-300">Next step:</span> add the file to the Evidence Vault with its
          SHA-256, the claim it supports and the filter you used. To decode it yourself, run for example
          <span className="font-mono text-slate-300"> tshark -r {files[0]?.name || 'your.pcapng'} -Y "wlan.fc.type_subtype==8" -V</span> on
          your own machine (or the Kali lab host) and paste the reproducible parts into the vault record — the vault is
          designed for hash + filter + frame numbers, not for screenshots.
        </div>
      </div>

      <div className="p-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed min-w-0">
          <span className="font-semibold text-amber-300">Client data:</span> if the capture came from an engagement,
          treat this browser profile as in-scope storage — export the vault record you need and erase local data from
          Settings when you are done.
        </div>
      </div>
    </div>
  )
}
