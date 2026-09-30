import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { ACHIEVEMENTS_DEF, useProgressStore } from '@/store/useProgressStore'
import challenges from '@/content/challenges.json'
import learningPaths from '@/content/learning-paths.json'
import { getChallengesForPath } from '@/content/stats'

const BadgesShowcase = lazy(() => import('@/components/gamification/BadgesShowcase').then(m => ({ default: m.BadgesShowcase })))

export function Challenges() {
  const { pathId } = useParams()
  const [searchParams] = useSearchParams()
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const effectivePathId = searchParams.get('path') || pathId || currentPathId
  const currentPath = learningPaths.find(p => p.id === effectivePathId) || learningPaths[0]
  const [filterLevel, setFilterLevel] = useState<string | null>(null)
  const [filterDiff, setFilterDiff] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'challenges' | 'badges'>('challenges')
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
    <nav className="ws-breadcrumb" aria-label="Breadcrumb"><Link to={`/paths/${effectivePathId}`}>{currentPath.title}</Link><span aria-hidden="true">/</span><span aria-current="page">Challenges</span></nav>
    <header className="sc-practice-header"><div><p className="sc-library-domain">Practice / {currentPath.category}</p><h1>Challenge library</h1><p>Move from guided reasoning toward independent investigation. These challenges are local practice, not trusted grading.</p></div><div className="sc-practice-summary"><strong>{challengesForPath.length}</strong><span>challenges in this path</span><small>{currentPath.status === 'available' ? 'Available curriculum' : 'Planned curriculum'}</small></div></header>
    <div className="sc-practice-tabs" role="group" aria-label="Challenge views"><button type="button" aria-pressed={activeTab === 'challenges'} onClick={() => setActiveTab('challenges')}>Challenges</button><button type="button" aria-pressed={activeTab === 'badges'} onClick={() => setActiveTab('badges')}>Achievements ({ACHIEVEMENTS_DEF.length})</button></div>
    {activeTab === 'badges' ? <Suspense fallback={<LoadingPanel label="Loading achievements…" />}><BadgesShowcase /></Suspense> : currentPath.status !== 'available' ? <div className="sc-modules-empty"><h2>Challenges are planned for this path</h2><p>Choose an available path to explore its current practice catalogue.</p><Link to="/paths" className="ws-text-action">Explore available paths →</Link></div> : challengesForPath.length === 0 ? <div className="sc-modules-empty"><h2>No challenges in this path yet</h2><p>That is not a hidden assessment. Continue with the labs or authored modules available for this path.</p><Link to={`/labs?path=${effectivePathId}`} className="ws-text-action">Explore this path’s labs →</Link><br /><Link to={`/paths/${effectivePathId}/modules`} className="ws-text-action">Browse modules →</Link></div> : <>
      <section aria-labelledby="challenge-method"><div className="sc-section-intro"><span>Practice progression</span><h2 id="challenge-method">Choose your level of guidance</h2></div><div className="sc-challenge-levels">{levels.map((level, index) => { const count = challengesForPath.filter(c => c.level === level.id).length; return <button type="button" key={level.id} aria-pressed={filterLevel === level.id} onClick={() => setFilterLevel(filterLevel === level.id ? null : level.id)}><span>{String(index + 1).padStart(2,'0')}</span><strong>{level.label}</strong><small>{count} challenges</small><p>{level.desc}</p></button> })}</div></section>
      <section aria-labelledby="challenge-index"><div className="sc-section-intro"><span>Catalogue</span><h2 id="challenge-index">Challenges in this path</h2></div><div className="sc-modules-controls"><label className="sc-modules-search"><span>Search challenges</span><input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search titles, skills or identifiers" /></label><label><span>Level</span><select value={filterLevel ?? ''} onChange={e => setFilterLevel(e.target.value || null)}><option value="">All levels</option>{levels.map(level => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label><label><span>Difficulty</span><select value={filterDiff ?? ''} onChange={e => setFilterDiff(e.target.value || null)}><option value="">All difficulties</option>{['Beginner','Intermediate','Advanced','Professional'].map(value => <option key={value} value={value}>{value}</option>)}</select></label></div><p className="sc-modules-count">Showing {filtered.length} of {challengesForPath.length} challenges</p><div className="ws-row-list">{filtered.map(challenge => <ChallengeCard {...challenge} key={challenge.id} />)}</div>{!filtered.length && <div className="sc-modules-empty"><h3>No challenges match these filters</h3><p>Try another level, difficulty or search.</p><button type="button" onClick={() => { setFilterLevel(null); setFilterDiff(null); setSearchQuery('') }}>Clear filters</button></div>}</section>
    </>}
  </div>
}
