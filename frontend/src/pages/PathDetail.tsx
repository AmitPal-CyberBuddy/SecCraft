import { Link, useParams, Navigate } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import { CheckCircle, Circle, Loader2, Lock, BookOpen, Award, Zap, ChevronRight, ArrowLeft, FlaskConical, Swords, Clock, Target, Shield } from 'lucide-react'
import { getStatsForPath } from '@/content/stats'

export function PathDetail() {
  const { pathId } = useParams()
  const getProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)

  const path = learningPaths.find(p => p.id === pathId)
  if (!path) {
    return <Navigate to="/paths" replace />
  }

  const pathModules = modules.filter(m => (m as any).learningPathId === path.id)
  const stats = getStatsForPath(path.id)
  const pathProgress = getPathProgress(path.id)

  const phases = path.phases.length > 0 ? path.phases : [
    { id: 1, name: 'All Modules', desc: `${pathModules.length} modules`, color: path.color, modules: path.modules }
  ]

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 md:space-y-8">
      <Link to="/paths" className="inline-flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[#0f172a]/60 border border-transparent hover:border-[#1e293b]/60">
        <ArrowLeft className="w-4 h-4" />
        All Learning Paths
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8 overflow-hidden"
      >
        <div className={`absolute inset-0 bg-gradient-to-br opacity-70 ${path.color === 'cyan' ? 'from-cyan-500/10 via-transparent to-violet-500/5' : path.color === 'violet' ? 'from-violet-500/10 via-transparent to-cyan-500/5' : 'from-amber-500/10 via-transparent to-transparent'}`} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#020617]/70 border border-[#1e293b] text-slate-400">{path.id}</span>
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${path.status === 'available' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#020617]/70 border-[#1e293b] text-slate-400'}`}>{path.status.toUpperCase()}</span>
            
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#020617]/70 border border-[#1e293b] text-slate-400">{path.estimatedHours}h</span>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <div className="text-[32px]">{path.icon}</div>
            <div>
              <h1 className="text-[28px] md:text-[32px] font-heading font-bold text-slate-100 leading-tight">{path.title}</h1>
              {path.tagline && <p className="mt-1 text-[13px] text-slate-400 italic">“{path.tagline}”</p>}
              <p className="mt-3 max-w-[800px] text-[13px] text-slate-400 leading-relaxed">{path.longDescription}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
              <div className="text-[18px] font-bold font-mono text-slate-100">{stats.modules}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Modules</div>
            </div>
            <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
              <div className="text-[18px] font-bold font-mono text-slate-100">{stats.lessons}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Lessons</div>
            </div>
            <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
              <div className="text-[18px] font-bold font-mono text-slate-100">{stats.labs}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Labs</div>
            </div>
            <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
              <div className="text-[18px] font-bold font-mono text-cyan-300">{pathProgress}%</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Path Progress</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${pathProgress}%` }} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/paths/${path.id}/modules`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-200 hover:bg-[#25354f] hover:border-[#475569] transition-colors">
              <BookOpen className="w-4 h-4" /> Browse Modules
            </Link>
            <Link to={`/labs?path=${path.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-200 hover:bg-[#25354f] hover:border-[#475569] transition-colors">
              <FlaskConical className="w-4 h-4" /> Labs
            </Link>
            <Link to={`/challenges?path=${path.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-200 hover:bg-[#25354f] hover:border-[#475569] transition-colors">
              <Swords className="w-4 h-4" /> Challenges
            </Link>
          </div>
        </div>
      </motion.div>

      {path.status !== 'available' ? (
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <div className="text-[14px] font-semibold text-slate-200">This path is planned</div>
          <p className="mt-2 text-[12.5px] text-slate-400 max-w-[600px] mx-auto leading-relaxed">
            Architecture is ready — content will be built after Wireless Pentesting maturity.
            Wireless Pentesting (20 modules, 27 lessons, 16 verified captures) serves as reference implementation.
            Same lab engine, assessment engine, evidence model, skill model will be reused.
          </p>
          <Link to="/paths" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-300 hover:bg-[#25354f] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to paths
          </Link>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="font-heading font-bold text-[16px] text-slate-100">Phases & Modules</div>
              <div className="text-[11px] font-mono text-slate-400">{path.modules.length} modules • 6 phases • {path.estimatedHours}h • zero-cost</div>
            </div>
          </div>

          <div className="space-y-8">
            {phases.map((phase, phaseIdx) => {
              const phaseModules = pathModules.filter(m => phase.modules.includes(m.id))
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + phaseIdx * 0.05 }}
                  className="relative"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold border backdrop-blur-sm bg-gradient-to-br ${phase.color === 'cyan' ? 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400' : phase.color === 'violet' ? 'from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400' : phase.color === 'amber' ? 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400' : phase.color === 'emerald' ? 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400' : phase.color === 'pink' ? 'from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400' : 'from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400'}`}>
                      {phase.id}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-100">Phase {phase.id} — {phase.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-mono bg-[#020617]/60 border-[#1e293b] text-slate-400">{phase.modules.length} modules</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{phase.desc}</div>
                    </div>
                  </div>

                  <div className="ml-5 border-l-2 border-[#1e293b]/60 pl-6 space-y-2.5">
                    {phaseModules.map((m, idx) => {
                      const prog = getProgress(m.id)
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + phaseIdx * 0.05 + idx * 0.02 }}
                        >
                          <Link
                            to={`/paths/${path.id}/modules/${m.id}`}
                            className={`group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${prog === 100 ? 'bg-emerald-500/[0.03] border-emerald-500/15 hover:bg-emerald-500/[0.05]' : prog > 0 ? 'bg-cyan-500/[0.03] border-cyan-500/15 hover:bg-cyan-500/[0.05]' : 'bg-[#020617]/60 border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60'}`}
                          >
                            <div className="flex-shrink-0">
                              {prog === 100 ? <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-400" /></div> :
                               prog > 0 ? <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" /></div> :
                               <div className="w-6 h-6 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center"><Circle className="w-3.5 h-3.5 text-slate-400" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-slate-200 truncate">{m.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{m.id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span>{m.difficulty}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span>{m.estimated_hours}h</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[11px] text-slate-400 font-mono px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b]">{prog}%</div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-400 transition-colors" />
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="text-[12px] font-semibold text-slate-200">Methodology</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 leading-relaxed bg-[#0f172a]/60 rounded-lg p-3 border border-[#1e293b]/30">
          Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Retest → Report
        </div>
        <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          This path preserves the existing Wireless Pentesting depth: 20 modules, 27 lessons, 16 verified captures, 15 challenges, 35 decision scenarios, 42-item checklist, ENG-01 engagement.
          Platform philosophy <span className="text-slate-300 font-medium">Forge. Break. Fix. Retest.</span> remains.
        </div>
      </div>
    </div>
  )
}
