import { motion } from 'framer-motion'
import { useId } from 'react'

interface Props {
  value: number
  size?: number
  strokeWidth?: number
}

export function ProgressRing({ value, size = 88, strokeWidth = 6 }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gradientId = `progress-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="progress-ring relative group" role="progressbar" aria-label="Overall learning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} style={{ width: size, height: size }}>
      <div className="progress-ring-halo absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/15 to-violet-500/15 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <svg aria-hidden="true" width={size} height={size} className="transform -rotate-90 relative z-[1]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#020617"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-80"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.3))' }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(value)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-[20px] font-bold text-slate-100 font-mono tracking-tight"
        >
          {value}%
        </motion.span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">done</span>
      </div>
    </div>
  )
}
