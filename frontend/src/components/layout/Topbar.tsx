import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { Menu, X, Search, Bell, Command, Zap, Moon, Sun, UserRound, LogOut, ChevronDown, CloudUpload, Shield, Sparkles, Lock, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useSession } from '@/lib/session'
import { isOwner, isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'
import { ProvenanceChip } from '@/components/account/StateChip'

interface Props {
  onMenuToggle?: () => void
  sidebarOpen?: boolean
  isMobile?: boolean
}

export function Topbar({ onMenuToggle, sidebarOpen, isMobile }: Props) {
  const currentModule = useProgressStore(s => s.currentModule)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const achievements = useProgressStore(s => s.achievements)
  const { resolved, setTheme } = useTheme()
  const { userState, account, signOut, ready } = useSession()
  const navigate = useNavigate()

  // getXpToNextLevel returns a fresh object per call, so derive it from primitives instead of using
  // it as a store selector (which would re-render on every store read).
  const xpToNext = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent }
  }, [totalXp, level])

  const [notifOpen, setNotifOpen] = useState(false)
  const closeNotifications = useCallback(() => setNotifOpen(false), [])
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Dismiss the account menu on Escape or an outside click — it behaves like a dialog.
  useEffect(() => {
    if (!accountOpen) return
    // Move focus into the menu on open so a keyboard user is not stranded on the trigger.
    const focusFrame = requestAnimationFrame(() => {
      const firstItem = accountRef.current?.querySelector<HTMLElement>('#account-menu [role="menuitem"]')
      firstItem?.focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setAccountOpen(false)
        requestAnimationFrame(() => accountRef.current?.querySelector<HTMLButtonElement>('button')?.focus())
        return
      }
      // Arrow-key traversal between menu items, as expected for role="menu".
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(accountRef.current?.querySelectorAll<HTMLElement>('#account-menu [role="menuitem"]') ?? [])
      if (items.length === 0) return
      event.preventDefault()
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
      items[next]?.focus()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [accountOpen])

  const toggleTheme = () => setTheme(resolved === 'dark' ? 'light' : 'dark')

  const notifCount = useMemo(() => {
    const withTime = [
      ...completedLessons.filter(l => (l as { completedAt?: string }).completedAt),
      ...completedLabs.filter(l => (l as { completedAt?: string }).completedAt),
      ...quizScores.filter(q => (q as { completedAt?: string }).completedAt),
      ...achievements.filter(a => (a as { unlockedAt?: string }).unlockedAt),
    ]
    return withTime.length
  }, [completedLessons, completedLabs, quizScores, achievements])

  const openSearch = () => document.dispatchEvent(new CustomEvent('open-search'))

  const identityLabel = account?.email ?? (isSignedIn(userState) ? 'Account' : 'Guest learner')
  const displayLabel = identityLabel.length > 22 ? `${identityLabel.slice(0, 19)}…` : identityLabel

  async function handleSignOut() {
    setAccountOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <>
      <header
        data-tour="topbar"
        className={`h-[56px] xs:h-[60px] md:h-[64px] bg-[#020617]/90 backdrop-blur-2xl border-b sticky top-0 z-30 flex items-center justify-between px-3 xs:px-4 md:px-6 relative min-w-0 w-full transition-all duration-200 ${
          scrolled ? 'border-[#334155]/80 shadow-lg shadow-black/20' : 'border-[#1e293b]/60'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-transparent to-violet-500/[0.02] pointer-events-none" />

        <div className="flex items-center gap-2 xs:gap-3 md:gap-6 relative min-w-0 flex-1 md:flex-initial">
          {isMobile && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onMenuToggle}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={sidebarOpen}
              aria-controls="primary-navigation"
              id="mobile-navigation-toggle"
              className="w-11 h-11 xs:w-9 xs:h-9 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] hover:border-[#334155] active:bg-[#1e293b] transition-all duration-200 group lg:hidden shrink-0 touch-manipulation"
            >
              <motion.div animate={{ rotate: sidebarOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                {sidebarOpen ? <X className="w-5 h-5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-slate-200" /> : <Menu className="w-5 h-5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-slate-200" />}
              </motion.div>
            </motion.button>
          )}

          {/* Identity: derived from the real session, never hardcoded */}
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 flex items-center justify-center shadow-soft relative overflow-hidden group shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="text-[12px] font-bold text-slate-300 font-mono relative z-10" aria-hidden="true">
                {ready && isSignedIn(userState) ? 'ID' : <Eye className="w-4 h-4 text-cyan-300" />}
              </span>
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1e293b] shadow-sm ${
                  userState === 'active' || userState === 'owner' ? 'bg-emerald-500' : isSignedIn(userState) ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
              >
                <div className="w-full h-full rounded-full animate-pulse" />
              </div>
            </motion.div>
            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-semibold text-slate-200 tracking-tight truncate">{displayLabel}</span>
                <StateChip state={userState} size="sm" className="hidden lg:inline-flex" />
              </div>
              <div className="hidden md:flex items-center gap-2 mt-0.5 min-w-0">
                <span className="text-[11px] text-slate-400 font-mono truncate">{STATE_META[userState].label}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" aria-hidden="true" />
                <ProvenanceChip provenance="local" className="!text-[9px] !px-1.5 !py-0" />
                <span className="text-[10px] text-slate-400 font-mono truncate">progress in this browser</span>
              </div>
            </div>
            <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
              <span className="text-[11px]" aria-hidden="true">{level.icon}</span>
              <span className="text-[11px] font-bold font-mono text-amber-300">{totalXp}</span>
            </div>
          </div>

          <div className="hidden md:flex h-8 w-px bg-gradient-to-b from-transparent via-[#1e293b] to-transparent shrink-0" />

          <div className="hidden lg:flex items-center gap-2 xl:gap-3 min-w-0">
            <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2 xl:gap-2.5 px-2.5 xl:px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm hover:bg-[#111d33]/80 hover:border-[#334155]/60 transition-all duration-200 group shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <div className="min-w-0 hidden xl:block">
                <div className="text-[10px] text-slate-400 leading-none font-medium tracking-wide uppercase flex items-center gap-1 truncate">
                  <span aria-hidden="true">{level.icon}</span> <span className="truncate">{level.title} Lv.{level.level}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 min-w-0">
                  <span className="text-[13px] font-bold text-slate-100 leading-none font-mono shrink-0">{totalXp} XP</span>
                  <div className="w-14 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30 shrink-0">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${xpToNext.percent}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="xl:hidden text-[11px] font-mono font-bold text-amber-300">{totalXp}</div>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 relative shrink-0">
          <motion.button data-tour="search" onClick={openSearch} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/60 backdrop-blur-sm hover:bg-[#0f172a]/80 hover:border-[#334155]/60 transition-all duration-200 group cursor-pointer shrink-0 touch-manipulation min-h-[36px]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="text-[12px] text-slate-400 font-mono hidden lg:inline">Search…</span>
            <div className="ml-1 xl:ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1e293b] border border-[#334155]/60 shrink-0">
              <Command className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">K</span>
            </div>
          </motion.button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm shrink-0 max-w-[220px]">
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Module</span>
            <span className="text-[11px] font-semibold text-slate-200 font-mono tracking-wide truncate">{currentModule || '01-intro-wireless'}</span>
            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse ml-1 shrink-0" aria-hidden="true" />
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={toggleTheme}
            role="switch"
            aria-checked={resolved === 'light'}
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
            className="theme-switch relative w-[54px] h-[30px] rounded-full border flex items-center shrink-0 touch-manipulation focus-visible:outline-offset-4"
          >
            <Sun aria-hidden="true" className="absolute left-[6px] w-3.5 h-3.5" />
            <Moon aria-hidden="true" className="absolute right-[6px] w-3.5 h-3.5" />
            <motion.span
              aria-hidden="true"
              className="theme-switch-thumb relative z-[1] w-[22px] h-[22px] rounded-full flex items-center justify-center shadow-sm"
              animate={{ x: resolved === 'light' ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            >
              {resolved === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            </motion.span>
          </motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setNotifOpen(!notifOpen)} aria-label="Activity and notifications" aria-haspopup="dialog" aria-expanded={notifOpen} aria-controls="activity-panel" className="w-11 h-11 xs:w-9 xs:h-9 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] hover:border-[#334155] active:bg-[#1e293b] transition-all duration-200 group relative overflow-hidden shrink-0 touch-manipulation">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <Bell className="w-4 h-4 text-slate-400 group-hover:text-slate-300 relative z-10 transition-all duration-200" aria-hidden="true" />
            {notifCount > 0 ? (
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-white font-mono">{notifCount > 99 ? '99+' : notifCount}</div>
            ) : (
              <div className="absolute top-1 right-1 w-2 h-2 bg-slate-600 rounded-full border border-[#0f172a]" />
            )}
          </motion.button>

          {/* Account menu — the single account entry point in the learner chrome */}
          <div className="relative" ref={accountRef}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setAccountOpen(open => !open)}
              aria-label={`Account menu — ${STATE_META[userState].label}`}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              className="flex items-center gap-1.5 h-11 xs:h-9 px-2 xs:px-1.5 rounded-xl bg-[#0f172a] border border-[#1e293b] hover:bg-[#1e293b] hover:border-[#334155] transition-all duration-200 shrink-0 touch-manipulation"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#334155]/60 bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
                {isOwner(userState) ? <Sparkles className="w-3.5 h-3.5 text-violet-300" /> : isSignedIn(userState) ? <UserRound className="w-3.5 h-3.5 text-cyan-300" /> : <Eye className="w-3.5 h-3.5 text-slate-300" />}
              </span>
              <ChevronDown className={`hidden xs:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </motion.button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  id="account-menu"
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[290px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#334155] bg-[#0a1020]/98 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,.6)] overflow-hidden"
                >
                  <div className="px-4 py-3.5 border-b border-[#1e293b] bg-[#020617]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-slate-100 truncate">{account?.email ?? (isSignedIn(userState) ? 'Signed-in account' : 'Guest learner')}</span>
                      <StateChip state={userState} size="sm" />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{STATE_META[userState].nextAction}</p>
                  </div>

                  <div className="p-1.5">
                    <MenuLink to="/profile" icon={UserRound} label="Profile" onSelect={() => setAccountOpen(false)} />
                    <MenuLink to="/sync" icon={CloudUpload} label="Progress sync" onSelect={() => setAccountOpen(false)} />
                    <MenuLink to="/settings" icon={Lock} label="Settings" onSelect={() => setAccountOpen(false)} />
                    {isSignedIn(userState) && <MenuLink to="/account" icon={Shield} label="Account status" onSelect={() => setAccountOpen(false)} />}
                    {isOwner(userState) && (
                      <>
                        <div className="my-1.5 h-px bg-[#1e293b]" role="separator" />
                        <MenuLink to="/admin" icon={Sparkles} label="Owner console" onSelect={() => setAccountOpen(false)} tone="owner" />
                      </>
                    )}
                    {!isSignedIn(userState) && (
                      <>
                        <div className="my-1.5 h-px bg-[#1e293b]" role="separator" />
                        <MenuLink to="/login" icon={UserRound} label="Log in" onSelect={() => setAccountOpen(false)} />
                        <MenuLink to="/signup" icon={CloudUpload} label="Request an account" onSelect={() => setAccountOpen(false)} tone="primary" />
                      </>
                    )}
                    {isSignedIn(userState) && (
                      <>
                        <div className="my-1.5 h-px bg-[#1e293b]" role="separator" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void handleSignOut()}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-slate-300 transition-colors hover:bg-[#1e293b] hover:text-slate-100"
                        >
                          <LogOut className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> Sign out
                        </button>
                      </>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-[#1e293b] bg-[#020617]/60">
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      Access is decided by the platform, not by this menu. Every account-backed request is checked
                      server-side.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button onClick={openSearch} whileTap={{ scale: 0.95 }} className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 items-center justify-center shadow-soft hover:border-[#475569]/60 transition-all duration-200 group cursor-pointer shrink-0 touch-manipulation">
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-300 tracking-wide">⌘K</span>
          </motion.button>
          <motion.button onClick={openSearch} whileTap={{ scale: 0.94 }} aria-label="Search SecCraft" className="flex sm:hidden w-11 h-11 rounded-xl bg-[#0f172a] border border-[#1e293b] items-center justify-center hover:bg-[#1e293b] transition-all group touch-manipulation shrink-0">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition-colors" />
          </motion.button>
        </div>
      </header>
      <NotificationCenter open={notifOpen} onClose={closeNotifications} />
    </>
  )
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onSelect,
  tone = 'default',
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onSelect: () => void
  tone?: 'default' | 'primary' | 'owner'
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
        tone === 'primary'
          ? 'bg-cyan-300/10 font-semibold text-cyan-100 hover:bg-cyan-300/15'
          : tone === 'owner'
          ? 'text-violet-200 hover:bg-violet-500/10'
          : 'text-slate-300 hover:bg-[#1e293b] hover:text-slate-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {label}
    </Link>
  )
}
