interface LoadingPanelProps { label: string; detail?: string; compact?: boolean }

/** Accessible, motion-free loading state for lazy technical tools and records. */
export function LoadingPanel({ label, detail, compact = false }: LoadingPanelProps) {
  return <div className={`sc-loading ${compact ? 'is-compact' : ''}`} role="status" aria-live="polite" aria-busy="true"><span aria-hidden="true" className="sc-loading-mark" /><div><strong>{label}</strong>{detail && <p>{detail}</p>}</div></div>
}
