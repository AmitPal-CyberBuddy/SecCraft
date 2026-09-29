import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useState, useMemo, lazy, Suspense } from 'react'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Swords, Trophy, Target, Sparkles, Layers, Clock, Award, ArrowLeft, Map as MapIcon } from 'lucide-react'
import challenges from '@/content/challenges.json'
import { ACHIEVEMENTS_DEF, useProgressStore } from '@/store/useProgressStore'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import learningPaths from '@/content/learning-paths.json'
import { getChallengesForPath } from '@/content/stats'

const BadgesShowcase = lazy(() => import('@/components/gamification/BadgesShowcase').then(m => ({ default: m.BadgesShowcase })))

export function Challenges() {
  const { pathId } = useParams()
  const [searchParams] = useSearchParams()
  const currentPathIdStore = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const queryPath = searchParams.get('path')
  const effectivePathId = queryPath || pathId || currentPathIdStore || 'wireless-pentesting'
  const currentPath = learningPaths.find(p => p.id === effectivePathId) || learningPaths[0]

  const [filterLevel, setFilterLevel] = useState<string | null>(null)
  const [filterDiff, setFilterDiff] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'challenges' | 'badges'>('challenges')

  const challengesForPath = useMemo(() => {
    const list = getChallengesForPath(effectivePathId)
    if (list.length === 0 && effectivePathId === 'wireless-pentesting') {
      return (challenges as any[]).filter(c => !(c as any).learningPathId || (c as any).learningPathId === effectivePathId)
    }
    return list
  }, [effectivePathId])

  const filtered = useMemo(() => {
    return challengesForPath.filter(c => {
      if (filterLevel && c.level !== filterLevel) return false
      if (filterDiff && c.difficulty !== filterDiff) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.module.toLowerCase().includes(q) || (c.skills as string[]).some((s: string) => s.toLowerCase().includes(q))
      }
      return true
    })
  }, [challengesForPath, filterLevel, filterDiff, searchQuery])

  const totalPoints = challengesForPath.reduce((sum, c) => sum + c.points, 0)

  const levels = [
    { id: 'guided', label: 'Guided', desc: 'Step-by-step with commands, expected output, explanations. For learning.', icon: 'G', color: 'cyan', count: challengesForPath.filter(c => c.level === 'guided').length, points: challengesForPath.filter(c => c.level === 'guided').reduce((s,c) => s+c.points,0) },
    { id: 'semi-guided', label: 'Semi-guided', desc: 'Objective + tools given, no exact command. You figure methodology.', icon: 'S', color: 'violet', count: challengesForPath.filter(c => c.level === 'semi-guided').length, points: challengesForPath.filter(c => c.level === 'semi-guided').reduce((s,c) => s+c.points,0) },
    { id: 'assessment', label: 'Assessment', desc: 'Only scope + artifacts. You determine methodology, like real engagement.', icon: 'A', color: 'amber', count: challengesForPath.filter(c => c.level === 'assessment').length, points: challengesForPath.filter(c => c.level === 'assessment').reduce((s,c) => s+c.points,0) },
  ]

  return (
    <div className="max-w-[1400px] mx-auto min-w-0 w-full space-y-6 md:space-y-8">
      {/* Path-aware breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[#0f172a]/60 border border-transparent hover:border-[#1e293b]/60">
          <ArrowLeft className="w-4 h-4" />
          {currentPath.title} — Path Detail
        </Link>
        <span className="text-[11px] px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-slate-400 font-mono flex items-center gap-1.5">
          <MapIcon className="w-3 h-3" /> {currentPath.icon} {currentPath.title} • {currentPath.status.toUpperCase()} • {challengesForPath.length} challenges
        </span>
      </div>

      {/* Header — path-aware */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none flex items-center gap-2 sc-page-title">
                Challenges <span className="text-[20px]">{currentPath.icon}</span>
              </h1>
              <p className="text-[13px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                <span>Guided → Semi-guided → Assessment • {currentPath.title} • Platform-level challenge engine</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#0f172a]/80 border border-[#1e293b]/60">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="font-mono font-medium text-slate-300">{challengesForPath.length} challenges</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="font-mono text-amber-400 font-bold">{totalPoints} pts</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="font-mono text-slate-400">{currentPath.shortTitle}</span>
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="px-4 py-2.5 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm flex items-center gap-2"
          >
            <Target className="w-4 h-4 text-violet-400" />
            <span className="text-[12px] font-medium text-slate-300">Showing</span>
            <span className="text-[12px] font-bold text-slate-100 font-mono">{filtered.length} / {challengesForPath.length}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs — challenges and achievements */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="w-full overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm w-fit">
          {[
            { id: 'challenges', label: 'Challenges', icon: Swords, count: challengesForPath.length },
            { id: 'badges', label: 'Achievements', icon: Award, count: ACHIEVEMENTS_DEF.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all shrink-0 touch-manipulation min-h-[44px] ${activeTab === tab.id ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-400 hover:text-slate-300 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count && <span className="text-[10px] px-1.5 py-0 rounded-full bg-[#020617] border border-[#1e293b] font-mono">{tab.count}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'badges' && <Suspense fallback={<LoadingPanel label="Loading Badges…" />}><BadgesShowcase /></Suspense>}

      {activeTab === 'challenges' && (
      <>
      {currentPath.status !== 'available' ? (
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <div className="text-[14px] font-semibold text-slate-200">This path is planned — challenges coming soon</div>
          <p className="mt-2 text-[12.5px] text-slate-400 max-w-[600px] mx-auto leading-relaxed">
            Architecture is ready — same challenge engine (guided → semi-guided → assessment) will be reused.
            Wireless Pentesting (15 challenges, 45 tasks, flags WIFIFORGE legacy) is reference implementation.
          </p>
          <Link to={`/paths/${effectivePathId}`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-300 hover:bg-[#25354f] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to {currentPath.title}
          </Link>
        </div>
      ) : (
        <>
          {/* Level Cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            {levels.map((lvl, idx) => (
              <motion.div
                key={lvl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2, scale: 1.01 }}
                onClick={() => setFilterLevel(filterLevel === lvl.id ? null : lvl.id)}
                className={`
                  group relative rounded-2xl border p-5 cursor-pointer overflow-hidden transition-all duration-300 ease-smooth
                  ${filterLevel === lvl.id 
                    ? lvl.color === 'cyan' ? 'bg-[#0f172a] border-cyan-500/40 shadow-glow-cyan' :
                      lvl.color === 'violet' ? 'bg-[#0f172a] border-violet-500/40 shadow-glow-violet' :
                      'bg-[#0f172a] border-amber-500/40'
                    : 'bg-[#0f172a] border-[#1e293b] hover:border-[#334155] hover:bg-[#111d33] hover:shadow-soft'
                  }
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  lvl.color === 'cyan' ? 'from-cyan-500/[0.04] to-transparent' :
                  lvl.color === 'violet' ? 'from-violet-500/[0.04] to-transparent' :
                  'from-amber-500/[0.04] to-transparent'
                }`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`
                      w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-[13px] transition-all duration-300 group-hover:scale-110
                      ${lvl.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/15' :
                        lvl.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 group-hover:bg-violet-500/15' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/15'
                      }
                    `}>
                      {lvl.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-400">{lvl.count} chals</span>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                        lvl.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        lvl.color === 'violet' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>{lvl.points} pts</span>
                    </div>
                  </div>
                  <h3 className="font-heading font-semibold text-[14px] text-slate-100 group-hover:text-white transition-colors">{lvl.label}</h3>
                  <p className="text-[12px] text-slate-400 mt-1 leading-relaxed group-hover:text-slate-300 transition-colors">{lvl.desc}</p>
                  {filterLevel === lvl.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`mt-3 inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-mono font-medium ${
                        lvl.color === 'cyan' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' :
                        lvl.color === 'violet' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' :
                        'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      ACTIVE FILTER
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Search + Filters */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row gap-3 sticky top-[64px] z-20 bg-[#020617]/90 backdrop-blur-xl p-3 -mx-3 rounded-xl border border-[#1e293b]/30 shadow-lg shadow-black/10"
          >
            <div className="flex-1 relative group">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search challenges in ${currentPath.title}...`}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm text-[13px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f172a] hover:border-[#334155]/60 hover:bg-[#111d33]/80 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                  <Layers className="w-3 h-3" />
                  Level
                </div>
                <button onClick={() => setFilterLevel(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${!filterLevel ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                <button onClick={() => setFilterLevel('guided')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${filterLevel === 'guided' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-glow-cyan' : 'text-slate-400 hover:text-slate-300'}`}>Guided</button>
                <button onClick={() => setFilterLevel('semi-guided')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${filterLevel === 'semi-guided' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'text-slate-400 hover:text-slate-300'}`}>Semi</button>
                <button onClick={() => setFilterLevel('assessment')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${filterLevel === 'assessment' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-300'}`}>Assess</button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                  <Filter className="w-3 h-3" />
                  Diff
                </div>
                <button onClick={() => setFilterDiff(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${!filterDiff ? 'bg-[#1e293b] text-slate-100 border border-[#334155]' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                {['Beginner','Intermediate','Advanced','Professional'].map(d => (
                  <button key={d} onClick={() => setFilterDiff(d)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${filterDiff === d ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-400 hover:text-slate-300 hover:bg-[#1e293b]/50'}`}>{d.slice(0,4)}</button>
                ))}
              </div>

              {(filterLevel || filterDiff || searchQuery) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setFilterLevel(null); setFilterDiff(null); setSearchQuery('') }}
                  className="px-3 py-1.5 rounded-xl bg-[#1e293b]/60 border border-[#334155]/60 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-[#25354f]/60 transition-all duration-200 shrink-0"
                >
                  Clear ✕
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Challenges Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((chal, idx) => (
                <motion.div
                  key={chal.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1], layout: { duration: 0.3 } }}
                >
                  <ChallengeCard {...chal} />
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
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-heading font-semibold text-[16px] text-slate-300">No challenges found in {currentPath.title}</h3>
              <p className="text-[13px] text-slate-400 mt-2">Try adjusting your filters — {currentPath.title} has {challengesForPath.length} challenges</p>
            </motion.div>
          )}
        </>
      )}
      </>
      )}
    </div>
  )
}
