import { useEffect, useRef, useState } from 'react'
import { useProgressStore } from '@/store/useProgressStore'
import { Check, X } from 'lucide-react'

/** A new local event gets one checkmark, never a bouncing card or a replayed total. */
export function PointsToast() {
  const earned = useProgressStore(s => s.lastEarnedPoints)
  const toast = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')

  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    const active = document.activeElement
    if (earned && active instanceof HTMLElement && !toast.current?.contains(active)) returnFocus.current = active
  }, [earned])

  useEffect(() => {
    if (!earned || hovered || focused || hidden) return
    const timer = setTimeout(() => {
      // A stale dismissal can never clear the next achievement/event.
      if (useProgressStore.getState().lastEarnedPoints === earned) useProgressStore.getState().clearLastEarnedPoints()
    }, 8000)
    return () => clearTimeout(timer)
  }, [earned, hovered, focused, hidden])

  const dismiss = () => {
    const hadFocus = toast.current?.contains(document.activeElement)
    if (useProgressStore.getState().lastEarnedPoints === earned) useProgressStore.getState().clearLastEarnedPoints()
    setHovered(false)
    setFocused(false)
    if (hadFocus && returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true })
  }

  return <div ref={toast} className="sc-earned-toast"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    {/* The live region exists before its text changes. The dismiss control is not announced as a status. */}
    <div role="status" aria-live="polite" aria-atomic="true">
      {earned && <div className="sc-earned-message">
        <span key={`${earned.at}:${earned.reason}`} className="sc-earned-mark" aria-hidden="true"><Check size={20} /></span>
        <div><strong>+{earned.amount} XP</strong><p>{earned.reason}</p><small>Browser-local practice progress · unverified</small></div>
      </div>}
    </div>
    {earned && <button type="button" onClick={dismiss} aria-label="Dismiss XP earned notification"><X size={18} aria-hidden="true" /></button>}
  </div>
}
