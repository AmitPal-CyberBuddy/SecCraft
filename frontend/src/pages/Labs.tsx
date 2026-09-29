import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { FlaskConical, Search, Filter, Radio, Wifi, FileCode, Activity, Zap, ChevronRight, Sparkles, Target, Layers, Terminal, Upload, Shield, Trophy, Clock, ArrowLeft, Map as MapIcon } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LABS } from '@/content/labs'
import { getModulesForPath, getStatsForPath, TOTAL_PCAPS } from '@/content/stats'
import artifacts from '@/content/lab-artifacts.json'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { TERMINAL_COMMAND_COUNT } from '@/components/terminal/commandCount'
import { TierBadge } from '@/components/common/TierBadge'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'

const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))
const PcapUploader = lazy(() => import('@/components/lab/PcapUploader').then(m => ({ default: m.PcapUploader })))
const EvidenceVault = lazy(() => import('@/components/evidence/EvidenceVault').then(m => ({ default: m.EvidenceVault })))
const LabScoring = lazy(() => import('@/components/lab/LabScoring').then(m => ({ default: m.LabScoring })))

interface PcapInfo {
  id: string
  filename: string
  module: string
  size?: number
  type?: string
  frames?: number
  sha256?: string
  real?: string
}

export function Labs() {
  const { pathId } = useParams()
  const [searchParams] = useSearchParams()
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const queryPath = searchParams.get('path')
  const effectivePathId = queryPath || pathId || currentPathId || 'wireless-pentesting'
  const currentPath = learningPaths.find(p => p.id === effectivePathId) || learningPaths[0]
  const pathModules = useMemo(() => getModulesForPath(effectivePathId), [effectivePathId])
  const pathStats = useMemo(() => getStatsForPath(effectivePathId), [effectivePathId])

  const [pcaps, setPcaps] = useState<PcapInfo[]>([])
  const [parserInfo, setParserInfo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'artifacts' | 'upload' | 'terminal' | 'vault' | 'scoring'>('artifacts')
  const [selectedLabId, setSelectedLabId] = useState<string>(LABS[0]?.id ?? '')

  // For deep link ?pcap=xxx, switch to artifacts tab
  const pcapQuery = searchParams.get('pcap')
  useEffect(() => {
    if (pcapQuery) setActiveTab('artifacts')
  }, [pcapQuery])

  useEffect(() => {
    fetch('/api/pcaps')
      .then(r => r.json())
      .then(data => {
        setPcaps(data.pcaps || [])
        setParserInfo(data.parser)
      })
      .catch(() => {
        const shipped = Object.entries(artifacts.artifacts as Record<string, { group: string; frames: number; sha256: string; path: string; real: string }>)
          .map(([id, meta]) => ({
            id,
            filename: `${id}.pcapng`,
            module: meta.group,
            type: meta.group,
            frames: meta.frames,
            sha256: meta.sha256,
            real: meta.real,
          }))
        setPcaps(shipped)
        setParserInfo({ method: 'platform-labkit (legacy wififorge-labkit)', note: 'bundled offline dataset • zero-cost • local-first' })
      })
  }, [])

  const tierByModule = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of pathModules as Array<{ id: string; lab_requirement?: string; lab_requirement_generic?: string }>) {
      if ((m as any).lab_requirement_generic) map.set(m.id, (m as any).lab_requirement_generic)
      else if ((m as any).lab_requirement) map.set(m.id, (m as any).lab_requirement)
    }
    return map
  }, [pathModules])

  // Path-aware labs
  const labsForPath = useMemo(() => {
    return LABS.filter(l => (l as any).learningPathId === effectivePathId || (!(l as any).learningPathId && effectivePathId === 'wireless-pentesting'))
  }, [effectivePathId])

  const filteredLabs = useMemo(() => {
    return labsForPath.filter(lab => {
      if (filterType && lab.type !== filterType) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return lab.title.toLowerCase().includes(q) || lab.module.toLowerCase().includes(q) || lab.type.toLowerCase().includes(q) || (lab.pcap && lab.pcap.toLowerCase().includes(q))
      }
      return true
    })
  }, [labsForPath, searchQuery, filterType])

  // For wireless path, show pcaps; for other paths, show empty (architecture ready)
  const filteredPcaps = useMemo(() => {
    if (currentPath.status !== 'available') return []
    // If path is wireless, show all; otherwise filter by pathModules groups (currently none)
    return pcaps.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return p.id.toLowerCase().includes(q) || p.filename.toLowerCase().includes(q) || p.module.toLowerCase().includes(q)
      }
      return true
    })
  }, [pcaps, searchQuery, currentPath.status])

  const typeFilters = [...new Set(labsForPath.map(l => l.type))]

  return (
    <div className="max-w-[1400px] mx-auto min-w-0 w-full space-y-4 xs:space-y-6 md:space-y-8">
      {/* Path-aware header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[#0f172a]/60 border border-transparent hover:border-[#1e293b]/60">
            <ArrowLeft className="w-4 h-4" />
            {currentPath.title} — Path Detail
          </Link>
          <span className="text-[11px] px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-slate-400 font-mono flex items-center gap-1.5">
            <MapIcon className="w-3 h-3" /> {currentPath.icon} {currentPath.title} • {currentPath.status.toUpperCase()}
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 xs:gap-6 min-w-0"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-[22px] xs:text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none truncate flex items-center gap-2">
                  Labs <span className="text-[18px]">{currentPath.icon}</span>
                </h1>
                <p className="text-[12px] xs:text-[13px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="hidden sm:inline">Hands-on • Artifact analysis • Config audit • Scenario • Terminal • Evidence vault • Platform-level</span>
                  <span className="sm:hidden">{pathStats.labs} labs • {filteredPcaps.length} artifacts • Terminal • Vault</span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    <Activity className="w-3 h-3" />
                    {currentPath.status === 'available' ? `${filteredPcaps.length} artifacts • verified` : '0 artifacts • planned • architecture ready'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="px-3 xs:px-4 py-2.5 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm flex items-center gap-2.5"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
              <span className="text-[12px] font-medium text-slate-300 hidden xs:inline">{labsForPath.length} labs • Parser:</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-medium ${parserInfo?.method === 'tshark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                {parserInfo?.method?.toUpperCase() || 'OFFLINE DATASET'}
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Tabs — generic */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="w-full overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm w-fit">
          {[
            { id: 'artifacts', label: 'Artifact Library', icon: Radio, count: filteredPcaps.length },
            { id: 'upload', label: 'Upload Custom', icon: Upload, count: null },
            { id: 'terminal', label: 'Terminal', icon: Terminal, count: TERMINAL_COMMAND_COUNT },
            { id: 'vault', label: 'Evidence Vault', icon: Shield, count: null },
            { id: 'scoring', label: 'Scoring', icon: Trophy, count: null },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2.5 rounded-lg text-[12px] xs:text-[13px] font-medium transition-all shrink-0 touch-manipulation min-h-[44px] xs:min-h-0 ${activeTab === tab.id ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count !== null && <span className="text-[10px] px-1.5 py-0 rounded-full bg-[#020617] border border-[#1e293b] font-mono">{tab.count}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'upload' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading PcapUploader…</div>}><PcapUploader /></Suspense>}
      {activeTab === 'terminal' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading terminal…</div>}><TerminalEmulator /></Suspense>}
      {activeTab === 'vault' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading evidence vault…</div>}><EvidenceVault /></Suspense>}
      {activeTab === 'scoring' && (
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading lab scoring…</div>}>
          <div className="space-y-4">
            <div className="sticky top-[64px] z-20 bg-[#020617]/90 backdrop-blur-xl rounded-2xl border border-[#1e293b] p-4 shadow-lg -mx-3 p-3 md:mx-0 md:p-4 xs:p-5">
              <label htmlFor="scoring-lab" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lab to score — {currentPath.title}</label>
              <select
                id="scoring-lab"
                value={selectedLabId}
                onChange={e => setSelectedLabId(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none"
              >
                {labsForPath.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.id} — {lab.title}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                Pick the lab you are working on: the objective, artefact and method prompts below come from that lab's catalogue entry, so you are never shown another lab's answers.
              </p>
            </div>
            <LabScoring labId={selectedLabId} />
          </div>
        </Suspense>
      )}

      {activeTab === 'artifacts' && (
        <>
          {currentPath.status !== 'available' ? (
            <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-[14px] font-semibold text-slate-200">This learning path is planned</div>
              <p className="mt-2 text-[12.5px] text-slate-500 max-w-[600px] mx-auto leading-relaxed">
                Architecture is ready — labs will reuse same engine (artifact analysis, config audit, scenario) as Wireless path.
                Wireless Pentesting (16 verified artifacts, 15 challenges) serves as reference implementation.
              </p>
              <Link to={`/paths/${effectivePathId}`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-300 hover:bg-[#25354f] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to {currentPath.title}
              </Link>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300 min-w-0 w-full"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-cyan-500/[0.03] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xs:gap-4 mb-5 min-w-0">
                    <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-[13px] xs:text-[14px] text-slate-100 truncate">Artifact library — {currentPath.title} • {platform.name} generic engine</h3>
                        <p className="text-[11px] text-slate-500 font-mono truncate">generated structure + decoded offline • verified by scripts/verify-lab-artifacts.py • {platform.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono shrink-0">{filteredPcaps.length} shown • {currentPath.legacyBrand ? `legacy ${currentPath.legacyBrand}` : currentPath.id}</span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono shrink-0">Offline dataset • {parserInfo?.method || 'platform-labkit'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 xs:gap-3 min-w-0">
                    <AnimatePresence>
                      {filteredPcaps.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          layout
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ y: -2, scale: 1.02 }}
                          className="group/pcap p-3.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 backdrop-blur-sm transition-all duration-200 cursor-pointer relative overflow-hidden min-w-0"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/pcap:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex items-start justify-between gap-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="text-[12px] font-mono font-medium text-slate-200 truncate group-hover/pcap:text-slate-100 transition-colors">{p.filename}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155]/60 text-slate-500 truncate">{p.module}</span>
                                <span className="text-slate-600 hidden xs:inline">•</span>
                                <span className="text-slate-500">{p.size ? `${(p.size/1024).toFixed(1)}KB` : `${p.frames || '?'}f`}</span>
                                {p.type && (<><span className="text-slate-600">•</span><span className="text-cyan-400/70">{p.type}</span></>)}
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald shrink-0 mt-1" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col lg:flex-row gap-3 min-w-0"
              >
                <div className="flex-1 relative group min-w-0">
                  <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search labs in ${currentPath.title}, e.g., beacon, handshake, deauth, rogue, captive, Enterprise, EAP...`}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f172a] hover:border-[#334155]/60 hover:bg-[#111d33]/80 transition-all duration-200 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin shrink-0">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase shrink-0">
                      <Layers className="w-3 h-3" />Type
                    </div>
                    <button onClick={() => setFilterType(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 shrink-0 ${!filterType ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300'}`}>All</button>
                    {typeFilters.slice(0, 6).map(type => (
                      <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${filterType === type ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50'}`}>{type.split(' ')[0]}</button>
                    ))}
                  </div>
                  <button className="w-9 h-9 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 flex items-center justify-center hover:bg-[#1e293b]/60 hover:border-[#334155]/60 transition-all duration-200 shrink-0 touch-manipulation">
                    <Filter className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 min-w-0">
                <AnimatePresence mode="popLayout">
                  {filteredLabs.map((lab, idx) => (
                    <motion.div
                      key={lab.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="min-w-0"
                    >
                      <Link to={`/paths/${effectivePathId}/modules/${lab.module}`} className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 hover:border-[#334155] hover:bg-[#111d33] hover:shadow-medium transition-all duration-300 ease-smooth block overflow-hidden min-w-0">
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${lab.color === 'cyan' ? 'from-cyan-500/5 to-transparent' : lab.color === 'emerald' ? 'from-emerald-500/5 to-transparent' : lab.color === 'violet' ? 'from-violet-500/5 to-transparent' : lab.color === 'amber' ? 'from-amber-500/5 to-transparent' : lab.color === 'red' ? 'from-red-500/5 to-transparent' : lab.color === 'pink' ? 'from-pink-500/5 to-transparent' : 'from-slate-500/5 to-transparent'}`} />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative min-w-0">
                          <div className="flex items-start justify-between mb-4 gap-2 min-w-0">
                            <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-1 shrink-0 ${lab.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/15' : lab.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15' : lab.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15' : lab.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/15' : lab.color === 'red' ? 'bg-red-500/10 border-red-500/20 group-hover:bg-red-500/15' : lab.color === 'pink' ? 'bg-pink-500/10 border-pink-500/20 group-hover:bg-pink-500/15' : 'bg-slate-500/10 border-slate-500/20 group-hover:bg-slate-500/15'}`}>
                                <FlaskConical className={`w-5 h-5 ${lab.color === 'cyan' ? 'text-cyan-400' : lab.color === 'emerald' ? 'text-emerald-400' : lab.color === 'violet' ? 'text-violet-400' : lab.color === 'amber' ? 'text-amber-400' : lab.color === 'red' ? 'text-red-400' : lab.color === 'pink' ? 'text-pink-400' : 'text-slate-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-mono text-slate-500 tracking-wide truncate">{lab.module} • {currentPath.shortTitle}</div>
                                <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors truncate">{lab.type}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                              <TierBadge tier={tierByModule.get(lab.module) ?? lab.status} size="xs" />
                            </div>
                          </div>
                          <h3 className="font-heading font-bold text-[15px] text-slate-100 mb-3 leading-tight group-hover:text-white transition-colors duration-200 line-clamp-2">{lab.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="px-2.5 py-1 rounded-full bg-[#1e293b]/80 border border-[#334155]/60 text-[11px] font-medium text-slate-400 group-hover:bg-[#25354f]/80 group-hover:text-slate-300 transition-all duration-200 shrink-0">{lab.difficulty}</span>
                            <span className="text-[11px] text-slate-600 hidden xs:inline">•</span>
                            <span className="text-[11px] font-mono text-slate-500 truncate">{lab.id}</span>
                            {lab.pcap && (<><span className="text-[11px] text-slate-600 hidden xs:inline">•</span><span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 group-hover:text-cyan-400 transition-colors shrink-0"><FileCode className="w-3 h-3" />{lab.pcap}.pcapng</span></>)}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 ml-auto shrink-0" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredLabs.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a]/60 border border-dashed border-[#334155]/60 p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4"><Search className="w-6 h-6 text-slate-500" /></div>
                  <h3 className="font-heading font-semibold text-[16px] text-slate-300">No labs found in {currentPath.title}</h3>
                  <p className="text-[13px] text-slate-500 mt-2">Try adjusting your search or filters — {labsForPath.length} labs total in this path</p>
                </motion.div>
              )}
            </>
          )}
        </>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-4 xs:p-5 backdrop-blur-sm min-w-0 w-full">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-emerald-400" /></div>
          <div className="text-[11px] xs:text-[12px] leading-relaxed min-w-0">
            <div className="font-semibold text-slate-300 mb-1">How these labs work — platform-level • {platform.tagline}</div>
            <div className="text-slate-500 font-mono leading-relaxed break-words">
              <span className="text-emerald-400 font-medium">SIMULATION</span> bundled offline dataset — zero-cost • <span className="text-cyan-400 font-medium">HYBRID</span> config audit + offline • <span className="text-violet-400 font-medium">REAL</span> requires authorized environment (alias RF_REQUIRED for wireless) • <span className="text-amber-400 font-medium">Vault</span> hash + claim + filter + frames • <span className="text-pink-400 font-medium">{TOTAL_PCAPS} artifacts</span> verified • <span className="text-slate-300">{platform.name} generic lab engine</span> supports PCAP, HTTP, APK, config, logs, IAM, Terraform
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
