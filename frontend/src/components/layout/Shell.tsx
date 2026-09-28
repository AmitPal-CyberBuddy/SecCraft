import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { motion, AnimatePresence } from 'framer-motion'

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [children])

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute top-0 left-0 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0 grid-pattern opacity-[0.015]" />
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar container */}
        <div className={`
          fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-smooth
          ${isMobile 
            ? `w-[300px] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
            : 'w-[280px] translate-x-0'
          }
        `}>
          <Sidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        </div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 transition-all duration-300 ease-smooth ${isMobile ? 'pl-0' : 'pl-[280px]'}`}>
        <Topbar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />
        <main className="min-h-[calc(100vh-64px)]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 md:p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
