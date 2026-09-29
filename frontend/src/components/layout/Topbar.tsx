import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { Menu, X, Search, Bell, Command, Zap, Trophy, Target, Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { TOTAL_PCAPS } from '@/content/stats'
import platform from '@/content/platform.json'

interface Props {
  onMenuToggle?: () => void
  sidebarOpen?: boolean
  isMobile?: boolean
}

export function Topbar({ onMenuToggle, sidebarOpen, isMobile }: Props) {
  const overall = useProgressStore(s => s.getOverallProgress())
  const currentModule = useProgressStore(s => s.currentModule)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const achievements = useProgressStore(s => s.achievements)
  // Fix infinite loop: getXpToNextLevel returns new object every call, causes re-render loop if used as selector
  // Compute stable xpToNext via useMemo from totalXp and level (both primitives/stable)
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [notifOpen, setNotifOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-theme') || localStorage.getItem('wififorge-theme')) as 'dark' | 'light' | null : null
      if (saved) setTheme(saved)
    } catch {}
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { 
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('platform-theme', next)
        localStorage.setItem('wififorge-theme', next)
      }
    } catch {}
    try { document.documentElement.classList.toggle('light', next === 'light') } catch {}
  }

  const notifCount = useMemo(() => {
    // Real activity count — lessons + labs + quizzes + achievements with timestamps
    const withTime = [
      ...completedLessons.filter(l => (l as any).completedAt),
      ...completedLabs.filter(l => (l as any).completedAt),
      ...quizScores.filter(q => (q as any).completedAt),
      ...achievements.filter(a => (a as any).unlockedAt),
    ]
    return withTime.length
  }, [completedLessons, completedLabs, quizScores, achievements])

  const openSearch = () => {
    document.dispatchEvent(new CustomEvent('open-search'))
  }

  return (
    <>
    <header data-tour="topbar" className={`h-[56px] xs:h-[60px] md:h-[64px] bg-[#020617]/90 backdrop-blur-2xl border-b sticky top-0 z-30 flex items-center justify-between px-3 xs:px-4 md:px-6 relative min-w-0 w-full transition-all duration-200 ${scrolled ? 'border-[#334155]/80 shadow-lg shadow-black/20' : 'border-[#1e293b]/60'}`}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-transparent to-violet-500/[0.02] pointer-events-none" />

      <div className="flex items-center gap-2 xs:gap-3 md:gap-6 relative min-w-0 flex-1 md:flex-initial">
        {isMobile && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            className="w-11 h-11 xs:w-9 xs:h-9 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] hover:border-[#334155] active:bg-[#1e293b] transition-all duration-200 group lg:hidden shrink-0 touch-manipulation"
          >
            <motion.div animate={{ rotate: sidebarOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              {sidebarOpen ? <X className="w-5 h-5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-slate-200" /> : <Menu className="w-5 h-5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-slate-200" />}
            </motion.div>
          </motion.button>
        )}

        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 flex items-center justify-center shadow-soft relative overflow-hidden group shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <motion.span 
              className="text-[12px] font-bold text-slate-300 font-mono relative z-10"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >OP</motion.span>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#1e293b] shadow-sm">
              <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-full h-full bg-emerald-400 rounded-full animate-ping opacity-30" />
            </div>
          </motion.div>
          <div className="hidden sm:block min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-200 tracking-tight truncate">Operator</span>
              <span className="hidden md:inline-flex text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium shrink-0">ACTIVE</span>
            </div>
            <div className="hidden md:flex items-center gap-2 mt-0.5 min-w-0">
              <span className="text-[11px] text-slate-400 font-mono truncate">local-first • no account</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
              <span className="text-[10px] text-slate-400 font-mono truncate">{TOTAL_PCAPS} captures • offline dataset</span>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
            <span className="text-[11px]">{level.icon}</span>
            <span className="text-[11px] font-bold font-mono text-amber-300">{totalXp}</span>
          </div>
        </div>

        <div className="hidden md:flex h-8 w-px bg-gradient-to-b from-transparent via-[#1e293b] to-transparent shrink-0" />

        <div className="hidden lg:flex items-center gap-2 xl:gap-3 min-w-0">
          <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2 xl:gap-2.5 px-2.5 xl:px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm hover:bg-[#111d33]/80 hover:border-[#334155]/60 transition-all duration-200 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 hidden xl:block">
              <div className="text-[10px] text-slate-400 leading-none font-medium tracking-wide uppercase flex items-center gap-1 truncate">
                <span>{level.icon}</span> <span className="truncate">{level.title} Lv.{level.level}</span>
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

          <motion.div whileHover={{ scale: 1.02 }} className="hidden xl:flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm hover:bg-[#111d33]/80 hover:border-[#334155]/60 transition-all duration-200 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 leading-none font-medium tracking-wide uppercase truncate">Next Level</div>
              <div className="text-[11px] font-bold text-slate-200 leading-none mt-1 font-mono truncate">{xpToNext.nextLevel ? `${xpToNext.needed} XP → ${xpToNext.nextLevel.title}` : 'MAX!'}</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 xs:gap-2 md:gap-3 relative shrink-0">
        <motion.button data-tour="search" onClick={openSearch} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/60 backdrop-blur-sm hover:bg-[#0f172a]/80 hover:border-[#334155]/60 transition-all duration-200 group cursor-pointer shrink-0 touch-manipulation min-h-[36px]">
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-400 transition-colors shrink-0" />
          <span className="text-[12px] text-slate-400 font-mono group-hover:text-slate-400 transition-colors hidden lg:inline">Search...</span>
          <div className="ml-1 xl:ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1e293b] border border-[#334155]/60 shrink-0">
            <Command className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">K</span>
          </div>
        </motion.button>

        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm shrink-0 max-w-[200px]">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Target className="w-3 h-3 text-violet-400" />
          </div>
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Current:</span>
          <span className="text-[11px] font-semibold text-slate-200 font-mono tracking-wide truncate">{currentModule || '02-wifi-fundamentals'}</span>
          <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse ml-1 shrink-0" />
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={toggleTheme} aria-label="Toggle theme" className="w-11 h-11 xs:w-9 xs:h-9 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] hover:border-[#334155] transition-all duration-200 group shrink-0 touch-manipulation">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-400 group-hover:text-slate-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </motion.button>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications" className="w-11 h-11 xs:w-9 xs:h-9 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center hover:bg-[#1e293b] hover:border-[#334155] active:bg-[#1e293b] transition-all duration-200 group relative overflow-hidden shrink-0 touch-manipulation">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <Bell className="w-4 h-4 text-slate-400 group-hover:text-slate-300 relative z-10 group-hover:scale-110 transition-all duration-200" />
          {notifCount > 0 ? (
            <>
              <div className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full border border-[#0f172a] shadow-glow-cyan animate-pulse" />
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-white font-mono">{notifCount > 99 ? '99+' : notifCount}</div>
            </>
          ) : (
            <div className="absolute top-1 right-1 w-2 h-2 bg-slate-600 rounded-full border border-[#0f172a]" />
          )}
        </motion.button>

        <motion.button onClick={openSearch} whileTap={{ scale: 0.95 }} className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 items-center justify-center shadow-soft hover:border-[#475569]/60 hover:from-[#25354f] hover:to-[#1e293b] transition-all duration-200 group cursor-pointer shrink-0 touch-manipulation">
          <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-300 tracking-wide">⌘K</span>
        </motion.button>
      </div>
    </header>
    <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
