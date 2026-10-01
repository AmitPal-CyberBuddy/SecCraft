import { ResultTransition } from '@/components/common/ResultTransition'
import { LearningPathScope } from '@/components/common/LearningPathScope'
import { updateQuery } from '@/lib/learningNavigation'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ModuleCard } from '@/components/learning/ModuleCard'
import { useProgressStore } from '@/store/useProgressStore'
import learningPaths from '@/content/learning-paths.json'
import { getModulesForPath } from '@/content/stats'
import { useSession } from '@/lib/session'
import { canAccessTier, CONTENT_TIER_META, contentTierOf } from '@/lib/contentAccess'
import { ProgressBar } from '@/components/common/Workspace'

export function Modules() {
  return <LearningPathScope area="modules">{id => <ModulesContent key={id} effectivePathId={id} />}</LearningPathScope>
}
function ModulesContent({ effectivePathId }: { effectivePathId: string }) {
  const path = learningPaths.find(p => p.id === effectivePathId)!
  const pathModules = useMemo(() => getModulesForPath(effectivePathId), [effectivePathId])
  const [query, setQuery] = useSearchParams()
  const filterPhase = Number(query.get('phase')) || null
  const filterStatus = query.get('environment')
  const searchQuery = query.get('q') || ''
  const setFilterPhase = (value: number | null) => setQuery(previous => updateQuery(previous, { phase: value ? String(value) : null }))
  const setFilterStatus = (value: string | null) => setQuery(previous => updateQuery(previous, { environment: value }))
  const setSearchQuery = (value: string) => setQuery(previous => updateQuery(previous, { q: value }), { replace: true })
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const { userState } = useSession()
  const hasFullCurriculum = canAccessTier(userState, 'full')
  const tierCounts = useMemo(() => {
    const out = { preview: 0, full: 0 }
    for (const m of pathModules) out[contentTierOf({ id: m.id, phase: m.phase })] += 1
    return out
  }, [pathModules])
  const filtered = pathModules.filter(m => {
    if (filterPhase && m.phase !== filterPhase) return false
    if (filterStatus && m.status !== filterStatus) return false
    if (searchQuery) { const q = searchQuery.toLowerCase(); return m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) }
    return true
  })
  const phases = [...new Set(pathModules.map(m => m.phase))].sort((a,b) => a-b)
  const reset = () => setQuery(previous => updateQuery(previous, { phase: null, environment: null, q: null }))
  return <div className="sc-modules">
    <nav aria-label="Breadcrumb" className="ws-breadcrumb"><Link to="/paths">Learning paths</Link><span aria-hidden="true">/</span><Link to={`/paths/${path.id}`}>{path.title}</Link><span aria-hidden="true">/</span><span aria-current="page">Modules</span></nav>
    <header className="sc-modules-header"><div><p className="sc-library-domain">{path.category} / Curriculum</p><h1>Modules</h1><p>{path.title} · {pathModules.length} modules across {phases.length} phases. Follow the sequence or find a specific subject.</p></div><div className="sc-modules-progress"><span>Practice progress · this browser</span><strong>{getPathProgress(path.id)}%</strong><ProgressBar value={getPathProgress(path.id)} label="Path practice progress" /></div></header>
    <section className="sc-modules-access" data-tour="curriculum-tier" aria-label="Curriculum experience"><div><strong>{hasFullCurriculum ? CONTENT_TIER_META.full.label : CONTENT_TIER_META.preview.label}</strong><p>{hasFullCurriculum ? 'Continue through the full path, from foundations to independent practice.' : 'Start with the introductory modules or explore the full learning sequence.'}</p><small>{tierCounts.preview} preview modules · {tierCounts.full} full modules. All lessons are readable here. Account approval adds account features, not access to the lesson text. Practice results remain unverified.</small></div>{!hasFullCurriculum && <Link to="/account" className="ws-text-action">Continue with an approved account →</Link>}</section>
    <section className="sc-modules-catalog" aria-labelledby="modules-sequence"><div className="sc-section-intro"><span>Curriculum sequence</span><h2 id="modules-sequence">Find your next unit</h2></div><div className="sc-modules-controls"><label className="sc-modules-search"><span>Search modules</span><input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search titles, subjects or identifiers" /></label><label><span>Phase</span><select aria-label="Phase" value={filterPhase ?? ''} onChange={e => setFilterPhase(e.target.value ? Number(e.target.value) : null)}><option value="">All phases</option>{phases.map(phase => <option value={phase} key={phase}>{path.phases.find(item => item.id === phase)?.name ?? `Phase ${phase}`}</option>)}</select></label><label><span>Environment</span><select aria-label="Environment" value={filterStatus ?? ''} onChange={e => setFilterStatus(e.target.value || null)}><option value="">All environments</option><option value="simulated">Simulation</option>{pathModules.some(module => module.status === 'hardware') && <option value="hardware">RF hardware</option>}</select></label></div><div className="sc-filter-summary"><p className="sc-modules-count" role="status">Showing {filtered.length} of {pathModules.length} modules</p>{(searchQuery || filterPhase || filterStatus) && <button type="button" className="ws-action ws-action-secondary" onClick={reset}>Clear filters</button>}</div>
      {filtered.length ? <ResultTransition identity={`${effectivePathId}:${filterPhase}:${filterStatus}`} className="ws-row-list">{filtered.map(m => <ModuleCard key={m.id} id={m.id} title={m.title} phase={m.phase} difficulty={m.difficulty} estimated_hours={m.estimated_hours} status={m.status} progress={getModuleProgress(m.id)} description={m.description} locked={false} tier={contentTierOf({ id: m.id, phase: m.phase })} tierIsAccountContent={!hasFullCurriculum && contentTierOf({ id: m.id, phase: m.phase }) === 'full'} />)}</ResultTransition> : <div className="sc-modules-empty"><h3>No modules match these filters</h3><p>Try another search or environment.</p><button type="button" onClick={reset}>Clear filters</button></div>}
    </section>
  </div>
}
