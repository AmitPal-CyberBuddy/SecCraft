import { LearningProgress } from '@/components/learning/LearningProgress'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Shared workspace vocabulary. All values are presentation-only; never infer authorization here. */
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) {
  return <header className="ws-page-header"><div>{eyebrow && <p className="ws-label">{eyebrow}</p>}<h1>{title}</h1><span key={title} aria-hidden="true" className="sc-arrival-mark" />{description && <p className="ws-muted">{description}</p>}</div>{action && <div className="ws-header-action">{action}</div>}</header>
}
export function Panel({ title, aside, children, className = '', surface = false }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; surface?: boolean }) {
  return <section className={`ws-panel ${surface ? 'ws-panel-surface' : ''} ${className}`}>{title && <div className="ws-panel-heading"><h2>{title}</h2>{aside}</div>}{children}</section>
}
export function ActionLink({ to, children, secondary = false }: { to: string; children: ReactNode; secondary?: boolean }) {
  return <Link to={to} className={`ws-action ${secondary ? 'ws-action-secondary' : ''}`}>{children}</Link>
}
export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="ws-progress"><LearningProgress value={value} label={label} /></div>
}

export function MetadataRow({ label, value, aside, mono = false }: { label: string; value: ReactNode; aside?: ReactNode; mono?: boolean }) {
  return <div className="ws-metadata-row"><span>{label}</span><div className={mono ? 'ws-mono' : undefined}>{value}{aside}</div></div>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ws-empty"><strong>{title}</strong>{description && <p>{description}</p>}{action && <div className="ws-empty-action">{action}</div>}</div>
}
