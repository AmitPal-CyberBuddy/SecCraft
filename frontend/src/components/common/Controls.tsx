import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/**
 * Shared form controls. View selection uses ordinary buttons: Tab moves
 * between controls, Enter/Space selects. Every field wires label, hint and
 * error to its control via aria-describedby.
 */
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

export function SelectField({ label, hint, error, id, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string; hint?: string; error?: string; children: ReactNode
}) {
  const generatedId = useId()
  const controlId = id || generatedId
  const describedBy = [props['aria-describedby'], hint ? `${controlId}-hint` : '', error ? `${controlId}-error` : ''].filter(Boolean).join(' ') || undefined
  return <div className="ws-field">
    <label htmlFor={controlId}>{label}</label>
    {hint && <p id={`${controlId}-hint`} className="ws-field-hint">{hint}</p>}
    <select {...props} id={controlId} className={`ws-input ${className}`} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']}>{children}</select>
    {error && <p id={`${controlId}-error`} className="ws-field-error" role="alert">{error}</p>}
  </div>
}

export function TextareaField({ label, hint, error, id, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string; hint?: string; error?: string
}) {
  const generatedId = useId()
  const controlId = id || generatedId
  const describedBy = [props['aria-describedby'], hint ? `${controlId}-hint` : '', error ? `${controlId}-error` : ''].filter(Boolean).join(' ') || undefined
  return <div className="ws-field">
    <label htmlFor={controlId}>{label}</label>
    {hint && <p id={`${controlId}-hint`} className="ws-field-hint">{hint}</p>}
    <textarea {...props} id={controlId} className={`ws-input ${className}`} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']} />
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

/* ── Filter bar ──────────────────────────────────────────────────────────── */

export interface FilterOption { value: string; label: string }
export interface FilterSpec {
  /** Stable key used for the URL query param. */
  key: string
  label: string
  options: FilterOption[]
  /** Placeholder shown for the "all" option. Defaults to `All ${label.toLowerCase()}s`. */
  allLabel?: string
}

/**
 * The catalogue filter pattern shared by Modules, Challenges and Labs:
 * search input, one select per filter, a live result count, and a clear
 * action that appears only when a filter is active.
 */
export function FilterBar({ searchLabel, searchPlaceholder, searchValue, onSearch, filters, values, onFilter, count, total, countLabel, onClear, hasActiveFilters }: {
  searchLabel: string
  searchPlaceholder: string
  searchValue: string
  onSearch: (value: string) => void
  filters: FilterSpec[]
  values: Record<string, string | null>
  onFilter: (key: string, value: string | null) => void
  count: number
  total: number
  countLabel: string
  onClear: () => void
  hasActiveFilters: boolean
}) {
  return <div className="ws-filter-bar">
    <div className="ws-filter-controls">
      <TextField type="search" label={searchLabel} value={searchValue} onChange={event => onSearch(event.target.value)} placeholder={searchPlaceholder} />
      {filters.map(filter => <SelectField
        key={filter.key}
        label={filter.label}
        value={values[filter.key] ?? ''}
        onChange={event => onFilter(filter.key, event.target.value || null)}
      >
        <option value="">{filter.allLabel ?? `All ${filter.label.toLowerCase()}s`}</option>
        {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </SelectField>)}
    </div>
    <div className="ws-filter-summary">
      <p role="status">Showing {count} of {total} {countLabel}</p>
      {hasActiveFilters && <button type="button" className="ws-btn ws-btn-secondary ws-btn-sm" onClick={onClear}>Clear filters</button>}
    </div>
  </div>
}
