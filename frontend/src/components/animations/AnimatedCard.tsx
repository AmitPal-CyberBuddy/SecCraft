import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  hoverLift?: boolean
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'none'
  delay?: number
  onClick?: () => void
}

export function AnimatedCard({ children, className = '', hoverLift = true, glowColor = 'none', delay = 0, onClick }: Props) {
  const glowMap = {
    cyan: 'from-cyan-500/5 to-transparent group-hover:from-cyan-500/10',
    violet: 'from-violet-500/5 to-transparent group-hover:from-violet-500/10',
    emerald: 'from-emerald-500/5 to-transparent group-hover:from-emerald-500/10',
    amber: 'from-amber-500/5 to-transparent group-hover:from-amber-500/10',
    none: 'from-white/[0.02] to-transparent',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverLift ? { y: -2, scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.995 } : undefined}
      onClick={onClick}
      className={`group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden transition-all duration-300 hover:border-[#334155]/80 hover:bg-[#111d33] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${glowMap[glowColor]}`} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

export function AnimatedStatCard({ children, className = '', delay = 0, color = 'cyan' }: { children: ReactNode, className?: string, delay?: number, color?: 'cyan' | 'violet' | 'emerald' | 'amber' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -1, scale: 1.01 }}
      className={`relative rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:border-[#334155]/60 hover:bg-[#020617]/80 transition-all duration-300 group overflow-hidden ${className}`}
    >
      <motion.div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${
          color === 'cyan' ? 'from-cyan-500/5' :
          color === 'violet' ? 'from-violet-500/5' :
          color === 'emerald' ? 'from-emerald-500/5' :
          'from-amber-500/5'
        } to-transparent`}
        initial={false}
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}
