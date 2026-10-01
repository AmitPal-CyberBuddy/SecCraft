import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import learningPaths from '@/content/learning-paths.json'
import { useProgressStore } from '@/store/useProgressStore'
import { EmptyState, PageHeader } from './Workspace'

/** URL scope wins over remembered context. Unknown/planned paths never borrow content. */
export function LearningPathScope({ area, children }: { area: string; children: (id: string) => ReactNode }) {
  const { pathId } = useParams()
  const [query] = useSearchParams()
  const navigate = useNavigate()
  const remembered = useProgressStore(s => s.currentLearningPathId)
  const select = useProgressStore(s => s.setCurrentLearningPath)
  const id = pathId ?? query.get('path') ?? remembered
  const path = learningPaths.find(item => item.id === id)
  const available = learningPaths.filter(item => item.status === 'available' && item.modules.length)
  const ready = path?.status === 'available' && path.modules.length > 0
  useEffect(() => { if (ready && path) select(path.id) }, [ready, path, select])
  if (!id) return <div className="ws-page"><PageHeader eyebrow="SecCraft / Learning workspace" title="Choose your learning path" description="Explore a subject at your own pace. You can switch paths at any time; your practice stays in this browser." /><div className="sc-path-choices">{available.map(item => <section className="ws-panel ws-panel-surface" key={item.id}><p className="ws-label">{item.category.replaceAll('-', ' ')}</p><h2>{item.title}</h2><p className="ws-muted">{item.description}</p><Link className="ws-action" to={`/${area}?path=${item.id}`}>Choose {item.shortTitle}<span aria-hidden="true"> →</span></Link></section>)}</div><Link className="ws-text-action" to="/paths">Explore all learning paths →</Link></div>
  if (!ready || !path) return <div className="ws-page"><PageHeader title={path ? path.title : 'Path not found'} /><EmptyState title={path ? 'This path is planned' : 'We couldn’t find this learning path'} description="Choose an available path to explore its lessons and practice." action={<Link className="ws-action" to="/paths">Browse learning paths</Link>} /></div>
  return <><div className="sc-path-scope"><label><span>Learning path</span><select aria-label="Learning path" value={path.id} onChange={event => navigate(`/${area}?path=${event.target.value}`)}>{available.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><Link to={`/paths/${path.id}`} className="ws-text-action">Path overview →</Link></div>{children(path.id)}</>
}
