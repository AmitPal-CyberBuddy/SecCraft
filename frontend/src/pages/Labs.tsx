import { PracticeAvailability } from '@/components/common/PracticeAvailability'
import { LearningPathScope } from '@/components/common/LearningPathScope'
import { moduleLink } from '@/lib/learningNavigation'
import { ViewSwitcher } from '@/components/common/Controls'
import { moduleOrdinal } from '@/content/module-ordinal'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Search, Radio, FileCode, Layers, Terminal, Upload, Shield, Trophy, Clock, ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { LABS } from '@/content/labs'
import { getModulesForPath, getStatsForPath } from '@/content/stats'
import artifacts from '@/content/lab-artifacts.json'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { TERMINAL_COMMAND_COUNT } from '@/components/terminal/commandCount'
import { TierBadge } from '@/components/common/TierBadge'
import { useProgressStore } from '@/store/useProgressStore'
import { apiFetch, discardResponseBody } from '@/lib/api'

const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))
const PcapUploader = lazy(() => import('@/components/lab/PcapUploader').then(m => ({ default: m.PcapUploader })))
const EvidenceVault = lazy(() => import('@/components/evidence/EvidenceVault').then(m => ({ default: m.EvidenceVault })))
const LabScoring = lazy(() => import('@/components/lab/LabScoring').then(m => ({ default: m.LabScoring })))
const AndroidComponentAnalyzer = lazy(() => import('@/components/lab/AndroidComponentAnalyzer').then(m => ({ default: m.AndroidComponentAnalyzer })))

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
  return <LearningPathScope area="labs">{id => <LabsContent key={id} effectivePathId={id} />}</LearningPathScope>
}
function LabsContent({ effectivePathId }: { effectivePathId: string }) {
  const [searchParams] = useSearchParams()
  const completedLabs = useProgressStore(s => s.completedLabs)
  const currentPath = learningPaths.find(p => p.id === effectivePathId)!
  const pathModules = useMemo(() => getModulesForPath(effectivePathId), [effectivePathId])
  const pathStats = useMemo(() => getStatsForPath(effectivePathId), [effectivePathId])

  const [pcaps, setPcaps] = useState<PcapInfo[]>([])
  const [parserInfo, setParserInfo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'artifacts' | 'upload' | 'terminal' | 'vault' | 'scoring'>('artifacts')
  const [selectedLabId, setSelectedLabId] = useState<string>(() => LABS.find(lab => lab.learningPathId === effectivePathId)?.id ?? '')

  // For deep link ?pcap=xxx, switch to artifacts tab
  const pcapQuery = searchParams.get('pcap')
  useEffect(() => {
    if (pcapQuery) setActiveTab('artifacts')
  }, [pcapQuery])

  useEffect(() => {
    if (effectivePathId !== 'wireless-pentesting') return
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
  }, [effectivePathId])

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
  const labPracticeCounts = useMemo(() => {
    const available = labsForPath.filter(lab => lab.status !== 'PLANNED')
    return {
      available: available.length,
      answerChecked: available.filter(lab => lab.grading === 'answer-checked').length,
      selfReview: available.filter(lab => lab.grading === 'self-review').length,
      planned: labsForPath.filter(lab => lab.status === 'PLANNED').length,
    }
  }, [labsForPath])

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
  }, [pcaps, searchQuery, currentPath.status, currentPath.id])

  const typeFilters = [...new Set(labsForPath.map(l => l.type))]
  const clearFilters = () => { setSearchQuery(''); setFilterType(null) }

  return (
    <div className="ws-legacy ws-lab-workspace max-w-[1400px] mx-auto min-w-0 w-full space-y-4 xs:space-y-6 md:space-y-8">
      <nav className="ws-breadcrumb" aria-label="Breadcrumb"><Link to={`/paths/${effectivePathId}`}>{currentPath.title}</Link><span aria-hidden="true">/</span><span aria-current="page">Labs</span></nav>
      <header className="sc-practice-header"><div><p className="sc-library-domain">Practice / {currentPath.category}</p><h1>Security lab library</h1><p>Work through scoped objectives, supplied artifacts and local tools. Record what the evidence supports; completion is not trusted grading.</p></div><div className="sc-practice-summary"><strong>{pathStats.labs}</strong><span>labs in this path</span><small>{currentPath.id === 'android-pentesting' ? 'Original source cases · no prebuilt APK' : `${filteredPcaps.length} supplied captures`} · {currentPath.status === 'available' ? 'Available' : 'Planned'}</small></div></header>
      {effectivePathId === 'wireless-pentesting' && <PracticeAvailability />}
      <section className="sc-lab-orientation" aria-label="Lab practice model">
        <div><strong>{labPracticeCounts.available}</strong><span>available labs</span></div>
        <div><strong>{labPracticeCounts.answerChecked}</strong><span>local answer checks</span></div>
        <div><strong>{labPracticeCounts.selfReview}</strong><span>guided self-review</span></div>
        <p>Answer checks run in this browser; self-review is not scored. Lab records stay on this device and are not independently graded.{labPracticeCounts.planned > 0 && <small>{labPracticeCounts.planned} planned {labPracticeCounts.planned === 1 ? 'entry' : 'entries'} excluded from available totals.</small>}</p>
      </section>
      {/* Tabs — generic */}
      <ViewSwitcher label="Lab tools" value={activeTab} onChange={setActiveTab} options={([
        { id: 'artifacts', label: 'Artifact library', icon: <Radio size={16} />, count: currentPath.id === 'android-pentesting' ? filteredLabs.length : filteredPcaps.length },
        { id: 'upload', label: 'Upload custom', icon: <Upload size={16} /> },
        { id: 'terminal', label: 'Command simulator', icon: <Terminal size={16} />, count: TERMINAL_COMMAND_COUNT },
        { id: 'vault', label: 'Evidence vault', icon: <Shield size={16} /> },
        { id: 'scoring', label: 'Scoring', icon: <Trophy size={16} /> },
      ] as const).filter(tab => currentPath.id !== 'android-pentesting' || tab.id === 'artifacts' || tab.id === 'vault' || tab.id === 'scoring')} />

      {activeTab === 'upload' && <Suspense fallback={<LoadingPanel label="Loading PcapUploader…" />}><PcapUploader /></Suspense>}
      {activeTab === 'terminal' && <Suspense fallback={<LoadingPanel label="Loading terminal…" />}><TerminalEmulator /></Suspense>}
      {activeTab === 'vault' && <Suspense fallback={<LoadingPanel label="Loading evidence vault…" />}><EvidenceVault /></Suspense>}
      {activeTab === 'scoring' && (
        <Suspense fallback={<LoadingPanel label="Loading lab scoring…" />}>
          <div className="space-y-4">
            <div className="sc-sticky-tool z-20 bg-[var(--panel-inset)] backdrop-blur-xl rounded-2xl border border-[var(--line-normal)] p-4 shadow-lg -mx-3 p-3 md:mx-0 md:p-4 xs:p-5">
              <label htmlFor="scoring-lab" className="text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-wide">Lab to score — {currentPath.title}</label>
              <select
                id="scoring-lab"
                value={selectedLabId}
                onChange={e => setSelectedLabId(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none"
              >
                {labsForPath.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.id} — {lab.title}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--ink-secondary)] mt-2">
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
              <div className="w-12 h-12 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-[var(--ink-secondary)]" />
              </div>
              <div className="text-[14px] font-semibold text-[var(--ink-primary)]">This learning path is planned</div>
              <p className="mt-2 text-[12.5px] text-[var(--ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
                No labs are available in this planned path yet. Explore an available path to work with its supplied artifacts.
              </p>
              <Link to={`/paths/${effectivePathId}`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[12px] text-[var(--ink-secondary)] hover:bg-[var(--panel-raised)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to {currentPath.title}
              </Link> <Link to="/paths" className="mt-4 inline-flex items-center px-4 py-2 text-[var(--learning)] underline">Explore available paths →</Link>
            </div>
          ) : (
            <>
              <div className="sc-lab-controls">
                <div className="sc-lab-search">
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <input
                    type="search"
                    aria-label="Search labs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search titles, modules, types or captures"
                  />
                </div>
                <div className="sc-lab-type-scroll">
                  <div className="sc-lab-type-filter" role="group" aria-label="Filter labs by type">
                    <span><Layers className="w-3 h-3" aria-hidden="true" />Type</span>
                    <button type="button" aria-label="All lab types" aria-pressed={!filterType} onClick={() => setFilterType(null)} className={!filterType ? 'is-selected' : ''}>All</button>
                    {typeFilters.map(type => (
                      <button type="button" key={type} aria-label={`Filter labs by ${type}`} aria-pressed={filterType === type} title={type} onClick={() => setFilterType(type)} className={filterType === type ? 'is-selected' : ''}>{type}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="sc-lab-filter-summary">
                <p role="status">Showing {filteredLabs.length} of {labsForPath.length} lab entries{labPracticeCounts.planned > 0 ? ` (${labPracticeCounts.planned} planned)` : ''}</p>
                {(searchQuery || filterType) && <button type="button" className="ws-action ws-action-secondary" onClick={clearFilters}>Clear filters</button>}
              </div>

              {currentPath.id === 'android-pentesting' && (
                <Suspense fallback={<LoadingPanel label="Loading Android Component Analyzer…" />}>
                  <AndroidComponentAnalyzer className="mb-6" />
                </Suspense>
              )}

              <div className="ws-row-list" aria-label="Labs">
                {filteredLabs.map(lab => <article className="ws-catalog-row" key={lab.id}>
                  <span className="ws-row-number">{moduleOrdinal(lab.module)}</span>
                  <div className="ws-row-main">
                    <div className="ws-row-meta">{currentPath.shortTitle} · {lab.type} · {lab.difficulty} · {lab.status === 'PLANNED' ? 'Planned' : lab.grading === 'answer-checked' ? 'Answer-checked local practice' : 'Self-review'} </div>
                    <h3>{lab.title}</h3><p>{lab.description}</p><p className="sc-lab-context"><strong>Target:</strong> {lab.pcap ? `supplied ${lab.pcap}.pcapng capture` : currentPath.id === 'android-pentesting' ? 'supplied source case' : 'written or configuration exercise'} · <strong>Mode:</strong> {lab.grading === 'answer-checked' ? 'local answer-check' : 'guided self-review'} · <strong>Environment:</strong> {currentPath.id === 'android-pentesting' ? 'offline source review; owned emulator optional' : lab.status === 'SIMULATED' ? 'supplied evidence; no live target' : 'written exercise; no hosted equipment'}</p><div className="ws-row-meta">{lab.module} · {lab.id}{lab.pcap ? ` · ${lab.pcap}.pcapng` : ' · No capture required'}</div>
                  </div>
                  <div className="ws-row-side"><TierBadge tier={tierByModule.get(lab.module) ?? lab.status} size="xs" /><span className="ws-label">{completedLabs.some(record => record.labId === lab.id && record.moduleId === lab.module) ? 'Completed locally' : lab.status === 'PLANNED' ? 'Planned' : 'Not completed'}</span>
                    {lab.status === 'PLANNED' ? <span className="ws-muted">Not available</span> : <Link to={moduleLink(lab.module, 'lab', lab.id, effectivePathId)} className="ws-row-link">Open lab →</Link>}
                  </div>
                </article>)}
              </div>

              {filteredLabs.length === 0 && (
                <div className="sc-lab-empty">
                  <div className="sc-lab-empty-mark" aria-hidden="true"><Search size={20} /></div>
                  <h3>{labsForPath.length === 0 ? `No lab entries in ${currentPath.title} yet` : 'No lab entries match these filters'}</h3>
                  <p>{labsForPath.length === 0 ? 'Browse this path’s modules while its practice catalogue is being built.' : `Try another type or search term. ${labsForPath.length} entries exist in this path.`}</p>
                  {(searchQuery || filterType) && <button type="button" className="ws-action ws-action-secondary" onClick={clearFilters}>Clear filters</button>}
                </div>
              )}
              <details className="sc-artifact-disclosure" open={pcapQuery ? true : undefined}>
                <summary>Supplied artifacts and downloads</summary>
              {currentPath.id === 'android-pentesting' ? <section className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 text-sm text-[var(--ink-secondary)] space-y-2" aria-label="Android source pack">
                <h2 className="font-heading font-bold text-[var(--ink-primary)]">Android source-case library</h2>
                <p>Nine original synthetic source cases provide independent questions and model feedback. They are not APKs or measured device outcomes. The separate Notes Boundary project is buildable source for optional owned-emulator work; no compiled APK is supplied or graded.</p>
                <p><a className="text-[var(--learning)] underline" href={`${import.meta.env.BASE_URL}android-cases/cases.json`} download>Download case pack</a> · <a className="text-[var(--learning)] underline" href={`${import.meta.env.BASE_URL}android-cases/SHA256SUMS`}>Verify hash</a> · <a className="text-[var(--learning)] underline" href={`${import.meta.env.BASE_URL}android-demos/notes-boundary-source.zip`} download>Download demo source (not APK)</a> · <a className="text-[var(--learning)] underline" href={`${import.meta.env.BASE_URL}android-practice/REFERENCE_GUIDE.md`} download>Download reference guide</a> · <a className="text-[var(--learning)] underline" href={`${import.meta.env.BASE_URL}android-practice/android-pentest-toolkit.zip`} download>Download pentest toolkit (.zip)</a></p>
              </section> : (
              <div
                className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition min-w-0 w-full"
              >

                <div className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xs:gap-4 mb-5 min-w-0">
                    <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-[var(--success)]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-[13px] xs:text-[14px] text-[var(--ink-primary)] truncate">Artifact library — {currentPath.title} • {platform.name} generic engine</h3>
                        <p className="text-[11px] text-[var(--ink-secondary)] font-mono truncate">generated structure + decoded offline • verified by scripts/verify-lab-artifacts.py • {platform.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)] font-mono shrink-0">{filteredPcaps.length} shown • {currentPath.legacyBrand ? `legacy ${currentPath.legacyBrand}` : currentPath.id}</span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)] font-mono break-words min-w-0 max-w-full">Offline dataset • {parserInfo?.method || 'platform-labkit'}</span>
                    </div>
                  </div>
                  <div className="lab-artifact-index sc-artifact-index grid grid-cols-1 gap-0 min-w-0">
                    <>
                      {filteredPcaps.map(p => (
                        <div
                          key={p.id}
                                        className="lab-artifact-row group/pcap p-3.5 border-b border-[var(--line-normal)] hover:bg-[var(--panel-raised)] transition-colors relative overflow-hidden min-w-0"
                        >

                          <div className="relative flex items-start justify-between gap-3 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-[var(--learning)] shrink-0" />
                                <span className="text-[12px] font-mono font-medium text-[var(--ink-primary)] truncate group-hover/pcap:text-[var(--ink-primary)] transition-colors">{p.filename}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-secondary)] truncate">{p.module}</span>
                                <span className="text-[var(--ink-secondary)] hidden xs:inline">•</span>
                                <span className="text-[var(--ink-secondary)]">{p.size ? `${(p.size/1024).toFixed(1)}KB` : `${p.frames || '?'}f`}</span>
                                {p.type && (<><span className="text-[var(--ink-secondary)]">•</span><span className="text-[var(--learning)]">{p.type}</span></>)}
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-[var(--learning)] shrink-0 mt-1" />
                          </div>
                        </div>
                      ))}
                    </>
                  </div>
                </div>
              </div>
              )}

              </details>
            </>
          )}
        </>
      )}

      <p className="sc-practice-footnote">{currentPath.id === 'android-pentesting' ? 'Android source labs are self-review only (0 graded XP). An optional learner-built APK on an owned emulator is not verified by this platform; no dynamic proficiency is certified.' : 'Supplied evidence practice is available offline. Live hosted labs are not available; physical validation needs your own authorized equipment. Answer-checked local exercises and self-review are not trusted server grading. Evidence tools accept the supported artifact formats shown in the workspace.'}</p>
    </div>
  )
}
