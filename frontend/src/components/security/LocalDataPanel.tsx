import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, ShieldCheck, Trash2, RefreshCw, Wifi, WifiOff, Info } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

/**
 * Local data & privacy panel (replaces the previous fabricated "audit trail").
 *
 * Everything here is measured, not invented: the storage keys are the ones this app actually uses,
 * the sizes are read from localStorage, and the network statement reflects what the code does
 * (relative /api calls only — no analytics, no third-party requests, no telemetry).
 */

const KNOWN_KEYS: { key: string; label: string; description: string }[] = [
  { key: 'wififorge-progress', label: 'Learning progress', description: 'Completed lessons, labs, quizzes, XP and achievements' },
  { key: 'wififorge-evidence-vault', label: 'Evidence vault', description: 'Artefact records you added (labels, claims, filters, SHA-256 hashes)' },
  { key: 'wififorge-checklist-general', label: 'Checklist (Reference)', description: 'Ticked master-checklist items' },
  { key: 'wififorge-checklist-ENG-01', label: 'Checklist (ENG-01)', description: 'Ticked engagement-checklist items' },
  { key: 'wififorge-profile', label: 'Local profile', description: 'Display name and self-declared role — no credentials are stored' },
  { key: 'wififorge-notes', label: 'Notes & bookmarks', description: 'Lesson notes and bookmarks' },
  { key: 'theme', label: 'Theme preference', description: 'Dark / light / system' },
]

function bytesOf(value: string | null): number {
  return value ? new Blob([value]).size : 0
}

export function LocalDataPanel({ className = '' }: { className?: string }) {
  const reset = useProgressStore(s => s.resetProgress)
  const [sizes, setSizes] = useState<Record<string, number>>({})
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [apiReachable, setApiReachable] = useState<boolean | null>(null)
  const [checkedAt, setCheckedAt] = useState<string>('')

  const measure = () => {
    const next: Record<string, number> = {}
    for (const { key } of KNOWN_KEYS) {
      try { next[key] = bytesOf(localStorage.getItem(key)) } catch { next[key] = 0 }
    }
    // Anything else this origin stores (e.g. an older release's keys).
    let other = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || ''
        if (!KNOWN_KEYS.some(entry => entry.key === k)) other += bytesOf(localStorage.getItem(k))
      }
    } catch { /* storage blocked */ }
    next['__other__'] = other
    setSizes(next)
    setCheckedAt(new Date().toLocaleTimeString())
  }

  useEffect(() => {
    measure()
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const checkApi = async () => {
    setApiReachable(null)
    try {
      const res = await fetch('/api/health', { headers: { accept: 'application/json' } })
      setApiReachable(res.ok)
    } catch {
      setApiReachable(false)
    }
    setCheckedAt(new Date().toLocaleTimeString())
  }

  const total = useMemo(() => Object.values(sizes).reduce((a, b) => a + b, 0), [sizes])

  return (
    <div className={`space-y-3 ${className}`}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-slate-100">Local data &amp; privacy</h3>
            <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
              This is a static, local-first build. There is <strong className="text-slate-200">no account, no server-side
              logging and no telemetry</strong>: everything below lives in this browser's storage on this device, and the
              only network request the app makes is to its own <span className="font-mono">/api</span> path when a local
              backend is running.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] font-mono">
              <span className={`px-2 py-1 rounded-full border ${online ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                {online ? <Wifi className="inline w-3 h-3 mr-1 -mt-0.5" /> : <WifiOff className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {online ? 'browser online' : 'browser offline (app still works)'}
              </span>
              <span className={`px-2 py-1 rounded-full border ${apiReachable === true ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : apiReachable === false ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' : 'bg-[#020617] border-[#1e293b] text-slate-500'}`}>
                local parser API: {apiReachable === true ? 'reachable' : apiReachable === false ? 'not running (offline lab data is used)' : 'not checked'}
              </span>
              <span className="px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400">third-party requests: none</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" /> What this browser stores
          </h3>
          <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-500">
            {checkedAt && <span>measured {checkedAt}</span>}
            <button onClick={measure} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#020617] border border-[#1e293b] hover:border-[#334155] transition-colors">
              <RefreshCw className="w-3 h-3" /> re-measure
            </button>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[#1e293b]/70">
          {KNOWN_KEYS.map(({ key, label, description }) => {
            const size = sizes[key] ?? 0
            return (
              <div key={key} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-slate-200">{label}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{description}</div>
                  <div className="text-[10px] font-mono text-slate-600 mt-0.5">{key}</div>
                </div>
                <span className={`shrink-0 text-[11px] font-mono ${size ? 'text-cyan-400' : 'text-slate-600'}`}>
                  {size ? `${size} B` : 'empty'}
                </span>
              </div>
            )
          })}
          {(sizes['__other__'] ?? 0) > 0 && (
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="text-[12px] text-slate-400">Other keys on this origin</div>
              <span className="text-[11px] font-mono text-slate-400">{sizes['__other__']} B</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-slate-500">total: {total} B</span>
          <div className="flex items-center gap-2">
            <button onClick={checkApi} className="px-3 py-1.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[11.5px] text-slate-300 hover:border-[#334155] transition-colors">
              Check local API
            </button>
            <button
              onClick={() => {
                if (!confirm('Erase all local WiFiForge data (progress, vault, checklists, notes, profile)? This cannot be undone.')) return
                for (const { key } of KNOWN_KEYS) { try { localStorage.removeItem(key) } catch { /* ignore */ } }
                reset()
                measure()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11.5px] text-red-400 hover:bg-red-500/15 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Erase local data
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Captures you download or upload stay on your device; the evidence vault stores only the metadata you type
          (labels, claims, filters, frame numbers, hashes). If you are working with client data, treat this browser
          profile as in-scope storage: export what you need, then erase it here.
        </p>
      </div>
    </div>
  )
}
