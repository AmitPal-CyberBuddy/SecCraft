import tokens from '@/design/motion-tokens.json'

/** Read at action time so changing the OS preference takes effect without a reload. */
export function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' && (document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ? 'instant' : 'smooth'
}

/** Seconds for Framer; CSS is generated from this same source and checked in tests. */
export const motionTiming = {
  control: tokens.duration.control / 1000,
  selection: tokens.duration.selection / 1000,
  panel: tokens.duration.panel / 1000,
  compactControl: tokens.compactDuration.control / 1000,
  compactSelection: tokens.compactDuration.selection / 1000,
  compactPanel: tokens.compactDuration.panel / 1000,
  ease: tokens.ease as [number, number, number, number],
}
export const motionDistance = tokens.distance
export const motionEaseCSS = `cubic-bezier(${tokens.ease.join(',')})`

/** WAAPI uses milliseconds. Quiet/compact catalogue changes have no travel. */
export function resultMotion(policy: { reduced: boolean; paused: boolean; compact: boolean }) {
  return {
    distance: policy.reduced || policy.paused || policy.compact ? 0 : motionDistance.settle,
    duration: policy.reduced || policy.paused || policy.compact ? 0 : tokens.duration.selection,
    easing: motionEaseCSS,
  }
}

export function panelMotion(kind: 'search' | 'activity', policy: { reduced: boolean; paused: boolean; compact: boolean }) {
  const quiet = policy.reduced || policy.paused
  const offset = quiet ? 0 : policy.compact ? motionDistance.settle : kind === 'activity' ? motionDistance.drawer : motionDistance.panel
  return {
    // Text stays opaque: panel placement, not a low-contrast fade-in, explains its origin.
    initial: quiet ? false as const : kind === 'activity' ? { x: offset } : { y: -offset },
    animate: { x: 0, y: 0 },
    transition: { type: 'tween' as const, duration: quiet ? 0 : policy.compact ? motionTiming.compactPanel : motionTiming.panel, ease: motionTiming.ease },
  }
}
