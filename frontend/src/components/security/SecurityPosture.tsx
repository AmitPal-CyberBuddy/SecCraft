import { useMemo } from 'react'
import { ShieldCheck, Lock, Globe, KeyRound, Package, Server, Info, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { TERMINAL_COMMAND_COUNT } from '@/components/terminal/commandCount'

/** Claims here describe the guest-first app and optional account services shipped in this build. */
interface Check {
  id: string
  label: string
  detail: string
  state: 'pass' | 'info' | 'warn'
}

function configuredServiceOrigins(): string[] {
  return [...new Set([import.meta.env.VITE_API_BASE, import.meta.env.VITE_SUPABASE_URL]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(value => {
      try { return new URL(value).origin } catch { return 'invalid configured URL' }
    }))]
}

export function SecurityPosture({ className = '' }: { className?: string }) {
  const checks = useMemo(() => {
    const found: Check[] = []
    const origin = typeof location !== 'undefined' ? location.origin : 'unknown'
    const https = typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost')
    const serviceOrigins = configuredServiceOrigins()

    found.push({
      id: 'origin',
      label: 'Explicit service connections',
      detail: serviceOrigins.length
        ? `This page runs on ${origin}. Static learning content stays with the app; configured account/API requests may go to ${serviceOrigins.join(', ')}. No analytics, telemetry, CDN fonts, or automatic progress upload.`
        : `This page runs on ${origin}. Guest learning and local progress stay in this browser. No external auth/API origin, analytics, telemetry, or CDN fonts is configured in this build.`,
      state: serviceOrigins.length ? 'info' : 'pass',
    })

    found.push({
      id: 'transport',
      label: https ? 'Encrypted transport' : 'Unencrypted transport',
      detail: https
        ? 'This page is served over HTTPS (or localhost). Configure deployed API and Supabase URLs to use HTTPS as well.'
        : 'This page was loaded over plain HTTP. Use HTTPS before signing in or using it on an untrusted network.',
      state: https ? 'pass' : 'warn',
    })

    found.push({
      id: 'csp',
      label: 'Content-Security-Policy',
      detail: "The built page includes a restrictive CSP meta policy for scripts, connections and resources. Hosts that read dist/_headers also enforce response headers such as X-Frame-Options; GitHub Pages does not provide configurable response headers, so its meta policy cannot enforce frame-ancestors.",
      state: 'info',
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
      label: 'Guest data stays local unless you choose to sync',
      detail: storageOk
        ? 'Guest progress, notes, local profile, checklists, and evidence metadata live in this browser. Account sync is a separate, authenticated action; importing local records does not make them verified or award server XP.'
        : 'This browser blocks local storage, so progress may not persist after this visit. The app remains available for guest learning during this visit.',
      state: storageOk ? 'pass' : 'warn',
    })

    const controlled = typeof navigator !== 'undefined' ? (navigator.serviceWorker?.controller ? 'a service worker' : null) : null
    found.push({
      id: 'sw',
      label: controlled ? 'Offline app shell active' : 'Offline shell not controlling this tab yet',
      detail: controlled
        ? 'The service worker caches same-origin static files and passes API requests through without caching them. Auth and synchronization still require their configured services.'
        : 'The static learning shell can work offline after it has been cached. Reconnect once to install or update the service worker.',
      state: 'info',
    })

    found.push({
      id: 'deps',
      label: 'Dependency and supply-chain checks',
      detail: `Dependencies are installed from the lockfile and audited in CI; shipped lab artifacts are checked by scripts/verify-lab-artifacts.py. The simulated terminal ships ${TERMINAL_COMMAND_COUNT} in-app commands and never executes shell commands or reaches the network.`,
      state: 'pass',
    })

    const authConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL?.trim() && import.meta.env.VITE_SUPABASE_ANON_KEY?.trim())
    found.push({
      id: 'backend',
      label: authConfigured ? 'Optional account services configured' : 'Guest learning does not need account services',
      detail: authConfigured
        ? 'Supabase Auth owns credentials; the API verifies provider tokens and applies email-verification, pending-approval, and owner-allowlist checks. Only the public Supabase anon key belongs in the frontend; service-role and database credentials stay server-side.'
        : 'No Supabase credentials are bundled in this build. Sign-up and account sync are unavailable, but the authored lessons, labs, and browser-local progress remain usable.',
      state: authConfigured ? 'info' : 'pass',
    })

    found.push({
      id: 'authorisation',
      label: 'Authorised use only',
      detail: 'Use the techniques only on systems you own or have explicit permission to test. Bundled artifacts and simulated results do not grant permission to test real networks or prove radio-frequency behavior.',
      state: 'info',
    })

    return found
  }, [])

  const iconFor = (state: Check['state']) =>
    state === 'pass' ? <CheckCircle className="w-4 h-4 text-[var(--success)]" /> : state === 'warn' ? <AlertTriangle className="w-4 h-4 text-[var(--attention)]" /> : <Info className="w-4 h-4 text-[var(--learning)]" />

  const authConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL?.trim() && import.meta.env.VITE_SUPABASE_ANON_KEY?.trim())
  const serviceOrigins = configuredServiceOrigins()

  return (
    <div className={`rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-[var(--success)]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)]">Security posture</h3>
          <p className="text-sm text-[var(--ink-muted)] font-mono">what this build actually does — checked in your browser, not asserted</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {checks.map(check => (
          <div
            key={check.id}
            className="p-3.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">{iconFor(check.state)}</div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-[var(--ink-primary)]">{check.label}</div>
              <div className="text-sm text-[var(--ink-secondary)] mt-1 leading-relaxed">{check.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Globe, label: 'Analytics / telemetry', value: 'None' },
          { icon: KeyRound, label: 'Accounts required', value: 'No' },
          { icon: Lock, label: 'Client service secrets', value: '0' },
          { icon: Server, label: 'Account sync', value: authConfigured ? 'Optional' : 'Not configured' },
          { icon: Package, label: 'Configured service origins', value: String(serviceOrigins.length) },
        ].map(item => (
          <div key={item.label} className="p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)] uppercase tracking-wide font-semibold">
              <item.icon className="w-3 h-3" /> {item.label}
            </div>
            <div className="text-[14px] font-mono font-bold text-[var(--ink-primary)] mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--ink-secondary)] leading-relaxed">
          Reporting a problem is welcome; see <span className="font-mono text-[var(--ink-secondary)]">SECURITY.md</span> in the repository for
          the disclosure route. There is no bounty programme, and no third party has audited this project — treat the
          statements above as engineering facts you can re-verify, not as an assurance.
        </div>
      </div>

      <a
        href="https://github.com/AmitPal-CyberBuddy/SecCraft/blob/main/SECURITY.md"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--learning)] hover:text-[var(--learning)]"
      >
        <ExternalLink className="w-3 h-3" /> SECURITY.md
      </a>
    </div>
  )
}
