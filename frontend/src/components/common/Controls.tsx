import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

/** View selection uses ordinary buttons: Tab moves between controls, Enter/Space selects. */
export function ViewSwitcher<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (value: T) => void
  options: readonly { id: T; label: string; icon?: ReactNode; count?: number | null }[]
}) {
  return <div className="ws-view-switcher" role="group" aria-label={label}>
    {options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
      {option.icon && <span aria-hidden="true">{option.icon}</span>}
      <span>{option.label}</span>
      {option.count != null && <span className="ws-view-count">{option.count}</span>}
    </button>)}
  </div>
}

export function TextField({ label, hint, error, id, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: string; error?: string
}) {
  const generatedId = useId()
  const controlId = id || generatedId
  const describedBy = [props['aria-describedby'], hint ? `${controlId}-hint` : '', error ? `${controlId}-error` : ''].filter(Boolean).join(' ') || undefined
  return <div className="ws-field">
    <label htmlFor={controlId}>{label}</label>
    {hint && <p id={`${controlId}-hint`} className="ws-field-hint">{hint}</p>}
    <input {...props} id={controlId} className={`ws-input ${className}`} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']} />
    {error && <p id={`${controlId}-error`} className="ws-field-error" role="alert">{error}</p>}
  </div>
}

/** Static guidance is a note; async feedback opts into a live announcement. */
export function Notice({ children, title, kind = 'info', live = false, action }: {
  children: ReactNode; title?: string; kind?: 'info' | 'success' | 'warning' | 'error'; live?: boolean; action?: ReactNode
}) {
  return <div className={`ws-notice ws-notice-${kind}`} role={live ? kind === 'error' ? 'alert' : 'status' : 'note'}>
    <div>{title && <strong>{title}</strong>}<div>{children}</div></div>
    {action && <div className="ws-notice-action">{action}</div>}
  </div>
}
