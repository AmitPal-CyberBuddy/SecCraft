import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ReadingProgressProps {
  targetId?: string // ID of scroll container, defaults to window
  className?: string
}

export function ReadingProgress({ targetId, className = '' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      let scrollTop = 0
      let scrollHeight = 0
      let clientHeight = 0

      if (targetId) {
        const el = document.getElementById(targetId)
        if (!el) return
        scrollTop = el.scrollTop
        scrollHeight = el.scrollHeight
        clientHeight = el.clientHeight
      } else {
        scrollTop = window.scrollY
        scrollHeight = document.documentElement.scrollHeight
        clientHeight = window.innerHeight
      }

      const total = scrollHeight - clientHeight
      const pct = total > 0 ? Math.min((scrollTop / total) * 100, 100) : 0
      setProgress(pct)
    }

    const target = targetId ? document.getElementById(targetId) : window
    if (target) {
      target.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (target) target.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [targetId])

  return (
    <div className={`fixed top-0 left-0 right-0 h-[3px] z-[100] pointer-events-none ${className}`}>
      <motion.div
        className="h-full bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 origin-left"
        style={{ width: `${progress}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
      </motion.div>
    </div>
  )
}

export function LessonReadingProgress({ content }: { content: string }) {
  const [stats, setStats] = useState({ words: 0, minutes: 0, progress: 0 })

  useEffect(() => {
    const words = content.split(/\s+/).filter(Boolean).length
    const minutes = Math.max(1, Math.ceil(words / 220)) // 220 wpm avg
    setStats(s => ({ ...s, words, minutes }))
  }, [content])

  useEffect(() => {
    const handleScroll = () => {
      const el = document.getElementById('lesson-markdown-content')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const fullHeight = el.scrollHeight
      const visibleTop = Math.max(0, -rect.top)
      const progress = Math.min((visibleTop / (fullHeight - windowHeight * 0.5)) * 100, 100)
      setStats(s => ({ ...s, progress: Math.max(0, Math.min(100, progress)) }))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [content])

  return (
    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
      <span className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        {stats.words.toLocaleString()} words
      </span>
      <span className="w-1 h-1 rounded-full bg-slate-700" />
      <span>{stats.minutes} min read</span>
      <span className="w-1 h-1 rounded-full bg-slate-700" />
      <span className="flex items-center gap-2">
        <div className="w-16 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full transition-all duration-150" style={{ width: `${stats.progress}%` }} />
        </div>
        {Math.round(stats.progress)}%
      </span>
    </div>
  )
}
