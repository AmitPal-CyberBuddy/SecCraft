import { Link } from 'react-router-dom'
import learningPaths from '@/content/learning-paths.json'
import { useProgressStore } from '@/store/useProgressStore'
import { PageHeader, ProgressBar } from '@/components/common/Workspace'

export function LearningPaths() {
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentId = useProgressStore(s => s.currentLearningPathId)
  const available = learningPaths.filter(path => path.status === 'available')
  const planned = learningPaths.filter(path => path.status !== 'available')
  return <div className="sc-library">
    <PageHeader eyebrow="Curriculum library" title="Learning paths" description="Structured technical study, applied practice and evidence-led investigation. Wireless and Android paths are available now; other domains are planned." />
    <div className="sc-library-orientation" aria-label="Catalogue availability summary"><div><strong>{available.length}</strong><span>available now</span></div><div><strong>{planned.length}</strong><span>planned domains</span></div><p>Start with an available path. Planned domains are shown for direction, not enrollment.</p></div>
    <section aria-labelledby="available-paths"><div className="sc-section-intro"><span>01 / Available curriculum</span><h2 id="available-paths">Start with a domain</h2></div>
      {available.map((path, index) => { const progress = getPathProgress(path.id); return <article className="sc-library-feature" key={path.id}>
        <div className="sc-library-index">{String(index + 1).padStart(2, '0')} <span>AVAILABLE</span></div>
        <div className="sc-library-content"><p className="sc-library-domain">{path.category} · {path.difficulty}</p><h3>{path.title}</h3><p>{path.longDescription}</p><p className="sc-library-skills"><strong>Skills practiced:</strong> {path.skills.slice(0, 5).map(skill => skill.replaceAll('-', ' ')).join(' · ')}. {path.prerequisites.length ? `Prerequisites: ${path.prerequisites.join(', ')}.` : 'No formal prerequisites listed.'}</p><Link to={`/paths/${path.id}`} className="ws-action">{currentId === path.id && progress > 0 ? 'Continue this path' : 'Explore the curriculum'} <span aria-hidden="true">→</span></Link></div>
        <div className="sc-library-aside"><div><strong>{path.modules.length}</strong><span>modules</span></div><div><strong>{path.estimatedHours}h</strong><span>estimated</span></div><div><strong>{path.labs}</strong><span>labs</span></div><div><strong>{path.challenges}</strong><span>challenges</span></div><div className="sc-library-progress"><div><span>Practice in this browser</span><strong>{progress}%</strong></div><ProgressBar value={progress} label={`${path.title} practice progress`} /></div></div>
      </article> })}
    </section>
    <section aria-labelledby="planned-paths" className="sc-planned"><div className="sc-section-intro"><span>02 / Roadmap</span><h2 id="planned-paths">Planned domains</h2><p>These are not yet available courses. Explore Wireless or Android to start now.</p></div><div className="sc-planned-list">{planned.map(path => <article data-path-state="planned" key={path.id}><div><h3>{path.title}</h3><p>{path.category} · {path.description}</p></div><span>Planned</span></article>)}</div></section>
  </div>
}
