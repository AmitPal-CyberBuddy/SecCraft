import { ResultTransition } from '@/components/common/ResultTransition'
import { LearningPathScope } from '@/components/common/LearningPathScope'
import { updateQuery } from '@/lib/learningNavigation'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ModuleCard } from '@/components/learning/ModuleCard'
import learningPaths from '@/content/learning-paths.json'
import { getModulesForPath } from '@/content/stats'
import { useSession } from '@/lib/session'
import { allows } from '@/lib/access'
import { maturityOfModule } from '@/lib/contentMaturity'
import { Breadcrumb, EmptyState, SectionHeader } from '@/components/common/Workspace'
import { FilterBar } from '@/components/common/Controls'

export function Modules() {
  return <LearningPathScope area="modules">{id => <ModulesContent key={id} effectivePathId={id} />}</LearningPathScope>
}
function ModulesContent({ effectivePathId }: { effectivePathId: string }) {
  const path = learningPaths.find(p => p.id === effectivePathId)!
  const pathModules = useMemo(() => getModulesForPath(effectivePathId), [effectivePathId])
  const [query, setQuery] = useSearchParams()
  const filterPhase = Number(query.get('phase')) || null
  const filterStatus = query.get('environment')
  const filterDifficulty = query.get('difficulty')
  const searchQuery = query.get('q') || ''
  const setFilterPhase = (value: number | null) => setQuery(previous => updateQuery(previous, { phase: value ? String(value) : null }))
  const setFilterStatus = (value: string | null) => setQuery(previous => updateQuery(previous, { environment: value }))
  const setFilterDifficulty = (value: string | null) => setQuery(previous => updateQuery(previous, { difficulty: value }))
  const setSearchQuery = (value: string) => setQuery(previous => updateQuery(previous, { q: value }), { replace: true })
  const { userState } = useSession()
  const hasLearningAccess = allows(userState, 'learning-content')
  const filtered = pathModules.filter(m => {
    if (filterPhase && m.phase !== filterPhase) return false
    if (filterStatus && m.status !== filterStatus) return false
    if (filterDifficulty && m.difficulty !== filterDifficulty) return false
    if (searchQuery) { const q = searchQuery.toLowerCase(); return m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) }
    return true
  })
  const phases = [...new Set(pathModules.map(m => m.phase))].sort((a,b) => a-b)
  const difficulties = [...new Set(pathModules.map(m => m.difficulty))].sort()
  const reset = () => setQuery(previous => updateQuery(previous, { phase: null, environment: null, difficulty: null, q: null }))
  const hasActiveFilters = Boolean(searchQuery || filterPhase || filterStatus || filterDifficulty)
  return <div className="sc-modules">
    <Breadcrumb items={[{ label: 'Learning paths', to: '/paths' }, { label: path.title, to: `/paths/${path.id}` }, { label: 'Modules' }]} />
    <header className="sc-modules-header"><div><p className="sc-library-domain">{path.category} / Curriculum</p><h1>Modules</h1><p>{path.title} · {pathModules.length} modules across {phases.length} phases. Follow the sequence or find a specific subject. Module outlines and content details are public — sign in for full learning materials.</p></div></header>
    <section className="sc-modules-access" data-tour="access-note" aria-label="Learning access"><div><strong>{hasLearningAccess ? 'Approved content' : 'Catalogue & practice'}</strong><p>{hasLearningAccess ? 'Protected lesson text and knowledge-check prompts are available for this account.' : 'Browse public module outlines, selected sample lessons, supplied artifacts and bundled labs. Approved accounts unlock protected lesson text and knowledge-check prompts.'}</p><small>{pathModules.length} modules in this path.</small></div>{!hasLearningAccess && <Link to="/account" className="ws-text-action">Request or check access →</Link>}</section>
    <section className="sc-modules-catalog" aria-labelledby="modules-sequence">
      <SectionHeader kicker="Curriculum sequence" title="Find your next unit" id="modules-sequence" />
      <FilterBar
        searchLabel="Search modules"
        searchPlaceholder="Search titles, subjects or identifiers"
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={[
          { key: 'phase', label: 'Phase', options: phases.map(phase => ({ value: String(phase), label: path.phases.find(item => item.id === phase)?.name ?? `Phase ${phase}` })) },
          { key: 'environment', label: 'Environment', options: [{ value: 'simulated', label: 'Simulation' }, ...(pathModules.some(module => module.status === 'hardware') ? [{ value: 'hardware', label: 'RF hardware' }] : [])] },
          { key: 'difficulty', label: 'Difficulty', options: difficulties.map(value => ({ value, label: value })) },
        ]}
        values={{ phase: filterPhase ? String(filterPhase) : null, environment: filterStatus, difficulty: filterDifficulty }}
        onFilter={(key, value) => {
          if (key === 'phase') setFilterPhase(value ? Number(value) : null)
          else if (key === 'environment') setFilterStatus(value)
          else setFilterDifficulty(value)
        }}
        count={filtered.length}
        total={pathModules.length}
        countLabel="modules"
        onClear={reset}
        hasActiveFilters={hasActiveFilters}
      />
      {filtered.length ? <ResultTransition identity={`${effectivePathId}:${filterPhase}:${filterStatus}:${filterDifficulty}`} className="ws-row-list">{filtered.map(m => <ModuleCard key={m.id} id={m.id} title={m.title} phase={m.phase} difficulty={m.difficulty} estimated_hours={m.estimated_hours} status={m.status} description={m.description} locked={false} maturity={maturityOfModule(m)} />)}</ResultTransition> : <EmptyState title="No modules match these filters" description="Try another search or environment." action={<button type="button" className="ws-btn ws-btn-secondary" onClick={reset}>Clear filters</button>} />}
    </section>
  </div>
}
