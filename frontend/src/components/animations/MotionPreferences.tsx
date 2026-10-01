import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { motionTiming } from '@/lib/motion'

import { MotionPolicyContext, type MotionPolicy } from './motionPolicy'

function readPolicy(): MotionPolicy {
  if (typeof window === 'undefined') return { reduced: true, compact: true, finePointer: false, paused: false }
  const matches = (query: string) => window.matchMedia?.(query).matches ?? false
  return {
    reduced: document.documentElement.classList.contains('reduce-motion') || matches('(prefers-reduced-motion: reduce)'),
    compact: matches('(max-width: 680px), (max-height: 500px)'),
    finePointer: matches('(hover: hover) and (pointer: fine)'),
    paused: document.visibilityState === 'hidden',
  }
}

/** Live device capabilities, not UA sniffing. Local reduction can never override OS reduction. */
export function MotionPreferences({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.inputMethod = 'keyboard'
    const pointer = () => { root.dataset.inputMethod = 'pointer' }
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Tab') root.dataset.inputMethod = 'keyboard' }
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('keydown', keyboard, true)
    return () => {
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('keydown', keyboard, true)
      delete root.dataset.inputMethod
    }
  }, [])
  const [policy, setPolicy] = useState(readPolicy)
  useEffect(() => {
    const update = () => setPolicy(previous => {
      const next = readPolicy()
      return Object.keys(next).every(key => previous[key as keyof MotionPolicy] === next[key as keyof MotionPolicy]) ? previous : next
    })
    const queries = ['(prefers-reduced-motion: reduce)', '(max-width: 680px), (max-height: 500px)', '(hover: hover) and (pointer: fine)'].map(query => window.matchMedia(query))
    for (const query of queries) query.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      for (const query of queries) query.removeEventListener('change', update)
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.motion = policy.reduced ? 'reduced' : 'full'
    root.dataset.motionPaused = String(policy.paused)
    return () => { delete root.dataset.motion; delete root.dataset.motionPaused }
  }, [policy.reduced, policy.paused])
  const transition = useMemo(() => ({ type: 'tween' as const, duration: policy.reduced || policy.paused ? 0 : policy.compact ? motionTiming.compactControl : motionTiming.control, ease: motionTiming.ease }), [policy.reduced, policy.paused, policy.compact])
  return <MotionPolicyContext.Provider value={policy}><MotionConfig reducedMotion={policy.reduced || policy.paused ? 'always' : 'never'} transition={transition}>{children}</MotionConfig></MotionPolicyContext.Provider>
}
