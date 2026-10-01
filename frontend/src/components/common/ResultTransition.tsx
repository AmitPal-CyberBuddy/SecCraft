import { resultMotion } from '@/lib/motion'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useMotionPolicy } from '@/components/animations/motionPolicy'

/** A small settle after deliberate catalogue filters, never search keystrokes.
 * No keys/remounts, opacity, delayed updates, or moving controls/reading content.
 */
export function ResultTransition({ identity, className, children }: { identity: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(identity)
  const { reduced, paused, compact } = useMotionPolicy()
  useLayoutEffect(() => {
    const changed = previous.current !== identity
    previous.current = identity
    if (!changed || reduced || paused || compact || !ref.current?.animate) return
    const recipe = resultMotion({ reduced, paused, compact })
    const animation = ref.current.animate([{ transform: `translateY(${recipe.distance}px)` }, { transform: 'translateY(0)' }], { duration: recipe.duration, easing: recipe.easing })
    return () => animation.cancel()
  }, [identity, reduced, paused, compact])
  return <div ref={ref} className={className} data-result-transition="">{children}</div>
}
