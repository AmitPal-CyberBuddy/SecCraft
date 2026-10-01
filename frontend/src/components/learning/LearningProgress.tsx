import { motion } from 'framer-motion'
import { useMotionPolicy } from '@/components/animations/motionPolicy'
import { motionTiming } from '@/lib/motion'

/** Animate only a real value change, never manufacture a zero-to-total entrance. */
export function LearningProgress({ value, label }: { value: number; label: string }) {
  const policy = useMotionPolicy()
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  return <span className="sc-learning-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
    <motion.span initial={false} animate={{ scaleX: percent / 100 }} transition={{ type: 'tween', duration: policy.reduced || policy.paused ? 0 : policy.compact ? motionTiming.compactSelection : motionTiming.selection, ease: motionTiming.ease }} />
  </span>
}
