import { LearningProgress } from '@/components/learning/LearningProgress'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Shared workspace vocabulary — the design-system primitives.
 *
 * Every page composes these instead of inventing its own headers, cards,
 * badges, filters and states. All values are presentation-only; never infer
 * authorization here. Class names are stable: tests query rendered output.
 */
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

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonClass = (tone: ButtonTone, size: ButtonSize) =>
  `ws-btn ws-btn-${tone} ws-btn-${size}`

/** Shared button. Renders a link when `to` is given, otherwise a button. */
export function Button({ to, tone = 'primary', size = 'md', children, className = '', ...props }:
  { to?: string; tone?: ButtonTone; size?: ButtonSize; children: ReactNode; className?: string } &
  (React.ButtonHTMLAttributes<HTMLButtonElement> | React.AnchorHTMLAttributes<HTMLAnchorElement>)) {
  const cls = `${buttonClass(tone, size)} ${className}`.trim()
  if (to) {
    const { onClick, ...rest } = props as React.AnchorHTMLAttributes<HTMLAnchorElement>
    return <Link to={to} className={cls} onClick={onClick} {...rest}>{children}</Link>
  }
  return <button type="button" className={cls} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
}

/* ── Badges ──────────────────────────────────────────────────────────────── */

type BadgeTone = 'default' | 'learning' | 'success' | 'warning' | 'danger' | 'owner' | 'muted'

/** Small status label. Always paired with text — never hue alone. */
export function Badge({ tone = 'default', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`ws-badge ws-badge-${tone} ${className}`.trim()}>{children}</span>
}

/* ── Cards & sections ────────────────────────────────────────────────────── */

/** Padded surface card. Use for self-contained blocks (stats, notices, tools). */
export function Card({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`ws-card ${className}`}>{title && <div className="ws-card-heading"><h2>{title}</h2>{aside}</div>}{children}</section>
}

/** Consistent section intro: kicker, title, optional description and action. */
export function SectionHeader({ kicker, title, description, action, id }: { kicker?: string; title: string; description?: string; action?: ReactNode; id?: string }) {
  return <div className="ws-section-header">
    <div>
      {kicker && <p className="ws-kicker">{kicker}</p>}
      <h2 id={id}>{title}</h2>
      {description && <p className="ws-muted">{description}</p>}
    </div>
    {action && <div className="ws-section-action">{action}</div>}
  </div>
}

/** Breadcrumb trail. `items` are labels; the last item is the current page. */
export function Breadcrumb({ items, label = 'Breadcrumb' }: { items: { label: string; to?: string }[]; label?: string }) {
  return <nav aria-label={label} className="ws-breadcrumb">
    {items.map((item, index) => {
      const last = index === items.length - 1
      return <span key={`${item.label}-${index}`} className="ws-breadcrumb-item">
        {index > 0 && <span aria-hidden="true">/</span>}
        {item.to && !last ? <Link to={item.to}>{item.label}</Link> : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
      </span>
    })}
  </nav>
}

/* ── Stats ───────────────────────────────────────────────────────────────── */

export interface StatItem { label: string; value: ReactNode; detail?: string }

/** Big-number stat grid (catalogue counts, record facts, summaries). */
export function StatGrid({ items, label }: { items: StatItem[]; label?: string }) {
  return <dl className="ws-stat-grid" aria-label={label}>
    {items.map(item => <div key={item.label} className="ws-stat">
      <dt>{item.label}</dt>
      <dd>{item.value}{item.detail && <small>{item.detail}</small>}</dd>
    </div>)}
  </dl>
}

/* ── Async states ────────────────────────────────────────────────────────── */

/** Loading state. `detail` explains what is being fetched and from where. */
export function LoadingState({ label, detail, compact = false }: { label: string; detail?: string; compact?: boolean }) {
  return <div className={`sc-loading ${compact ? 'is-compact' : ''}`} role="status" aria-live="polite">
    <span className="sc-loading-mark" aria-hidden="true" />
    <div><strong>{label}</strong>{detail && <p>{detail}</p>}</div>
  </div>
}

/** Error state with an optional retry action. */
export function ErrorState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ws-error" role="alert">
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {action && <div className="ws-empty-action">{action}</div>}
  </div>
}
