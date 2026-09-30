import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  hoverLift?: boolean
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'none'
  delay?: number
  onClick?: () => void
}

/** Compatibility wrapper: existing content keeps its grouping without decorative motion or glow. */
export function AnimatedCard({ children, className = '', onClick }: Props) {
  return <div onClick={onClick} className={`ws-panel ${className} ${onClick ? 'cursor-pointer' : ''}`}>{children}</div>
}

export function AnimatedStatCard({ children, className = '' }: { children: ReactNode, className?: string, delay?: number, color?: 'cyan' | 'violet' | 'emerald' | 'amber' }) {
  return <div className={`ws-stat ${className}`}>{children}</div>
}
