import { PracticeAvailability } from '@/components/common/PracticeAvailability'
import { ResultTransition } from '@/components/common/ResultTransition'
import { LearningPathScope } from '@/components/common/LearningPathScope'
import { FilterBar } from '@/components/common/Controls'
import { Breadcrumb, EmptyState, SectionHeader } from '@/components/common/Workspace'
import { updateQuery } from '@/lib/learningNavigation'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import challenges from '@/content/challenges.json'
import learningPaths from '@/content/learning-paths.json'
import { getChallengesForPath } from '@/content/stats'
import { useSession } from '@/lib/session'
import { allows } from '@/lib/access'

export function Challenges() {
  return <LearningPathScope area="challenges">{id => <ChallengesContent key={id} effectivePathId={id} />}</LearningPathScope>
}
function ChallengesContent({ effectivePathId }: { effectivePathId: string }) {
  const { userState } = useSession()
  const hasLearningAccess = allows(userState, 'learning-content')
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPath = learningPaths.find(p => p.id === effectivePathId)!
  const filterLevel = searchParams.get('level')
  const filterDiff = searchParams.get('difficulty')
  const searchQuery = searchParams.get('q') || ''
  const setFilterLevel = (value: string | null) => setSearchParams(previous => updateQuery(previous, { level: value }))
  const setFilterDiff = (value: string | null) => setSearchParams(previous => updateQuery(previous, { difficulty: value }))
  const setSearchQuery = (value: string) => setSearchParams(previous => updateQuery(previous, { q: value }), { replace: true })
  const reset = () => setSearchParams(previous => updateQuery(previous, { level: null, difficulty: null, q: null }))
  const challengeContentIncluded = (challenges as any[]).length > 0
  const challengesForPath = useMemo(() => {
    const list = getChallengesForPath(effectivePathId)
    if (!list.length && effectivePathId === 'wireless-pentesting') return (challenges as any[]).filter(c => !c.learningPathId || c.learningPathId === effectivePathId)
    return list
  }, [effectivePathId])
  const filtered = useMemo(() => challengesForPath.filter(c => {
    if (filterLevel && c.level !== filterLevel) return false
    if (filterDiff && c.difficulty !== filterDiff) return false
    if (searchQuery) { const q = searchQuery.toLowerCase(); return c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.module.toLowerCase().includes(q) || (c.skills as string[]).some((s: string) => s.toLowerCase().includes(q)) }
    return true
  }), [challengesForPath, filterLevel, filterDiff, searchQuery])
  const levels = [
    { id: 'guided', label: 'Guided', desc: 'Commands, expected output and explanations.' },
    { id: 'semi-guided', label: 'Semi-guided', desc: 'Objective and tools; develop the method.' },
    { id: 'assessment', label: 'Assessment', desc: 'Scope and artifacts; determine the method.' },
  ]
  return <div className="sc-challenges">
    <Breadcrumb items={[{ label: currentPath.title, to: `/paths/${effectivePathId}` }, { label: 'Challenges' }]} />
    <header className="sc-practice-header"><div><p className="sc-library-domain">Practice / {currentPath.category}</p><h1>Challenge library</h1><p>{challengeContentIncluded ? 'Move from guided reasoning toward independent investigation. These challenges are self-review practice, not graded.' : 'Challenge prompts and answer keys are intentionally omitted from this public build; authenticated challenge delivery is not available yet.'}</p></div><div className="sc-practice-summary"><strong>{challengeContentIncluded ? challengesForPath.length : '—'}</strong><span>{challengeContentIncluded ? 'challenges in this path' : 'protected challenge library'}</span><small>{challengeContentIncluded ? currentPath.status === 'available' ? 'Available curriculum' : 'Planned curriculum' : 'Not included in public build'}</small></div></header>
    {challengeContentIncluded && <section className="sc-modules-access" aria-label="Learning access"><div><strong>{hasLearningAccess ? 'Approved content' : 'Catalogue & practice'}</strong><p>{hasLearningAccess ? 'Challenge prompts are available for this account. Self-review is not graded.' : 'Browse challenge outlines and levels publicly. Prompts and answer keys are self-review practice, not graded assessments.'}</p></div>{!hasLearningAccess && <Link to="/account" className="ws-text-action">Request or check access →</Link>}</section>}
    {effectivePathId === 'wireless-pentesting' && <PracticeAvailability />}
    {currentPath.status !== 'available' ? <EmptyState title="Challenges are planned for this path" description="Choose an available path to explore its current practice catalogue." action={<Link to="/paths" className="ws-action ws-action-secondary">Explore available paths →</Link>} /> : !challengeContentIncluded ? <EmptyState title="Challenge content isn’t included in this public build" description="The public release omits challenge prompts and answer keys. Authenticated challenge delivery is not available yet; use the public samples and bundled labs for practice." action={<><Link to={`/paths/${effectivePathId}/labs`} className="ws-action ws-action-secondary">Explore this path’s labs →</Link><Link to={`/paths/${effectivePathId}/modules`} className="ws-action ws-action-secondary">Browse modules →</Link></>} /> : challengesForPath.length === 0 ? <EmptyState title="No challenges in this path yet" description="Continue with the labs or authored modules currently available for this path." action={<><Link to={`/paths/${effectivePathId}/labs`} className="ws-action ws-action-secondary">Explore this path’s labs →</Link><Link to={`/paths/${effectivePathId}/modules`} className="ws-action ws-action-secondary">Browse modules →</Link></>} /> : <>
      <section aria-labelledby="challenge-method"><SectionHeader kicker="Practice progression" title="Choose your level of guidance" id="challenge-method" /><div className="sc-challenge-levels">{levels.map((level, index) => { const count = challengesForPath.filter(c => c.level === level.id).length; return <button type="button" key={level.id} aria-pressed={filterLevel === level.id} onClick={() => setFilterLevel(filterLevel === level.id ? null : level.id)}><span>{String(index + 1).padStart(2,'0')}</span><strong>{level.label}</strong><small>{count} challenges</small><p>{level.desc}</p></button> })}</div></section>
      <section aria-labelledby="challenge-index"><SectionHeader kicker="Catalogue" title="Challenges in this path" id="challenge-index" /><FilterBar searchLabel="Search challenges" searchPlaceholder="Search titles, skills or identifiers" searchValue={searchQuery} onSearch={setSearchQuery} filters={[{ key: 'difficulty', label: 'Difficulty', options: ['Beginner','Intermediate','Advanced','Professional'].map(value => ({ value, label: value })) }]} values={{ difficulty: filterDiff }} onFilter={(_key, value) => setFilterDiff(value)} count={filtered.length} total={challengesForPath.length} countLabel="challenges" onClear={reset} hasActiveFilters={Boolean(searchQuery || filterLevel || filterDiff)} /><ResultTransition identity={`${effectivePathId}:${filterLevel}:${filterDiff}`} className="ws-row-list">{filtered.map(challenge => <ChallengeCard {...challenge} key={challenge.id} />)}</ResultTransition>{!filtered.length && <EmptyState title="No challenges match these filters" description="Try another level, difficulty or search." action={<button type="button" className="ws-action ws-action-secondary" onClick={reset}>Clear filters</button>} />}</section>
    </>}
  </div>
}
