import { moduleOrdinal } from '@/content/module-ordinal'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Search, Radio, FileCode, Layers, Terminal, Upload, Shield, Trophy, Clock, ArrowLeft } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LABS } from '@/content/labs'
import { getModulesForPath, getStatsForPath } from '@/content/stats'
import artifacts from '@/content/lab-artifacts.json'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { TERMINAL_COMMAND_COUNT } from '@/components/terminal/commandCount'
import { TierBadge } from '@/components/common/TierBadge'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'
import { apiFetch, discardResponseBody } from '@/lib/api'

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
  const completedLabs = useProgressStore(s => s.completedLabs)
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
    apiFetch('/api/pcaps')
      .then(async response => {
        if (!response.ok) {
          await discardResponseBody(response)
          throw new Error(`PCAP catalogue API responded ${response.status}`)
        }
        return response.json()
      })
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
    if (currentPath.status !== 'available' || currentPath.id !== 'wireless-pentesting') return []
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
    <div className="ws-legacy ws-lab-workspace max-w-[1400px] mx-auto min-w-0 w-full space-y-4 xs:space-y-6 md:space-y-8">
      <nav className="ws-breadcrumb" aria-label="Breadcrumb"><Link to={`/paths/${effectivePathId}`}>{currentPath.title}</Link><span aria-hidden="true">/</span><span aria-current="page">Labs</span></nav>
      <header className="sc-practice-header"><div><p className="sc-library-domain">Practice / {currentPath.category}</p><h1>Security lab library</h1><p>Work through scoped objectives, supplied artifacts and local tools. Record what the evidence supports; completion is not trusted grading.</p></div><div className="sc-practice-summary"><strong>{pathStats.labs}</strong><span>labs in this path</span><small>{currentPath.id === 'android-pentesting' ? 'Original source cases · no prebuilt APK' : `${filteredPcaps.length} supplied captures`} · {currentPath.status === 'available' ? 'Available' : 'Planned'}</small></div></header>
      {/* Tabs — generic */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="w-full overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--panel-bg)]/80 border border-[var(--line-normal)]/60  w-fit">
          {[
            { id: 'artifacts', label: 'Artifact Library', icon: Radio, count: currentPath.id === 'android-pentesting' ? filteredLabs.length : filteredPcaps.length },
            { id: 'upload', label: 'Upload Custom', icon: Upload, count: null },
            { id: 'terminal', label: 'Terminal', icon: Terminal, count: TERMINAL_COMMAND_COUNT },
            { id: 'vault', label: 'Evidence Vault', icon: Shield, count: null },
            { id: 'scoring', label: 'Scoring', icon: Trophy, count: null },
          ].filter(tab => currentPath.id !== 'android-pentesting' || tab.id === 'artifacts').map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2.5 rounded-lg text-[12px] xs:text-[13px] font-medium transition-all shrink-0 touch-manipulation min-h-[44px] xs:min-h-0 ${activeTab === tab.id ? 'bg-[#1e293b] text-[var(--ink-primary)] border border-[var(--line-strong)] shadow-soft' : 'text-slate-400 hover:text-slate-300 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count !== null && <span className="text-[10px] px-1.5 py-0 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono">{tab.count}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'upload' && <Suspense fallback={<LoadingPanel label="Loading PcapUploader…" />}><PcapUploader /></Suspense>}
      {activeTab === 'terminal' && <Suspense fallback={<LoadingPanel label="Loading terminal…" />}><TerminalEmulator /></Suspense>}
      {activeTab === 'vault' && <Suspense fallback={<LoadingPanel label="Loading evidence vault…" />}><EvidenceVault /></Suspense>}
      {activeTab === 'scoring' && (
        <Suspense fallback={<LoadingPanel label="Loading lab scoring…" />}>
          <div className="space-y-4">
            <div className="sticky top-[64px] z-20 bg-[var(--panel-inset)]/90 backdrop-blur-xl rounded-2xl border border-[var(--line-normal)] p-4 shadow-lg -mx-3 p-3 md:mx-0 md:p-4 xs:p-5">
              <label htmlFor="scoring-lab" className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Lab to score — {currentPath.title}</label>
              <select
                id="scoring-lab"
                value={selectedLabId}
                onChange={e => setSelectedLabId(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none"
              >
                {labsForPath.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.id} — {lab.title}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-2">
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
            <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-[14px] font-semibold text-slate-200">This learning path is planned</div>
              <p className="mt-2 text-[12.5px] text-slate-400 max-w-[600px] mx-auto leading-relaxed">
                No labs are available in this planned path yet. Explore an available path to work with its supplied artifacts.
              </p>
              <Link to={`/paths/${effectivePathId}`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] text-[12px] text-slate-300 hover:bg-[#25354f] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to {currentPath.title}
              </Link> <Link to="/paths" className="mt-4 inline-flex items-center px-4 py-2 text-cyan-300 underline">Explore available paths →</Link>
            </div>
          ) : (
            <>
              {currentPath.id === 'android-pentesting' ? <section className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 text-sm text-slate-300 space-y-2" aria-label="Android source pack">
                <h2 className="font-heading font-bold text-[var(--ink-primary)]">Android source-case library</h2>
                <p>Nine original synthetic source cases provide independent questions and model feedback. They are not APKs or measured device outcomes. The separate Notes Boundary project is buildable source for optional owned-emulator work; no compiled APK is supplied or graded.</p>
                <p><a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-cases/cases.json`}>Download case pack</a> · <a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-cases/SHA256SUMS`}>Verify hash</a> · <a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-demos/notes-boundary-source.zip`}>Download demo source (not APK)</a></p>
              </section> : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[var(--line-strong)]/60 transition-all duration-300 min-w-0 w-full"
              >

                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xs:gap-4 mb-5 min-w-0">
                    <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-[13px] xs:text-[14px] text-[var(--ink-primary)] truncate">Artifact library — {currentPath.title} • {platform.name} generic engine</h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate">generated structure + decoded offline • verified by scripts/verify-lab-artifacts.py • {platform.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-slate-400 font-mono shrink-0">{filteredPcaps.length} shown • {currentPath.legacyBrand ? `legacy ${currentPath.legacyBrand}` : currentPath.id}</span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono shrink-0">Offline dataset • {parserInfo?.method || 'platform-labkit'}</span>
                    </div>
                  </div>
                  <div className="lab-artifact-index sc-artifact-index grid grid-cols-1 gap-0 min-w-0">
                    <AnimatePresence>
                      {filteredPcaps.map((p, idx) => (
                        <motion.div
                          key={p.id}
                          layout
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                          className="lab-artifact-row group/pcap p-3.5 border-b border-[var(--line-normal)]/60 hover:bg-[var(--panel-raised)] transition-colors relative overflow-hidden min-w-0"
                        >

                          <div className="relative flex items-start justify-between gap-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="text-[12px] font-mono font-medium text-slate-200 truncate group-hover/pcap:text-[var(--ink-primary)] transition-colors">{p.filename}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[var(--line-strong)]/60 text-slate-400 truncate">{p.module}</span>
                                <span className="text-slate-400 hidden xs:inline">•</span>
                                <span className="text-slate-400">{p.size ? `${(p.size/1024).toFixed(1)}KB` : `${p.frames || '?'}f`}</span>
                                {p.type && (<><span className="text-slate-400">•</span><span className="text-cyan-400/70">{p.type}</span></>)}
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-[var(--learning)] shrink-0 mt-1" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col lg:flex-row gap-3 min-w-0"
              >
                <div className="flex-1 relative group min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
                  <input
                    aria-label="Search labs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search labs in ${currentPath.title}, e.g., beacon, handshake, deauth, rogue, captive, Enterprise, EAP...`}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--panel-bg)]/80 border border-[var(--line-normal)]/60  text-[13px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30 focus:bg-[var(--panel-bg)] hover:border-[var(--line-strong)]/60 hover:bg-[#111d33]/80 transition-all duration-200 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin shrink-0">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--panel-bg)]/60 border border-[var(--line-normal)]/40  shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase shrink-0">
                      <Layers className="w-3 h-3" />Type
                    </div>
                    <button onClick={() => setFilterType(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 shrink-0 ${!filterType ? 'bg-[#1e293b] text-[var(--ink-primary)] border border-[var(--line-strong)] shadow-soft' : 'text-slate-400 hover:text-slate-300'}`}>All</button>
                    {typeFilters.slice(0, 6).map(type => (
                      <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${filterType === type ? 'bg-[#1e293b] text-[var(--ink-primary)] border border-[var(--line-strong)] shadow-soft' : 'text-slate-400 hover:text-slate-300 hover:bg-[#1e293b]/50'}`}>{type.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="ws-row-list" aria-label="Labs">
                {filteredLabs.map(lab => <article className="ws-catalog-row" key={lab.id}>
                  <span className="ws-row-number">{moduleOrdinal(lab.module)}</span>
                  <div className="ws-row-main">
                    <div className="ws-row-meta">{currentPath.shortTitle} · {lab.type} · {lab.difficulty} · {lab.status === 'PLANNED' ? 'Planned' : lab.grading === 'verified' ? 'Answer-checked local practice' : 'Self-review'} </div>
                    <h3>{lab.title}</h3><p>{lab.description}</p><p className="sc-lab-context"><strong>Target:</strong> {lab.pcap ? `supplied ${lab.pcap}.pcapng capture` : currentPath.id === 'android-pentesting' ? 'supplied source case' : 'written or configuration exercise'} · <strong>Mode:</strong> {lab.grading === 'verified' ? 'local answer-check' : 'guided self-review'} · <strong>Environment:</strong> {currentPath.id === 'android-pentesting' ? 'offline source review; owned emulator optional' : lab.status === 'SIMULATED' ? 'offline simulation' : 'authorized equipment if required'}</p><div className="ws-row-meta">{lab.module} · {lab.id}{lab.pcap ? ` · ${lab.pcap}.pcapng` : ' · No capture required'}</div>
                  </div>
                  <div className="ws-row-side"><TierBadge tier={tierByModule.get(lab.module) ?? lab.status} size="xs" /><span className="ws-label">{completedLabs.some(record => record.labId === lab.id && record.moduleId === lab.module) ? 'Completed locally' : lab.status === 'PLANNED' ? 'Planned' : 'Not completed'}</span>
                    {lab.status === 'PLANNED' ? <span className="ws-muted">Not available</span> : <Link to={`/paths/${effectivePathId}/modules/${lab.module}`} className="ws-row-link">Open lab →</Link>}
                  </div>
                </article>)}
              </div>

              {filteredLabs.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[var(--panel-bg)]/60 border border-dashed border-[var(--line-strong)]/60 p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4"><Search className="w-6 h-6 text-slate-400" /></div>
                  <h3 className="font-heading font-semibold text-[16px] text-slate-300">No labs found in {currentPath.title}</h3>
                  <p className="text-[13px] text-slate-400 mt-2">Try adjusting your search or filters — {labsForPath.length} labs total in this path</p>
                </motion.div>
              )}
            </>
          )}
        </>
      )}

      <p className="sc-practice-footnote">{currentPath.id === 'android-pentesting' ? 'Android source labs are self-review only (0 graded XP). An optional learner-built APK on an owned emulator is not verified by this platform; no dynamic proficiency is certified.' : 'Simulation uses a bundled offline dataset; hybrid and RF-required work needs an authorized environment. Answer-checked local exercises and self-review are not trusted server grading. Evidence tools accept the supported artifact formats shown in the workspace.'}</p>
    </div>
  )
}
