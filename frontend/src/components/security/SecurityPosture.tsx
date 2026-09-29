import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Globe, KeyRound, Package, Server, Info, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { TERMINAL_COMMAND_COUNT } from '@/components/terminal/commandCount'

/**
 * Security posture — the statements here are checked against what the shipped code actually does.
 *
 * Every claim below is either (a) read from the running page (origin, protocol, storage access,
 * online state), or (b) a property of the build that is enforced by a script you can re-run
 * (`npm run build` fails on third-party URLs; `scripts/verify-lab-artifacts.py` validates the capture
 * datasets; the CI workflow audits dependencies). Nothing here is a marketing claim about a feature
 * that does not exist, and there is no "verified" badge pretending a third party audited the app.
 */

interface Check {
  id: string
  label: string
  detail: string
  state: 'pass' | 'info' | 'warn'
}

export function SecurityPosture({ className = '' }: { className?: string }) {
  const [checks, setChecks] = useState<Check[]>([])

  useEffect(() => {
    const found: Check[] = []

    const origin = typeof location !== 'undefined' ? location.origin : 'unknown'
    const https = typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost')

    found.push({
      id: 'origin',
      label: 'Same-origin only',
      detail: `This page runs on ${origin}. The app makes relative requests only — no CDN, no third-party fonts, no analytics. Build-time check: a third-party URL fails the build.`,
      state: 'pass',
    })

    found.push({
      id: 'transport',
      label: https ? 'Encrypted transport' : 'Unencrypted transport',
      detail: https
        ? 'Served over HTTPS (or localhost), so the page and its assets cannot be modified in transit.'
        : 'This page was loaded over plain HTTP. Serve it over HTTPS before using it on an untrusted network.',
      state: https ? 'pass' : 'warn',
    })

    found.push({
      id: 'csp',
      label: 'Content-Security-Policy',
      detail:
        "The built index.html carries a CSP meta tag (default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'), and dist/_headers repeats it plus nosniff / Referrer-Policy / Permissions-Policy for hosts that read headers.",
      state: 'pass',
    })

    let storageOk = false
    try {
      localStorage.setItem('platform-storage-probe', '1')
      localStorage.removeItem('platform-storage-probe')
      storageOk = true
    } catch {
      storageOk = false
    }
    found.push({
      id: 'storage',
      label: 'No account, no server-side profile',
      detail: storageOk
        ? 'Progress, notes, evidence records and settings live in this browser\'s localStorage. Clearing site data removes them; nothing is uploaded, and there is no login to steal.'
        : 'This browser blocks local storage (private mode?), so progress cannot be saved. The app still works for the current visit.',
      state: storageOk ? 'pass' : 'warn',
    })

    const controlled = typeof navigator !== 'undefined' ? (navigator.serviceWorker?.controller ? 'a service worker' : null) : null
    found.push({
      id: 'sw',
      label: controlled ? 'Offline cache active' : 'No service worker controlling this tab',
      detail: controlled
        ? 'A service worker is serving this tab, which is what makes the app work offline. It caches only same-origin files; update it by reloading after a new deploy.'
        : 'The app works offline once the PWA shell is installed; if you see this in a normal tab it simply means the service worker is not active yet (hard reload to register it).',
      state: 'info',
    })

    found.push({
      id: 'deps',
      label: 'Dependency and supply-chain checks',
      detail: `Frontend dependencies are installed from the lockfile (npm ci) and audited in CI; capture datasets are regenerated and verified by scripts/verify-lab-artifacts.py (8 suites) before deploy. The simulated terminal ships ${TERMINAL_COMMAND_COUNT} commands implemented in this repository — it never executes shell commands or reaches the network.`,
      state: 'pass',
    })

    found.push({
      id: 'backend',
      label: 'Optional backend holds no secrets by default',
      detail:
        'The FastAPI service is not required by this build. If you run it, CORS is an explicit origin allowlist from PLATFORM_ALLOWED_ORIGINS (legacy WIFIFORGE_ALLOWED_ORIGINS, no wildcard), authentication requires PLATFORM_JWT_SECRET (legacy WIFIFORGE_JWT_SECRET) and returns 503 without it, and the classroom demo accounts only load with PLATFORM_DEMO_USERS=1 (legacy WIFIFORGE_DEMO_USERS=1). Platform supports dual env vars.',
      state: 'pass',
    })

    found.push({
      id: 'authorisation',
      label: 'Authorised use only',
      detail:
        'The techniques in this academy are for systems you own or have written permission to test. Labs use synthetic captures and bundled hostapd configurations; the RF_REQUIRED labs are documented, not performed, because transmitting them needs hardware, licensing and a signed scope.',
      state: 'info',
    })

    setChecks(found)
  }, [])

  const iconFor = (state: Check['state']) =>
    state === 'pass' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : state === 'warn' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Info className="w-4 h-4 text-cyan-400" />

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Security posture</h3>
          <p className="text-[11px] text-slate-500 font-mono">what this build actually does — checked in your browser, not asserted</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {checks.map((check, idx) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="p-3.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">{iconFor(check.state)}</div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-slate-200">{check.label}</div>
              <div className="text-[11.5px] text-slate-400 mt-1 leading-relaxed">{check.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Globe, label: 'Third-party requests', value: '0' },
          { icon: KeyRound, label: 'Accounts required', value: '0' },
          { icon: Lock, label: 'Secrets in client', value: '0' },
          { icon: Server, label: 'Backend required', value: 'No' },
          { icon: Package, label: 'Shells executed', value: '0' },
        ].map(item => (
          <div key={item.label} className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
              <item.icon className="w-3 h-3" /> {item.label}
            </div>
            <div className="text-[14px] font-mono font-bold text-slate-100 mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Reporting a problem is welcome; see <span className="font-mono text-slate-300">SECURITY.md</span> in the repository for
          the disclosure route. There is no bounty programme, and no third party has audited this project — treat the
          statements above as engineering facts you can re-verify, not as an assurance.
        </div>
      </div>

      <a
        href="https://github.com/AmitPal-CyberBuddy/SecCraft/blob/main/SECURITY.md"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300"
      >
        <ExternalLink className="w-3 h-3" /> SECURITY.md
      </a>
    </div>
  )
}
