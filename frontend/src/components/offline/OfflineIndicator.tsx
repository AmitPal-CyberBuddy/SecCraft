import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, Zap, Cloud, CloudOff } from 'lucide-react'

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setShow(true); setTimeout(() => setShow(false), 3000) }
    const handleOffline = () => { setOnline(false); setShow(true) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // Check initial offline
    if (!navigator.onLine) setShow(true)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-[64px] left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl border shadow-medium flex items-center gap-2.5 backdrop-blur-md" style={{ background: online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
          {online ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
          <span className={`text-[12px] font-medium ${online ? 'text-emerald-300' : 'text-red-300'}`}>
            {online ? 'Back online — syncing progress • PWA offline-first • Evidence vault intact' : 'Offline — PWA working • 80 lessons cached • Labs local-first • No cloud'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono flex items-center gap-1">
            {online ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />} {online ? 'Online' : 'Offline'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
