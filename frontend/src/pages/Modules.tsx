import { useState, useMemo } from 'react'
import { ModuleCard } from '@/components/learning/ModuleCard'
import { useProgressStore } from '@/store/useProgressStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Layers, Sparkles, BookOpen, Target, TrendingUp } from 'lucide-react'
import modules from '@/content/modules.json'
import { TOTAL_CHALLENGES, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_SCENARIOS } from '@/content/stats'
import { MAX_XP } from '@/store/useProgressStore'

export function Modules() {
  const [filterPhase, setFilterPhase] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const getProgress = useProgressStore(s => s.getOverallProgress)
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const completedLessons = useProgressStore(s => s.completedLessons.length)

  const filtered = useMemo(() => {
    return modules.filter(m => {
      if (filterPhase && m.phase !== filterPhase) return false
      if (filterStatus && m.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [filterPhase, filterStatus, searchQuery])

  const phaseStats = [1,2,3,4,5,6].map(p => ({
    phase: p,
    count: modules.filter(m => m.phase === p).length,
    completed: modules.filter(m => m.phase === p && getModuleProgress(m.id) === 100).length,
  }))

  return (
    <div className="max-w-[1400px] mx-auto min-w-0 w-full space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Modules</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[13px] text-slate-400">{TOTAL_MODULES} modules • 6 phases • {TOTAL_LESSONS} lessons • {TOTAL_SCENARIOS} decision scenarios • {TOTAL_PCAPS} verified captures</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
                  <Sparkles className="w-3 h-3" />
                  COMPLETE
                </span>
              </div>
            </div>
          </div>
          
          {/* Phase progress */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {phaseStats.map(ps => (
              <div key={ps.phase} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
                <span className="text-[11px] font-mono font-semibold text-slate-400">P{ps.phase}</span>
                <div className="w-12 h-1 bg-[#020617] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${ps.count ? (ps.completed/ps.count)*100 : 0}%` }} />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{ps.completed}/{ps.count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-[12px] font-medium text-slate-300">Overall:</span>
            <span className="text-[13px] font-bold text-slate-100 font-mono">{getProgress()}%</span>
            <div className="w-16 h-1 bg-[#020617] rounded-full overflow-hidden ml-2 border border-[#1e293b]/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-slate-200">{level.icon} {level.title} Lv.{level.level}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-[11px] font-mono text-amber-400">{totalXp} XP</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-[11px] font-mono text-slate-500">{completedLessons}/27 lessons</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 px-3 py-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
            {filtered.length} / {modules.length} modules • path total {MAX_XP} XP
          </div>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {/* Search */}
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search modules, e.g., WPA3, Enterprise, RADIUS, Methodology..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f172a] hover:border-[#334155]/60 hover:bg-[#111d33]/80 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors"
            >
              <span className="text-[12px] text-slate-400">✕</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              <Layers className="w-3 h-3" />
              Phase
            </div>
            <button
              onClick={() => setFilterPhase(null)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                !filterPhase 
                  ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50'
              }`}
            >
              All
            </button>
            {[1,2,3,4,5,6].map(p => (
              <button
                key={p}
                onClick={() => setFilterPhase(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  filterPhase === p 
                    ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50 border border-transparent'
                }`}
              >
                <span>P{p}</span>
                <span className="text-[9px] px-1 py-0 rounded bg-[#020617] border border-[#1e293b] font-mono">
                  {modules.filter(m => m.phase === p).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              <Filter className="w-3 h-3" />
              Type
            </div>
            <button
              onClick={() => setFilterStatus(null)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                !filterStatus ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('simulated')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                filterStatus === 'simulated' 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-glow-emerald' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-emerald-500/5'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SIMULATED
            </button>
            <button
              onClick={() => setFilterStatus('hardware')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                filterStatus === 'hardware' 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-amber-500/5'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              HARDWARE
            </button>
          </div>

          {(filterPhase || filterStatus || searchQuery) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => { setFilterPhase(null); setFilterStatus(null); setSearchQuery('') }}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b]/60 border border-[#334155]/60 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-[#25354f]/60 transition-all duration-200"
            >
              Clear filters ✕
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((m, idx) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                delay: idx * 0.02,
                ease: [0.16, 1, 0.3, 1],
                layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
            >
              <ModuleCard
                id={m.id}
                title={m.title}
                phase={m.phase}
                difficulty={m.difficulty}
                estimated_hours={m.estimated_hours}
                status={m.status}
                progress={useProgressStore.getState().getModuleProgress(m.id)}
                description={m.description}
                locked={false}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#0f172a]/60 border border-dashed border-[#334155]/60 p-12 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="font-heading font-semibold text-[16px] text-slate-300">No modules found</h3>
          <p className="text-[13px] text-slate-500 mt-2">Try adjusting your filters or search query</p>
          <button
            onClick={() => { setFilterPhase(null); setFilterStatus(null); setSearchQuery('') }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:bg-[#25354f] hover:text-slate-100 transition-colors"
          >
            Clear all filters
          </button>
        </motion.div>
      )}

      {/* Footer stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-[#1e293b]/40 text-[11px] font-mono text-slate-500"
      >
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          {TOTAL_MODULES} modules
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {TOTAL_PCAPS} verified captures
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          {TOTAL_CHALLENGES} challenges
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>Zero-cost • Local-first • Offline</span>
      </motion.div>
    </div>
  )
}
