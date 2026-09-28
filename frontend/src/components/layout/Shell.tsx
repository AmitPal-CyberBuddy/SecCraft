import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { motion, AnimatePresence } from 'framer-motion'

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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

  // Close sidebar on route change (mobile) - use pathname, not children (children new object every render causes loop)
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

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#020617] text-slate-100 overflow-x-hidden antialiased">
      {/* Background effects - optimized for mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute top-0 left-0 w-[min(800px,100vw)] h-[min(600px,80vh)] bg-cyan-500/[0.04] rounded-full blur-[100px] md:blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-[min(600px,80vw)] h-[min(500px,60vh)] bg-violet-500/[0.04] rounded-full blur-[80px] md:blur-[120px] translate-x-1/3 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[min(500px,70vw)] h-[min(400px,50vh)] bg-emerald-500/[0.02] rounded-full blur-[80px] md:blur-[100px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0 grid-pattern opacity-[0.012] md:opacity-[0.015]" />
      </div>

      {/* Sidebar */}
      <div className="relative z-30">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-40 lg:hidden touch-manipulation"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Sidebar container - responsive width, proper touch handling */}
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

      {/* Main content */}
      <div className={`relative z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 ${isMobile ? 'pl-0' : 'pl-[280px]'}`}>
        <Topbar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />
        <main className="min-h-[calc(100vh-64px)] min-h-[calc(100dvh-64px)] min-w-0 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-8 min-w-0 max-w-[100vw] overflow-x-hidden"
          >
            <div className="min-w-0 w-full max-w-[1400px] mx-auto">
              {children}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
