import { PageHeader } from '@/components/common/Workspace'
import { Notice, ViewSwitcher } from '@/components/common/Controls'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_PCAPS } from '@/content/stats'
import { Link } from 'react-router-dom'
import { Download, Trash2, Award, Trophy, Star, Moon, UserRound, CloudUpload, KeyRound, LogOut, BarChart3, Keyboard, ArrowRight, ShieldCheck, Target, FlaskConical } from 'lucide-react'
import { LevelBadge, CertificationPayoff } from '@/components/gamification/LevelBadge'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useMemo, useState } from 'react'
import { LocalDataPanel } from '@/components/security/LocalDataPanel'
import { SecurityPosture } from '@/components/security/SecurityPosture'
import { useSession } from '@/lib/session'
import { ACCOUNT_SYNC_NOTE, isSignedIn, STATE_META } from '@/lib/access'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'
import { lazy, Suspense } from 'react'
const AccessibilityPanel = lazy(() => import('@/components/accessibility/AccessibilityPanel').then(m => ({ default: m.AccessibilityPanel })))

export function Settings() {
  const [resetOpen, setResetOpen] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const reset = useProgressStore(s => s.resetProgress)
  const overall = useProgressStore(s => s.getOverallProgress())
  const lessons = useProgressStore(s => s.completedLessons)
  const labs = useProgressStore(s => s.completedLabs)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const achievements = useProgressStore(s => s.achievements)
  // getXpToNextLevel() builds a fresh object on every call, so it must not be used as a store
  // selector — Zustand compares snapshots by identity and that causes an endless re-render.
  // Derive it from the two stable primitives instead (same approach as the Topbar).
  const xpToNext = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent: Math.min(Math.max((progressInLevel / range) * 100, 0), 100) }
  }, [totalXp, level])
  const { theme, resolved, setTheme } = useTheme()
  const { userState, account, can } = useSession()
  const signedIn = isSignedIn(userState)

  return (
    <div className="ws-legacy max-w-[800px] mx-auto space-y-4 xs:space-y-6 md:space-y-8 min-w-0 w-full">
      <PageHeader eyebrow="Preferences" title="Settings" description="Adjust appearance, reading, account and browser-local data preferences." />
      <nav className="sc-settings-sections" aria-label="Settings sections">{[['settings-account', 'Account'], ['settings-appearance', 'Appearance'], ['settings-accessibility', 'Reading & accessibility'], ['settings-data', 'Data & privacy'], ['settings-danger', 'Reset progress']].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <div id="settings-account" className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex flex-wrap items-center gap-2">
          <UserRound className="w-4 h-4 text-[var(--owner)]" />Account
          <StateChip state={userState} size="sm" className="ml-auto" />
        </h3>
        <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4">
          Settings covers how the product behaves. Your identity, account status, and display name live on the{' '}
          <Link to="/profile" className="text-[var(--learning)] hover:text-[var(--learning)] underline decoration-cyan-400/30 underline-offset-4">Profile</Link>{' '}
          page, and moving progress between devices lives on{' '}
          <Link to="/sync" className="text-[var(--learning)] hover:text-[var(--learning)] underline decoration-cyan-400/30 underline-offset-4">Progress sync</Link>.
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
              You are using SecCraft as a guest. Everything works, and your record stays in this browser. An account adds an
              approval state and a platform-side copy of your progress — it does not unlock new material.
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

      <section id="settings-data" className="space-y-4"><h2 className="sc-settings-heading">Data & privacy</h2><SecurityPosture /><LocalDataPanel /></section>

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-[var(--success)]" />Progress synchronization
        </h3>
        <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4">{ACCOUNT_SYNC_NOTE}</p>
        <Link
          to="/sync"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 text-sm font-semibold text-[var(--success)] transition-colors hover:bg-[var(--success-bg)] sm:w-auto"
        >
          Open progress sync <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <section id="settings-accessibility"><h2 className="sc-settings-heading">Reading & accessibility</h2><Suspense fallback={<LoadingPanel label="Loading Accessibility…" />}>
        <AccessibilityPanel />
      </Suspense></section>

      <details className="sc-settings-learning"><summary>Learning practice and local milestones</summary>
      <p>These figures are kept in this browser. They are not verified skills or certificates.</p>
      <LevelBadge />
      <CertificationPayoff />

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition min-w-0">

        <div className="relative min-w-0">
          <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-5 flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-[var(--learning)]" />
            </div>
            <span>Progress & XP — Consistent Completion Marks & Payoff</span>
            <span className="ml-auto text-sm px-2.5 py-1 rounded-full bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--attention)] font-mono shrink-0">{totalXp} XP • Lv.{level.level} {level.title}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xs:gap-4 min-w-0">
            <div className="p-3 xs:p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]  min-w-0">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)] uppercase tracking-widest font-semibold mb-2"><Target className="w-3 h-3" />Overall</div>
              <div className="flex items-baseline gap-2"><div className="text-[22px] xs:text-[24px] font-bold text-[var(--ink-primary)] font-mono">{overall}%</div><div className="text-sm text-[var(--ink-secondary)]">complete</div></div>
              <div className="mt-2 h-1.5 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]"><div className="h-full bg-gradient-to-r from-[var(--action-fill)] to-[var(--owner)] rounded-full" style={{ width: `${overall}%` }} /></div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]  min-w-0">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)] uppercase tracking-widest font-semibold mb-2"><FlaskConical className="w-3 h-3" />Lessons</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-[var(--ink-primary)] font-mono">{lessons.length}/{TOTAL_LESSONS}</div>
              <div className="text-sm text-[var(--ink-secondary)] mt-1">{Math.round((lessons.length/TOTAL_LESSONS)*100)}% • {lessons.length*10} XP</div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]  min-w-0">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)] uppercase tracking-widest font-semibold mb-2"><Trophy className="w-3 h-3" />Labs</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-[var(--ink-primary)] font-mono">{labs.length}/{TOTAL_LABS}</div>
              <div className="text-sm text-[var(--ink-secondary)] mt-1">{labs.length*25} XP • {TOTAL_PCAPS} captures</div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]  min-w-0">
              <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)] uppercase tracking-widest font-semibold mb-2"><Star className="w-3 h-3" />Achievements</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-[var(--ink-primary)] font-mono">{achievements.length}/20</div>
              <div className="text-sm text-[var(--ink-secondary)] mt-1">{achievements.reduce((a,b)=>a+b.points,0)} XP bonus</div>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[var(--ink-secondary)] uppercase tracking-wide">Level Progress — {level.title} → {xpToNext.nextLevel?.title || 'MAX'}</span>
              <span className="text-sm font-mono text-[var(--ink-secondary)]">{xpToNext.needed} XP to next</span>
            </div>
            <div className="h-2 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]">
              <div className="h-full bg-gradient-to-r from-[var(--attention)] to-[var(--attention)] rounded-full" style={{ width: `${xpToNext.percent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-4 xs:grid-cols-8 gap-1">
              {LEVELS.map(l => (
                <div key={l.level} className={`p-1.5 rounded-lg border text-center ${level.level >= l.level ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : 'bg-[var(--panel-inset)] border-[var(--line-normal)]'}`}>
                  <div className="text-[10px]">{l.icon}</div>
                  <div className={`text-[9px] font-mono font-bold ${level.level >= l.level ? 'text-[var(--attention)]' : 'text-[var(--ink-secondary)]'}`}>Lv{l.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      </details>

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
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">Storage</span><span className="text-[var(--learning)]">local + opt-in sync</span></div>
            <div className="flex justify-between"><span className="text-[var(--ink-secondary)]">API</span><span className="text-[var(--attention)]">proxy or configured host</span></div>
          </div>
        </div>
      </div>

      <section id="settings-danger" className="sc-danger-zone"><h2>Reset learning progress</h2><p>Export a copy first. Reset clears completions, streaks, achievements and practice XP on this browser. Notes, drafts, profile, theme and reports are kept.</p>
<div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => { const data = JSON.stringify({ lessons, labs, achievements, totalXp, level, overall }, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `platform-progress-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url) }} className="flex-1 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] text-sm font-medium text-[var(--ink-secondary)] flex items-center justify-center gap-2 hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] sc-surface-transition touch-manipulation min-h-[44px]">
          <Download className="w-4 h-4" />Export Progress JSON
        </button>
        <button onClick={() => { setResetOpen(true); setResetMessage('') }} className="flex-1 py-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-sm font-medium text-[var(--danger)] flex items-center justify-center gap-2 hover:bg-[var(--danger-bg)] hover:border-[var(--danger-border)] sc-surface-transition touch-manipulation min-h-[44px]">
          <Trash2 className="w-4 h-4" />Reset All Progress
        </button>
      </div>
      {resetOpen && <Notice kind="warning" title="Reset this browser’s learning record?" action={<><button type="button" className="ws-action ws-action-secondary" onClick={() => setResetOpen(false)}>Cancel</button><button type="button" className="ws-action" onClick={() => { reset(); setResetOpen(false); setResetMessage('Learning progress reset in this browser. Notes, drafts and account records were not changed.') }}>Confirm reset</button></>}>This cannot be undone here. Your account-held record is not affected.</Notice>}
      {resetMessage && <Notice live kind="success">{resetMessage}</Notice>}
      </section>

      <p className="ws-muted">Preferences apply to this browser. Account records and progress transfer are managed separately.</p>
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
