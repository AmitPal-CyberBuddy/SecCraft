import { Link } from 'react-router-dom'
import learningPaths from '@/content/learning-paths.json'
import modules from '@/content/modules.json'
import { PageHeader, SectionHeader } from '@/components/common/Workspace'
import { useSession } from '@/lib/session'
import { allows } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

export function LearningPaths() {
  const { userState } = useSession()
  const hasLearningAccess = allows(userState, 'learning-content')
  const available = learningPaths.filter(path => path.status === 'available')
  const planned = learningPaths.filter(path => path.status !== 'available')
  const firstModuleFor = (pathId: string) => {
    const path = learningPaths.find(item => item.id === pathId)
    const firstId = path?.modules[0]
    return firstId ? modules.find(module => module.id === firstId) : undefined
  }
  return <div className="sc-library">
    <PageHeader eyebrow="Curriculum library" title="Learning paths" description="Structured technical study, applied practice and evidence-led investigation. Wireless and Android paths are available now; other domains are planned. The catalogue and content details are public — sign in for full learning materials." action={<StateChip state={userState} />} />
    <section className="sc-modules-access" aria-label="Learning access"><div><strong>{hasLearningAccess ? 'Approved content' : 'Catalogue & practice'}</strong><p>{hasLearningAccess ? 'Protected lesson text and knowledge-check prompts are available for this account.' : 'Browse every path, module and lesson outline without signing in. Approved accounts unlock protected lesson text and knowledge-check prompts.'}</p></div>{!hasLearningAccess && <Link to="/account" className="ws-text-action">Request or check access →</Link>}</section>
    <section aria-labelledby="available-paths"><SectionHeader kicker="01 / Available curriculum" title="Start with a domain" id="available-paths" />
      {available.map((path, index) => <article className="sc-library-feature" key={path.id}>
        <div className="sc-library-index">{String(index + 1).padStart(2, '0')} <span>AVAILABLE</span></div>
        <div className="sc-library-content"><p className="sc-library-domain">{path.category} · {path.difficulty}</p><h3>{path.title}</h3><p>{path.longDescription}</p><p className="sc-library-skills"><strong>Skills practiced:</strong> {path.skills.slice(0, 5).map(skill => skill.replaceAll('-', ' ')).join(' · ')}. {path.prerequisites.length ? `Prerequisites: ${path.prerequisites.join(', ')}.` : 'No formal prerequisites listed.'}</p><div className="sc-library-actions"><Link to={`/paths/${path.id}`} className="ws-action">Explore the curriculum <span aria-hidden="true">→</span></Link>{firstModuleFor(path.id) && <Link to={`/paths/${path.id}/modules/${firstModuleFor(path.id)!.id}`} className="ws-text-action">Start with {firstModuleFor(path.id)!.title} →</Link>}</div></div>
        <div className="sc-library-aside"><div><strong>{path.modules.length}</strong><span>modules</span></div><div><strong>{path.estimatedHours}h</strong><span>estimated</span></div><div><strong>{path.labs}</strong><span>labs</span></div><div><strong>{path.challenges}</strong><span>challenges</span></div></div>
      </article>)}
    </section>
    <section aria-labelledby="planned-paths" className="sc-planned"><SectionHeader kicker="02 / Roadmap" title="Planned domains" description="These are not yet available courses. Explore Wireless or Android to start now." id="planned-paths" /><div className="sc-planned-list">{planned.map(path => <article key={path.id}><div><h3>{path.title}</h3><p>{path.category} · {path.description}</p></div><span>Planned</span></article>)}</div></section>
  </div>
}
