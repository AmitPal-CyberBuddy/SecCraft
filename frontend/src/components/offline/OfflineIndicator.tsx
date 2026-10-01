import { useState, useEffect } from 'react'
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
  const [show, setShow] = useState(() => !navigator.onLine)
  const { userState, can } = useSession()
  const accountBacked = can('account-progress')
  const signedIn = isSignedIn(userState)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const handleOnline = () => {
      clearTimeout(hideTimer)
      setOnline(true)
      setShow(true)
      hideTimer = setTimeout(() => setShow(false), 6000)
    }
    const handleOffline = () => {
      clearTimeout(hideTimer)
      setOnline(false)
      setShow(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearTimeout(hideTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const message = online
    ? accountBacked
      ? 'Browser connection restored — account-service availability is not yet confirmed. Progress is only sent when you import it.'
      : 'Browser connection restored. This signal does not confirm server availability; it does not trigger a progress upload.'
    : signedIn
    ? `Offline — the shell, ${TOTAL_LESSONS} lessons, lab datasets, and the progress kept in this browser all keep working.`
    : `Offline — the shell, ${TOTAL_LESSONS} lessons, lab datasets, and the progress kept in this browser all keep working; nothing is sent anywhere.`

  return (
    <>
      {show && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[64px] left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-xl border shadow-medium flex items-center gap-2.5 backdrop-blur-md"
          style={{
            background: online ? 'var(--success-bg)' : 'var(--danger-bg)',
            borderColor: online ? 'var(--success-border)' : 'var(--danger-border)',
          }}
        >
          {online ? <Wifi className="w-4 h-4 shrink-0 text-[var(--success)]" /> : <WifiOff className="w-4 h-4 shrink-0 text-[var(--danger)]" />}
          <span className={`text-[12px] font-medium leading-5 ${online ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{message}</span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono items-center gap-1 shrink-0">
            <HardDrive className="w-3 h-3" />
            Local record intact
          </span>
        </div>
      )}
    </>
  )
}
