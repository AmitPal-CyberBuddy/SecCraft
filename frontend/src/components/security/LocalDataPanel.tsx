import { useEffect, useMemo, useState } from 'react'
import { HardDrive, ShieldCheck, Trash2, RefreshCw, Wifi, WifiOff, Info } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'
import { apiFetch } from '@/lib/api'
import { supabase, supabaseConfigured } from '@/lib/supabase'

/**
 * Local data & privacy panel (replaces the previous fabricated "audit trail").
 *
 * Everything here is measured, not invented: the storage keys are the ones this app actually uses,
 * the sizes are read from localStorage, and the network statement reflects what the code does
 * (first-party API calls and optional configured identity-provider requests; no analytics or telemetry).
 */

const KNOWN_KEYS: { key: string; label: string; description: string }[] = [
  { key: 'platform-progress', label: 'Learning progress (platform)', description: 'Completed lessons, labs, quizzes, XP, achievements, current path' },
  { key: 'wififorge-progress', label: 'Learning progress (legacy)', description: 'Legacy key — migrated to platform-progress, kept for backward compat' },
  { key: 'platform-evidence-vault', label: 'Evidence vault (platform)', description: 'Artefact records you added (labels, claims, filters, SHA-256 hashes) — generic' },
  { key: 'wififorge-evidence-vault', label: 'Evidence vault (legacy)', description: 'Legacy evidence vault — migrated to platform-evidence-vault' },
  { key: 'platform-checklist-general', label: 'Checklist (Reference, platform)', description: 'Ticked master-checklist items — generic VAPT' },
  { key: 'wififorge-checklist-general', label: 'Checklist (Reference, legacy)', description: 'Legacy master-checklist' },
  { key: 'platform-checklist-ENG-01', label: 'Checklist (ENG-01, platform)', description: 'Ticked engagement-checklist items' },
  { key: 'wififorge-checklist-ENG-01', label: 'Checklist (ENG-01, legacy)', description: 'Legacy engagement checklist' },
  { key: 'platform-profile', label: 'Local profile (platform)', description: 'Guest display name — no credentials or permissions' },
  { key: 'wififorge-profile', label: 'Local profile (legacy)', description: 'Legacy display name; any self-declared role is ignored' },
  { key: 'platform-notes', label: 'Notes & bookmarks (platform)', description: 'Lesson notes and bookmarks — generic' },
  { key: 'wififorge-notes', label: 'Notes & bookmarks (legacy)', description: 'Legacy notes' },
  { key: 'theme', label: 'Theme preference', description: 'Dark / light / system' },
  { key: 'platform-theme', label: 'Theme preference (platform)', description: 'Dark / light / system — platform key' },
]

function bytesOf(value: string | null): number {
  return value ? new Blob([value]).size : 0
}

function readStorageSizes(): Record<string, number> {
  const next: Record<string, number> = {}
  for (const { key } of KNOWN_KEYS) {
    try { next[key] = bytesOf(localStorage.getItem(key)) } catch { next[key] = 0 }
  }
  let other = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || ''
      if (!KNOWN_KEYS.some(entry => entry.key === key)) other += bytesOf(localStorage.getItem(key))
    }
  } catch { /* storage blocked */ }
  next.__other__ = other
  return next
}

export function LocalDataPanel({ className = '' }: { className?: string }) {
  const reset = useProgressStore(s => s.resetProgress)
  const [sizes, setSizes] = useState<Record<string, number>>(readStorageSizes)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [apiReachable, setApiReachable] = useState<boolean | null>(null)
  const [checkedAt, setCheckedAt] = useState<string>(() => new Date().toLocaleTimeString())

  const measure = () => {
    setSizes(readStorageSizes())
    setCheckedAt(new Date().toLocaleTimeString())
  }

  useEffect(() => {
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
      const res = await apiFetch('/api/health')
      const body = await res.json().catch(() => null)
      setApiReachable(Boolean(res.ok && body?.status === 'ok' && body?.service === 'SecCraft API'))
    } catch {
      setApiReachable(false)
    }
    setCheckedAt(new Date().toLocaleTimeString())
  }

  const total = useMemo(() => Object.values(sizes).reduce((a, b) => a + b, 0), [sizes])

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-[var(--ink-primary)]">Local data &amp; privacy</h3>
            <p className="mt-1 text-[12px] text-[var(--ink-secondary)] leading-relaxed">
              Guest learning and its progress remain local to this browser. If account services are configured and you sign in,
              authentication is handled by Supabase and synchronized records are sent to the configured SecCraft API.
              The app does not add analytics or telemetry; local learning remains available if those services are offline.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] font-mono">
              <span className={`px-2 py-1 rounded-full border ${online ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]' : 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--attention)]'}`}>
                {online ? <Wifi className="inline w-3 h-3 mr-1 -mt-0.5" /> : <WifiOff className="inline w-3 h-3 mr-1 -mt-0.5" />}
                {online ? 'browser online' : 'browser offline (app still works)'}
              </span>
              <span className={`px-2 py-1 rounded-full border ${apiReachable === true ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]' : apiReachable === false ? 'bg-[var(--panel-raised)] border-[var(--line-strong)] text-[var(--ink-secondary)]' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-[var(--ink-muted)]'}`}>
                platform API: {apiReachable === true ? 'reachable' : apiReachable === false ? 'not reachable (guest content still works)' : 'not checked'}
              </span>
              <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">account provider: {supabaseConfigured ? 'configured' : 'not configured'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[var(--learning)]" /> What this browser stores
          </h3>
          <div className="flex items-center gap-2 text-[10.5px] font-mono text-[var(--ink-muted)]">
            {checkedAt && <span>measured {checkedAt}</span>}
            <button onClick={measure} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--panel-inset)] border border-[var(--line-normal)] hover:border-[var(--line-strong)] transition-colors">
              <RefreshCw className="w-3 h-3" /> re-measure
            </button>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[var(--line-normal)]">
          {KNOWN_KEYS.map(({ key, label, description }) => {
            const size = sizes[key] ?? 0
            return (
              <div key={key} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-[var(--ink-primary)]">{label}</div>
                  <div className="text-sm text-[var(--ink-muted)] leading-relaxed">{description}</div>
                  <div className="text-[10px] font-mono text-[var(--ink-secondary)] mt-0.5">{key}</div>
                </div>
                <span className={`shrink-0 text-sm font-mono ${size ? 'text-[var(--learning)]' : 'text-[var(--ink-secondary)]'}`}>
                  {size ? `${size} B` : 'empty'}
                </span>
              </div>
            )
          })}
          {(sizes['__other__'] ?? 0) > 0 && (
            <div className="py-2.5 flex items-center justify-between gap-3">
              <div className="text-[12px] text-[var(--ink-secondary)]">Other keys on this origin</div>
              <span className="text-sm font-mono text-[var(--ink-secondary)]">{sizes['__other__']} B</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-mono text-[var(--ink-muted)]">total: {total} B</span>
          <div className="flex items-center gap-2">
            <button onClick={checkApi} className="px-3 py-1.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-secondary)] hover:border-[var(--line-strong)] transition-colors">
              Check platform API
            </button>
            <button
              onClick={async () => {
                if (!confirm('Erase this browser’s known SecCraft data and sign out of the configured account? This does not delete your server account or synchronized records. This cannot be undone.')) return
                for (const { key } of KNOWN_KEYS) { try { localStorage.removeItem(key) } catch { /* ignore */ } }
                reset()
                if (supabase) { try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* local app data is still cleared */ } }
                measure()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-sm text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Erase local data &amp; sign out
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-sm text-[var(--ink-muted)] leading-relaxed">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Captures you download or upload stay on your device; the evidence vault stores only the metadata you type
          (labels, claims, filters, frame numbers, hashes). If you are working with client data, treat this browser
          profile as in-scope storage: export what you need, then erase it here.
        </p>
      </div>
    </div>
  )
}
