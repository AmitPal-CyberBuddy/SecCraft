import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const location = useLocation()

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

  // Mobile navigation behaves like a modal drawer: Escape closes it and focus returns to its trigger.
  useEffect(() => {
    if (!isMobile || !sidebarOpen) return
    const focusFrame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#primary-navigation button[aria-label="Close menu"]')?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSidebarOpen(false)
        requestAnimationFrame(() => document.getElementById('mobile-navigation-toggle')?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobile, sidebarOpen])

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
    <div className="min-h-screen min-h-[100dvh] bg-[#0b111b] text-slate-100 overflow-x-hidden antialiased">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#0f172a] focus:border focus:border-[#334155] focus:text-slate-100">Skip to content</a>
      
      {/* Scroll progress bar — subtle animated gradient */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none">
        <motion.div 
          className="h-full bg-cyan-400"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      </div>

      {/* Quiet telemetry-inspired canvas: one restrained instrument-grid, no ambient motion. */}
      <div className="app-canvas fixed inset-0 pointer-events-none" aria-hidden="true" />

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
              onClick={() => { setSidebarOpen(false); requestAnimationFrame(() => document.getElementById('mobile-navigation-toggle')?.focus()) }}
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
          <Sidebar onClose={() => { setSidebarOpen(false); requestAnimationFrame(() => document.getElementById('mobile-navigation-toggle')?.focus()) }} isMobile={isMobile} isOpen={sidebarOpen} />
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
