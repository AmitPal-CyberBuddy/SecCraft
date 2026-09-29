interface LoadingPanelProps {
  label: string
  detail?: string
  compact?: boolean
}

/** Contextual, lightweight loading state shared by lazy tools and data panels. */
export function LoadingPanel({ label, detail, compact = false }: LoadingPanelProps) {
  return (
    <div className={`technical-loading-panel ${compact ? 'technical-loading-panel-compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <div className="loading-instrument" aria-hidden="true">
        <span className="loading-instrument-core" />
        <span className="loading-instrument-orbit" />
      </div>
      <div className="loading-copy">
        <div className="loading-title">{label}</div>
        {detail && <div className="loading-detail">{detail}</div>}
      </div>
      <div className="loading-track" aria-hidden="true"><span /></div>
    </div>
  )
}
