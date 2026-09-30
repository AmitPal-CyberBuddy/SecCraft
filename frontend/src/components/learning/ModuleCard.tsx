import { moduleOrdinal } from '@/content/module-ordinal'
import { Link } from 'react-router-dom'
import modules from '@/content/modules.json'
import { AVAILABLE_LABS } from '@/content/labs'
import type { ContentTier } from '@/lib/contentAccess'
import { ProgressBar } from '@/components/common/Workspace'

interface Props {
  id: string; title: string; phase: number; difficulty: string; estimated_hours: number
  status: string; progress?: number; description?: string; locked?: boolean
  tier?: ContentTier; tierIsAccountContent?: boolean
}

export function ModuleCard({ id, title, phase, difficulty, estimated_hours, status, progress = 0, description, locked = false, tier = 'preview', tierIsAccountContent = false }: Props) {
  const lessonCount = modules.find(m => m.id === id)?.lessons.length ?? 0
  const labCount = AVAILABLE_LABS.filter(lab => lab.module === id).length
  return <article className="ws-catalog-row">
    <span className="ws-row-number">{moduleOrdinal(id)}</span>
    <div className="ws-row-main"><div className="ws-row-meta">Phase {phase} · {difficulty} · {estimated_hours}h · {lessonCount} lessons{labCount ? ` · ${labCount} labs` : ''} · {id.startsWith('android-') ? 'Offline source review' : status === 'simulated' ? 'Simulation' : 'RF required'}</div>
      <h3>{title}</h3>{description && <p>{description}</p>}
      <div className="ws-row-progress"><ProgressBar value={progress} label={`${title} practice progress`} /><span>{progress}% practice</span></div>
    </div>
    <div className="ws-row-side"><span className="ws-label" title={tier === 'full' ? 'Full Curriculum is an account learning experience, not protected content' : 'Preview Curriculum is open to everyone'}>{tier === 'preview' ? 'Preview' : tierIsAccountContent ? 'Full · account experience' : 'Full'}</span>
      {locked ? <span className="ws-muted">Complete previous modules</span> : <Link to={`/modules/${id}`} className="ws-row-link">{progress >= 100 ? 'Review' : progress ? 'Continue' : 'Open module'} →</Link>}
    </div>
  </article>
}
