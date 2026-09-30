import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Shared workspace vocabulary. All values are presentation-only; never infer authorization here. */
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="ws-page-header"><div>{eyebrow && <p className="ws-label">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="ws-muted">{description}</p>}</div>{action && <div className="ws-header-action">{action}</div>}</header>
}
export function Panel({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`ws-panel ${className}`}>{title && <div className="ws-panel-heading"><h2>{title}</h2>{aside}</div>}{children}</section>
}
export function ActionLink({ to, children, secondary = false }: { to: string; children: ReactNode; secondary?: boolean }) {
  return <Link to={to} className={`ws-action ${secondary ? 'ws-action-secondary' : ''}`}>{children}</Link>
}
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value))
  return <div className="ws-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(safe)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${safe}%` }} /></div>
}

export function MetadataRow({ label, value, aside, mono = false }: { label: string; value: ReactNode; aside?: ReactNode; mono?: boolean }) {
  return <div className="ws-metadata-row"><span>{label}</span><div className={mono ? 'ws-mono' : undefined}>{value}{aside}</div></div>
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="ws-empty"><strong>{title}</strong>{description && <p>{description}</p>}</div>
}
