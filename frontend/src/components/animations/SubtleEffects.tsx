import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function PulseDot({ color = 'emerald', size = 'sm' }: { color?: 'emerald' | 'cyan' | 'amber' | 'violet', size?: 'sm' | 'md' }) {
  const colorMap = {
    emerald: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    amber: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    violet: 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]',
  }
  const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2' }
  return (
    <span className="relative inline-flex">
      <span className={`${sizeMap[size]} ${colorMap[color]} rounded-full animate-pulse`} />
      <span className={`absolute inset-0 ${sizeMap[size]} ${colorMap[color]} rounded-full animate-ping opacity-30`} />
    </span>
  )
}

export function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
      />
    </div>
  )
}

export function FloatingElement({ children, delay = 0, duration = 6, y = 6, className = '' }: { children: ReactNode, delay?: number, duration?: number, y?: number, className?: string }) {
  return (
    <motion.div
      animate={{ y: [-y/2, y/2, -y/2] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function GlowOrb({ color = 'cyan', size = 200, className = '', animate = true }: { color?: 'cyan' | 'violet' | 'emerald' | 'amber', size?: number, className?: string, animate?: boolean }) {
  const colors = {
    cyan: 'bg-cyan-500/[0.04]',
    violet: 'bg-violet-500/[0.04]',
    emerald: 'bg-emerald-500/[0.03]',
    amber: 'bg-amber-500/[0.04]',
  }
  return (
    <motion.div
      className={`absolute rounded-full blur-[80px] pointer-events-none ${colors[color]} ${className}`}
      style={{ width: size, height: size }}
      animate={animate ? { scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] } : undefined}
      transition={animate ? { duration: 8, repeat: Infinity, ease: 'easeInOut' } : undefined}
    />
  )
}

export function GradientBorder({ children, className = '', active = false }: { children: ReactNode, className?: string, active?: boolean }) {
  return (
    <div className={`relative rounded-2xl p-px ${active ? 'bg-gradient-to-br from-cyan-500/30 via-violet-500/20 to-transparent' : 'bg-[#1e293b]/60'} ${className}`}>
      <div className="rounded-2xl bg-[#0f172a] h-full">{children}</div>
    </div>
  )
}

export function SpotlightCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <div className={`group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden ${className}`}>
      <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/0 via-violet-500/0 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:via-violet-500/5 group-hover:to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">{children}</div>
    </div>
  )
}

export function AnimatedCounter({ value, className = '' }: { value: number, className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {value}
    </motion.span>
  )
}

export function HoverScale({ children, scale = 1.02, className = '' }: { children: ReactNode, scale?: number, className?: string }) {
  return (
    <motion.div whileHover={{ scale }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  )
}
