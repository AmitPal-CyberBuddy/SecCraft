import { Link } from 'react-router-dom'

interface Props {
  id: string; title: string; module: string; difficulty: string; type: string
  level: string; estimated_time: string; points: number; status: string
  description: string; skills: string[]; completed?: boolean
}

export function ChallengeCard({ id, title, module, difficulty, type, level, estimated_time, points, status, description, skills, completed = false }: Props) {
  return <article className="ws-catalog-row">
    <span className="ws-row-number">{id.split('-').at(-1)}</span>
    <div className="ws-row-main"><div className="ws-row-meta">{module} · {level.replace('-', ' ')} · {difficulty} · {estimated_time}</div>
      <h3>{title}</h3><p>{description}</p>{skills.length > 0 && <p><strong>Skills practiced:</strong> {skills.slice(0, 3).map(skill => skill.replaceAll('-', ' ')).join(' · ')}</p>}<div className="ws-row-meta">{type.replaceAll('_', ' ')} · {status === 'simulated' ? 'Offline evidence' : 'Offline reasoning · RF validation not supplied'}</div>
    </div>
    <div className="ws-row-side"><span className="ws-label" aria-label="Local checkpoint status">{completed ? 'Checkpoint recorded locally' : 'No checkpoint recorded'}</span><span className="ws-muted">{points} local practice XP</span><Link className="ws-row-link" to={`/challenges/${id}`}>{completed ? 'Review challenge' : 'Open challenge'} →</Link></div>
  </article>
}
