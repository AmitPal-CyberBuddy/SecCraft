import { Link } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import { TOTAL_MODULES } from '@/content/stats'
import { CheckCircle, Circle, Loader2, Lock, Sparkles, Target, BookOpen, Award, Zap, ChevronRight } from 'lucide-react'

export function LearningPath() {
  const getProgress = useProgressStore(s => s.getModuleProgress)

  const phases = [
    { id: 1, name: 'Foundations', desc: 'Wireless fundamentals & 802.11 architecture', color: 'cyan', gradient: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-glow-cyan', modules: modules.filter(m => m.phase === 1) },
    { id: 2, name: 'Reconnaissance', desc: 'Wireless recon & traffic analysis', color: 'violet', gradient: 'from-violet-500/10 to-violet-600/5', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-glow-violet', modules: modules.filter(m => m.phase === 2) },
    { id: 3, name: 'Wi-Fi Security', desc: 'WEP, WPA/WPA2, WPS, WPA3 deep dive', color: 'amber', gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400', glow: '', modules: modules.filter(m => m.phase === 3) },
    { id: 4, name: 'Attack Techniques', desc: 'Deauth, Rogue AP, Captive Portals', color: 'emerald', gradient: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-glow-emerald', modules: modules.filter(m => m.phase === 4) },
    { id: 5, name: 'Enterprise Wi-Fi', desc: 'Enterprise, EAP, RADIUS, Corporate', color: 'pink', gradient: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-500/20', text: 'text-pink-400', glow: '', modules: modules.filter(m => m.phase === 5) },
    { id: 6, name: 'Professional', desc: 'Methodology & Final Assessment', color: 'slate', gradient: 'from-slate-500/10 to-slate-600/5', border: 'border-slate-500/20', text: 'text-slate-400', glow: '', modules: modules.filter(m => m.phase === 6) },
  ]

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 xs:gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Learning Path</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">{TOTAL_MODULES} modules • 6 phases • From fundamentals to professional assessment • Zero-cost</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-cyan-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <div className="font-heading font-bold text-[16px] text-slate-100">Visual Progression</div>
                <div className="text-[11px] font-mono text-slate-500 tracking-widest uppercase">Simplified • Interactive • Premium</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Complete</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>In Progress</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span>Not Started</span>
            </div>
          </div>

          <div className="space-y-8">
            {phases.map((phase, phaseIdx) => (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + phaseIdx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold border backdrop-blur-sm transition-all duration-300 hover:scale-110 bg-gradient-to-br ${phase.gradient} ${phase.border} ${phase.text} ${phase.glow}`}>
                    {phase.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                      <span className="text-[14px] font-bold text-slate-100">Phase {phase.id} — {phase.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${phase.border} ${phase.text} bg-[#020617]/60`}>
                        {phase.modules.length} modules
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{phase.desc}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-16 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
                      <div className={`h-full bg-gradient-to-r rounded-full ${phase.color === 'cyan' ? 'from-cyan-400 to-cyan-500' : phase.color === 'violet' ? 'from-violet-400 to-violet-500' : phase.color === 'amber' ? 'from-amber-400 to-amber-500' : phase.color === 'emerald' ? 'from-emerald-400 to-emerald-500' : phase.color === 'pink' ? 'from-pink-400 to-pink-500' : 'from-slate-400 to-slate-500'}`} style={{ width: `${(phase.modules.filter(m => getProgress(m.id) === 100).length / phase.modules.length) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{phase.modules.filter(m => getProgress(m.id) === 100).length}/{phase.modules.length}</span>
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-[#1e293b]/60 pl-6 space-y-2.5 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b opacity-30 ${phase.color === 'cyan' ? 'from-cyan-500/50 to-transparent' : phase.color === 'violet' ? 'from-violet-500/50 to-transparent' : phase.color === 'amber' ? 'from-amber-500/50 to-transparent' : phase.color === 'emerald' ? 'from-emerald-500/50 to-transparent' : phase.color === 'pink' ? 'from-pink-500/50 to-transparent' : 'from-slate-500/50 to-transparent'}`} />
                  {phase.modules.map((m, idx) => {
                    const prog = getProgress(m.id)
                    const isLocked = phase.id > 1 && m.id !== '05-wireless-recon' && prog === 0 && getProgress(modules[0].id) === 0
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + phaseIdx * 0.05 + idx * 0.02 }}
                        whileHover={{ x: 4, scale: 1.01 }}
                      >
                        <Link
                          to={`/modules/${m.id}`}
                          className={`group/module flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                            isLocked 
                              ? 'bg-[#020617]/40 border-[#1e293b]/30 opacity-60' 
                              : prog === 100
                                ? 'bg-emerald-500/[0.03] border-emerald-500/15 hover:bg-emerald-500/[0.05] hover:border-emerald-500/20'
                                : prog > 0
                                  ? 'bg-cyan-500/[0.03] border-cyan-500/15 hover:bg-cyan-500/[0.05] hover:border-cyan-500/20'
                                  : 'bg-[#020617]/60 border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 hover:shadow-soft'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {prog === 100 ? <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-400" /></div> :
                             prog > 0 ? <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" /></div> :
                             isLocked ? <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center"><Lock className="w-3 h-3 text-slate-600" /></div> :
                             <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center group-hover/module:bg-[#25354f] group-hover/module:border-[#475569] transition-colors"><Circle className="w-3.5 h-3.5 text-slate-600 group-hover/module:text-slate-400 transition-colors" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-200 truncate group-hover/module:text-slate-100 transition-colors">{m.title}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{m.id}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span>{m.difficulty}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span>{m.estimated_hours}h</span>
                              <span className={`hidden sm:inline-flex px-1.5 py-0 rounded-full border text-[9px] font-mono ml-1 ${m.status === 'simulated' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{m.status.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-[11px] text-slate-400 font-mono px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b] group-hover/module:border-[#334155] transition-colors">{prog}%</div>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover/module:text-slate-400 group-hover/module:translate-x-0.5 transition-all duration-200" />
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>

                {phase.id < 6 && (
                  <div className="ml-5 mt-6 flex items-center gap-3">
                    <div className="w-px h-8 bg-gradient-to-b from-[#1e293b] to-transparent ml-5" />
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 px-3 py-1.5 rounded-full bg-[#020617]/60 border border-[#1e293b]/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse" />
                      next phase
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-5 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><CheckCircle className="w-4 h-4 text-emerald-400" /> Completed</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Loader2 className="w-4 h-4 text-cyan-400" /> In Progress</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Circle className="w-4 h-4 text-slate-600" /> Not Started</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Lock className="w-4 h-4 text-slate-600" /> Locked</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-emerald-400">SIMULATED</span> = No hardware
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-amber-400">HARDWARE</span> = RF adapter
        </div>
      </motion.div>
    </div>
  )
}
