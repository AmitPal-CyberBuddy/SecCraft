import { Shield, Swords, RotateCcw, CheckCircle, Zap, Target, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  attack: {
    title: string
    description: string
    evidence: string
    impact: string
  }
  defense: {
    title: string
    description: string
    config: string
  }
  retest: {
    title: string
    description: string
    verification: string
  }
}

export function AttackDefenseRetest({ attack, defense, retest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-cyan-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-[14px] text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
            Attack → Defense → Retest — VAPT Loop
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
              <Sparkles className="w-3 h-3" />
              METHODOLOGY
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attack */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -2, scale: 1.01 }}
            className="group/card relative rounded-xl bg-red-500/[0.03] border border-red-500/10 p-5 hover:bg-red-500/[0.05] hover:border-red-500/15 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-2xl group-hover/card:bg-red-500/10 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-red-500/[0.02] rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                  <Swords className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-red-400 uppercase">Attack</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              </div>
              <div className="text-[13px] font-bold text-slate-100 mb-2 leading-tight">{attack.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed mb-3">{attack.description}</div>
              <div className="text-[11px] font-mono text-slate-500 bg-[#020617]/60 p-3 rounded-xl border border-[#1e293b]/40 backdrop-blur-sm">{attack.evidence}</div>
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 flex gap-2">
                <Zap className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-red-300/80 leading-relaxed">
                  <span className="font-bold">Impact:</span> {attack.impact}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Defense */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -2, scale: 1.01 }}
            className="group/card relative rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 p-5 hover:bg-emerald-500/[0.05] hover:border-emerald-500/15 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover/card:bg-emerald-500/10 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/[0.02] rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">Defense</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[13px] font-bold text-slate-100 mb-2 leading-tight">{defense.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed mb-3">{defense.description}</div>
              <div className="text-[11px] font-mono text-emerald-300/80 bg-[#020617]/60 p-3 rounded-xl border border-emerald-500/15 backdrop-blur-sm whitespace-pre-wrap">{defense.config}</div>
            </div>
          </motion.div>

          {/* Retest */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -2, scale: 1.01 }}
            className="group/card relative rounded-xl bg-cyan-500/[0.03] border border-cyan-500/10 p-5 hover:bg-cyan-500/[0.05] hover:border-cyan-500/15 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl group-hover/card:bg-cyan-500/10 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-cyan-500/[0.02] rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">Retest</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-[13px] font-bold text-slate-100 mb-2 leading-tight">{retest.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed mb-3">{retest.description}</div>
              <div className="text-[11px] text-cyan-300 bg-[#020617]/60 p-3 rounded-xl border border-cyan-500/15 backdrop-blur-sm flex gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" />
                <span className="leading-relaxed">{retest.verification}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 px-4 py-2 rounded-full bg-[#020617]/60 border border-[#1e293b]/40 backdrop-blur-sm">
          <Target className="w-3 h-3 text-violet-400" />
          <span>Learn → Observe → Enumerate → Test → Validate → Evidence → Impact → Remediate → Retest → Report</span>
        </div>
      </div>
    </motion.div>
  )
}
