import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on route change (mobile) - use pathname, not children
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isMobile, sidebarOpen])

  // Scroll to top + progress + subtle parallax
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 300
      setShowScrollTop(scrolled)
      const total = document.documentElement.scrollHeight - window.innerHeight
      const progress = total > 0 ? Math.min((window.scrollY / total) * 100, 100) : 0
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#020617] text-slate-100 overflow-x-hidden antialiased">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#0f172a] focus:border focus:border-[#334155] focus:text-slate-100">Skip to content</a>
      
      {/* Scroll progress bar — subtle animated gradient */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-[2px]"
          style={{ left: `${scrollProgress}%` }}
          animate={{ x: [-20, 20] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      </div>

      {/* Background effects — subtle animated orbs + grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        {/* Animated glow orbs — subtle breathing */}
        <motion.div 
          className="absolute top-0 left-0 w-[min(800px,100vw)] h-[min(600px,80vh)] bg-cyan-500/[0.04] rounded-full blur-[100px] md:blur-[120px] -translate-x-1/2 -translate-y-1/2"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={prefersReducedMotion ? undefined : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute top-0 right-0 w-[min(600px,80vw)] h-[min(500px,60vh)] bg-violet-500/[0.04] rounded-full blur-[80px] md:blur-[120px] translate-x-1/3 -translate-y-1/2"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={prefersReducedMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[min(500px,70vw)] h-[min(400px,50vh)] bg-emerald-500/[0.02] rounded-full blur-[80px] md:blur-[100px] translate-x-1/4 translate-y-1/4"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={prefersReducedMotion ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
        <motion.div 
          className="absolute bottom-0 left-1/3 w-[min(400px,60vw)] h-[min(300px,40vh)] bg-amber-500/[0.02] rounded-full blur-[60px] md:blur-[80px]"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={prefersReducedMotion ? undefined : { duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Subtle grid pattern with shimmer */}
        <div className="absolute inset-0 grid-pattern opacity-[0.012] md:opacity-[0.015]" />
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.01] via-transparent to-violet-500/[0.01]"
          animate={prefersReducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
          transition={prefersReducedMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Sidebar */}
      <div className="relative z-30">
        {/* Mobile overlay with blur */}
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 bg-[#020617]/80 z-40 lg:hidden touch-manipulation"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Sidebar container */}
        <div className={`
          fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform
          ${isMobile 
            ? `w-[min(300px,85vw)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.8)]` 
            : 'w-[280px] translate-x-0'
          }
        `}>
          <Sidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        </div>
      </div>

      {/* Main content with page transition */}
      <div className={`relative z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 ${isMobile ? 'pl-0' : 'pl-[280px]'}`}>
        <Topbar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />
        <main id="main-content" className="min-h-[calc(100vh-64px)] min-h-[calc(100dvh-64px)] min-w-0 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 min-w-0 max-w-[100vw] overflow-x-hidden"
          >
            <div className="min-w-0 w-full max-w-[1400px] mx-auto">
              {children}
            </div>
          </motion.div>
        </main>

        {/* Scroll to top button — enhanced with glow */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-4 right-4 z-30 w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-lg hover:bg-[#1e293b] hover:border-[#334155] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all touch-manipulation group"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:-translate-y-0.5 transition-all" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
