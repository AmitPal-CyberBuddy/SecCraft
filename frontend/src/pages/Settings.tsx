import { Breadcrumb, PageHeader } from '@/components/common/Workspace'
import { ViewSwitcher } from '@/components/common/Controls'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Link } from 'react-router-dom'
import { Moon, UserRound, CloudUpload, KeyRound, LogOut, BarChart3, Keyboard, ArrowRight, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { LocalDataPanel } from '@/components/security/LocalDataPanel'
import { SecurityPosture } from '@/components/security/SecurityPosture'
import { useSession } from '@/lib/session'
import { ACCOUNT_SYNC_NOTE, isSignedIn, STATE_META } from '@/lib/access'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'
import { lazy, Suspense } from 'react'
const AccessibilityPanel = lazy(() => import('@/components/accessibility/AccessibilityPanel').then(m => ({ default: m.AccessibilityPanel })))

export function Settings() {
  const { theme, resolved, setTheme } = useTheme()
  const { userState, account, can } = useSession()
  const signedIn = isSignedIn(userState)

  return (
    <div className="ws-legacy max-w-[800px] mx-auto space-y-4 xs:space-y-6 md:space-y-8 min-w-0 w-full">
      <Breadcrumb items={[{ label: 'Account' }, { label: 'Settings' }]} />
      <PageHeader eyebrow="Preferences" title="Settings" description="Adjust appearance, reading and account preferences. The catalogue and content details are public — sign in for full learning materials." />
      <nav className="sc-settings-sections" aria-label="Settings sections">{[['settings-account', 'Account'], ['settings-appearance', 'Appearance'], ['settings-accessibility', 'Reading & accessibility'], ['settings-data', 'Data & privacy']].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <div id="settings-account" className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex flex-wrap items-center gap-2">
          <UserRound className="w-4 h-4 text-[var(--owner)]" />Account
          <StateChip state={userState} size="sm" className="ml-auto" />
        </h3>
        <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4">
          Settings covers how the product behaves. Your account status lives on the{' '}
          <Link to="/profile" className="text-[var(--learning)] hover:text-[var(--learning)] underline decoration-cyan-400/30 underline-offset-4">Profile</Link>{' '}
          page, and account-held records live on{' '}
          <Link to="/sync" className="text-[var(--learning)] hover:text-[var(--learning)] underline decoration-cyan-400/30 underline-offset-4">Account records</Link>.
        </p>
        {signedIn ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--ink-primary)]">{account?.email ?? 'Signed-in account'}</div>
                  <div className="truncate text-sm text-[var(--ink-secondary)]">{STATE_META[userState].nextAction}</div>
                </div>
              </div>
              <ProvenanceChip provenance="server" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/account" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                Account status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link to="/reset-password" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Change password
              </Link>
              <SignOutButton />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
              You are browsing the public catalogue and content details. Sign in for full learning materials and account-held records.
            </p>
            <div className="flex flex-wrap gap-2">
              {can('request-account') && (
                <>
                  <Link to="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-primary)] transition-colors hover:bg-[var(--panel-raised)]">
                    Log in
                  </Link>
                  <Link to="/signup" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg sc-learning-action px-3 text-sm font-bold  transition-colors ">
                    Request an account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div id="settings-appearance" className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-2">
          <Moon className="w-4 h-4 text-[var(--learning)]" />Appearance — theme • light/dark/system
        </h3>
        <ViewSwitcher label="Theme preference" value={theme} onChange={setTheme} options={[{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }, { id: 'system', label: 'Use device setting' }]} />
        <p className="ws-muted">Current appearance: {resolved}. System mode follows your device preference.</p>
      </div>

      <section id="settings-accessibility"><h2 className="sc-settings-heading">Reading & accessibility</h2><Suspense fallback={<LoadingPanel label="Loading Accessibility…" />}>
        <AccessibilityPanel />
      </Suspense></section>

      <section id="settings-data" className="space-y-4"><h2 className="sc-settings-heading">Data & privacy</h2><SecurityPosture /><LocalDataPanel /></section>

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-[var(--success)]" />Account records
        </h3>
        <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4">{ACCOUNT_SYNC_NOTE}</p>
        <Link
          to="/sync"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 text-sm font-semibold text-[var(--success)] transition-colors hover:bg-[var(--success-bg)] sm:w-auto"
        >
          Open account records <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="w-4 h-4 text-[var(--owner)]" />
            <h4 className="font-bold text-sm text-[var(--ink-primary)]">Shortcuts</h4>
          </div>
          <div className="space-y-1.5 text-sm font-mono">
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Search</span><span className="text-[var(--ink-secondary)]">⌘K</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Shortcuts</span><span className="text-[var(--ink-secondary)]">?</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Labs</span><span className="text-[var(--ink-secondary)]">G L</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Dashboard</span><span className="text-[var(--ink-secondary)]">G D</span></div>
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[var(--success)]" />
            <h4 className="font-bold text-sm text-[var(--ink-primary)]">Runtime</h4>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] font-mono">static</span>
          </div>
          <div className="space-y-1.5 text-sm font-mono">
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Offline (PWA)</span><span className="text-[var(--success)]">service worker</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Accounts</span><span className="text-[var(--ink-secondary)]">optional • Supabase</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Storage</span><span className="text-[var(--learning)]">on this device · account records on the platform</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">API</span><span className="text-[var(--attention)]">proxy or configured host</span></div>
          </div>
        </div>
      </div>



      <p className="ws-muted">Preferences apply to this device. Account records are held on the platform for approved accounts.</p>
    </div>
  )
}

/** Sign out from Settings without needing to leave the page first. */
function SignOutButton() {
  const { signOut } = useSession()
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)]"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
    </button>
  )
}
