import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, HardDrive } from 'lucide-react'
import { TOTAL_LESSONS } from '@/content/stats'
import { useSession } from '@/lib/session'
import { isSignedIn } from '@/lib/access'

/**
 * Connectivity notice.
 *
 * The previous copy claimed "nothing to sync (all progress is local)" unconditionally, which is
 * wrong once an account exists. The message now states only what is actually true in the current
 * state: the learning shell keeps working, and nothing is uploaded automatically.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(false)
  const { userState, can } = useSession()
  const accountBacked = can('account-progress')
  const signedIn = isSignedIn(userState)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setShow(true)
      setTimeout(() => setShow(false), 3000)
    }
    const handleOffline = () => {
      setOnline(false)
      setShow(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (!navigator.onLine) setShow(true)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const message = online
    ? accountBacked
      ? 'Back online — the account service is reachable again. Your progress is still only sent when you import it.'
      : 'Back online — lessons, labs, and local progress kept working. Nothing was uploaded.'
    : signedIn
    ? `Offline — the shell, ${TOTAL_LESSONS} lessons, lab datasets, and your local progress all keep working.`
    : `Offline — the shell, ${TOTAL_LESSONS} lessons, lab datasets, and local progress all keep working; nothing is sent anywhere.`

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          role="status"
          aria-live="polite"
          className="fixed top-[64px] left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-xl border shadow-medium flex items-center gap-2.5 backdrop-blur-md"
          style={{
            background: online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          }}
        >
          {online ? <Wifi className="w-4 h-4 shrink-0 text-emerald-400" /> : <WifiOff className="w-4 h-4 shrink-0 text-red-400" />}
          <span className={`text-[12px] font-medium leading-5 ${online ? 'text-emerald-300' : 'text-red-300'}`}>{message}</span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono items-center gap-1 shrink-0">
            <HardDrive className="w-3 h-3" />
            Local record intact
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
