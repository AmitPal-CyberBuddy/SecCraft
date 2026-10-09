import type { CSSProperties } from 'react'

/**
 * Structural loading placeholders.
 *
 * These are intentionally motionless: the workspace motion contract keeps content stationary and
 * a placeholder is not a state change. The surrounding `role="status"` region carries the
 * accessible announcement; every visual bar is decorative.
 */

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`sc-skeleton ${className}`} style={style} />
}

/** Full-page placeholder mirroring ws-page-header + one panel, so layouts do not jump on arrival. */
export function SkeletonPage({ label }: { label: string }) {
  return (
    <div className="sc-skeleton-page" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="sc-skeleton-header">
        <Skeleton className="sc-skeleton-eyebrow" />
        <Skeleton className="sc-skeleton-title" />
        <Skeleton className="sc-skeleton-desc" />
      </div>
      <div className="sc-skeleton-panel">
        <Skeleton className="sc-skeleton-heading" />
        <div className="sc-skeleton-lines">
          <Skeleton className="sc-skeleton-line" style={{ width: '88%' }} />
          <Skeleton className="sc-skeleton-line" style={{ width: '72%' }} />
          <Skeleton className="sc-skeleton-line" style={{ width: '61%' }} />
        </div>
      </div>
    </div>
  )
}

/** Inline placeholder for a single record row inside an existing panel. */
export function SkeletonRow({ label }: { label: string }) {
  return (
    <span className="sc-skeleton-inline" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="sc-skeleton-line" style={{ width: '100%' }} />
      <Skeleton className="sc-skeleton-line is-short" style={{ width: '46%' }} />
    </span>
  )
}
