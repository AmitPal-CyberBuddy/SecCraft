import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'
import { Trophy, X, Sparkles, Zap } from 'lucide-react'

export function PointsToast() {
  const lastEarned = useProgressStore(s => s.lastEarnedPoints)
  const clear = useProgressStore(s => s.clearLastEarnedPoints)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (lastEarned) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(() => clear(), 300)
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [lastEarned, clear])

  return (
    <AnimatePresence>
      {visible && lastEarned && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-[200] pointer-events-auto"
        >
          <div className="relative rounded-2xl bg-[#0f172a] border border-cyan-500/30 shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_32px_rgba(34,211,238,0.2),0_8px_32px_rgba(0,0,0,0.5)] px-5 py-4 flex items-center gap-4 min-w-[320px] backdrop-blur-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-glow-cyan shrink-0">
              <Trophy className="w-6 h-6 text-white" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-[#0f172a] flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-[#020617]">+</span>
              </motion.div>
            </div>

            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-slate-100 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  +{lastEarned.amount} XP
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 font-mono">EARNED</span>
              </div>
              <div className="text-[12px] text-slate-300 mt-1 truncate font-medium">{lastEarned.reason}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Keep going — next level awaits!</div>
            </div>

            <div className="relative flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300">BONUS</span>
              </motion.div>
              <button
                onClick={() => { setVisible(false); setTimeout(() => clear(), 300) }}
                className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
