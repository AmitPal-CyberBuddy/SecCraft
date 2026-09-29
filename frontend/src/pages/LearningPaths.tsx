import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, FlaskConical, Swords, Clock, ChevronRight, Target, Award, Shield } from 'lucide-react'
import learningPaths from '@/content/learning-paths.json'
import { useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LEARNING_PATHS, AVAILABLE_LEARNING_PATHS } from '@/content/stats'

export function LearningPaths() {
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentLearningPathId = useProgressStore(s => s.currentLearningPathId)

  const available = learningPaths.filter(p => p.status === 'available')
  const planned = learningPaths.filter(p => p.status !== 'available')

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10 opacity-70" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none sc-page-title">Learning Paths</h1>
              <p className="text-[13px] text-slate-400 mt-1.5">
                {TOTAL_LEARNING_PATHS} paths • {AVAILABLE_LEARNING_PATHS} available • 1 mature reference path • Zero-cost • Local-first
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">Platform Philosophy</div>
            <div className="text-[13px] text-slate-300 font-medium">Learn. Practice. Investigate. Improve.</div>
            <div className="text-[12px] text-slate-400 mt-1 leading-relaxed">
              Learn cybersecurity by doing — investigate systems, perform security testing, collect evidence, understand impact, remediate, retest, report.
              Wireless Pentesting is the first mature path; architecture is ready for Web, API, Android, Network, AD, Cloud, AI.
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-emerald-400" />
          <h2 className="sc-section-title font-heading font-bold text-[16px] text-slate-100">Available Now</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">{available.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {available.map((path, idx) => {
            const prog = getPathProgress(path.id)
            const isCurrentJourney = currentLearningPathId === path.id
            const journeyState = prog >= 100 ? 'MASTERED' : isCurrentJourney ? 'CURRENT JOURNEY' : prog > 0 ? 'IN PROGRESS' : 'AVAILABLE'
            const journeyTone = prog >= 100 ? 'emerald' : prog > 0 || isCurrentJourney ? 'cyan' : 'slate'
            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/paths/${path.id}`}
                  className={`path-card-available path-card-domain-${path.color} ${isCurrentJourney ? 'is-current-journey' : ''} group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 hover:border-[#334155] hover:bg-[#111d33] transition-all duration-300 block overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${path.color === 'cyan' ? 'from-cyan-500/10 to-transparent' : path.color === 'violet' ? 'from-violet-500/10 to-transparent' : 'from-amber-500/10 to-transparent'}`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-[24px]">{path.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-slate-100 group-hover:text-white transition-colors">{path.title}</span>
                            {path.legacyBrand && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#020617] border border-[#1e293b] text-slate-400 font-mono">{path.legacyBrand}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{path.category} • {path.difficulty} • {path.estimatedHours}h</div>
                        </div>
                      </div>
                      <span className={`path-state path-state-${journeyTone}`}><span className="path-state-dot" />{journeyState}</span>
                    </div>
                    <p className="mt-3 text-[12.5px] text-slate-400 leading-relaxed line-clamp-3">{path.description}</p>
                    {path.tagline && (
                      <div className="mt-3 text-[11px] font-mono text-slate-400 italic">“{path.tagline}”</div>
                    )}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">
                        <BookOpen className="w-3 h-3" /> {path.modules.length} modules
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">
                        <FlaskConical className="w-3 h-3" /> {path.labs} labs
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">
                        <Swords className="w-3 h-3" /> {path.challenges} challenges
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b] text-slate-400">
                        <Clock className="w-3 h-3" /> {path.estimatedHours}h
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-400 font-mono">Path progress</span>
                        <span className="text-[11px] font-mono text-cyan-400">{prog}%</span>
                      </div>
                      <div className="path-progress-track h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50" role="progressbar" aria-label={`${path.title} learning progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={prog}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 1, delay: 0.15 + idx * 0.06, ease: [0.16, 1, 0.3, 1] }} className="path-progress-fill h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-cyan-400 font-medium group-hover:gap-3 transition-all">
                      {isCurrentJourney ? 'Resume your journey' : 'Explore path'} <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-slate-400" />
          <h2 className="sc-section-title font-heading font-bold text-[16px] text-slate-100">Planned Expansion</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 font-mono">{planned.length} planned</span>
          <span className="ml-auto text-[11px] text-slate-400 font-mono hidden sm:inline">Architecture ready — content after Wireless maturity</span>
        </div>
        <div className="planned-path-rail grid grid-cols-1 lg:grid-cols-2 gap-x-8" role="list" aria-label="Planned learning paths">
          {planned.map((path, idx) => (
            <motion.article
              key={path.id}
              role="listitem"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + idx * 0.035, duration: 0.36 }}
              className="planned-path-row group relative flex gap-3.5 py-4"
            >
              <div className="planned-path-node shrink-0" aria-hidden="true"><span>{path.icon}</span></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-slate-200 tracking-tight group-hover:text-slate-100 transition-colors">{path.title}</h3>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-mono">{path.category} <span className="text-slate-600">/</span> {path.estimatedHours}h estimated</div>
                  </div>
                  <span className="shrink-0 text-[9px] px-2 py-1 rounded-full bg-[#172333] border border-[#34465d]/70 text-slate-400 font-mono tracking-wide">PLANNED</span>
                </div>
                <p className="mt-2 text-[11.5px] text-slate-400 leading-relaxed">{path.description}</p>
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  {path.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-[9px] px-2 py-1 rounded-md bg-[#0b131f]/80 border border-[#26384b]/60 text-slate-400 font-mono">{s}</span>
                  ))}
                  {path.skills.length > 3 && <span className="text-[9px] text-slate-400 font-mono">+{path.skills.length - 3} skills</span>}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1">Why one excellent path first?</div>
          <div className="text-[12px] text-slate-400 leading-relaxed">
            A clean architecture with one excellent path is preferable to a shallow platform containing many empty paths.
            Wireless Pentesting (20 modules, 27 lessons, 16 verified captures, 15 challenges, ENG-01) serves as reference implementation.
            Future paths will reuse same lab engine (artifact analysis, config audit), assessment engine, evidence model, skill model.
          </div>
        </div>
      </div>
    </div>
  )
}
