import { useState, useEffect } from 'react'

function safeGet(k: string, f: string) {
  try {
    if (typeof localStorage === 'undefined') return f
    // Platform-first, legacy fallback
    const v = localStorage.getItem(k) || localStorage.getItem(k.replace('platform-', 'wififorge-')) || f
    return v
  } catch { return f }
}
function safeSet(k: string, v: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(k, v)
      // Keep legacy copy for backward compat during migration
      const legacy = k.replace('platform-', 'wififorge-')
      if (legacy !== k) {
        try { localStorage.setItem(legacy, v) } catch {}
      }
    }
  } catch {}
}

export function AccessibilityPanel({ className = '' }: { className?: string }) {
  const [fontSize, setFontSize] = useState(() => {
    try { const n = parseInt(safeGet('platform-a11y-font-size', '16')); return isNaN(n) ? 16 : Math.min(22, Math.max(12, n)) } catch { return 16 }
  })
  const [dyslexia, setDyslexia] = useState(() => { try { return safeGet('platform-a11y-dyslexia', 'false') === 'true' } catch { return false } })
  const [highContrast, setHighContrast] = useState(() => { try { return safeGet('platform-a11y-high-contrast', 'false') === 'true' } catch { return false } })
  const [reduceMotion, setReduceMotion] = useState(() => { try { return safeGet('platform-a11y-reduce-motion', 'false') === 'true' } catch { return false } })

  useEffect(() => {
    safeSet('platform-a11y-font-size', fontSize.toString())
    safeSet('platform-a11y-dyslexia', dyslexia.toString())
    safeSet('platform-a11y-high-contrast', highContrast.toString())
    safeSet('platform-a11y-reduce-motion', reduceMotion.toString())
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--a11y-font-size', `${fontSize}px`)
        document.documentElement.classList.toggle('dyslexia', dyslexia)
        document.documentElement.classList.toggle('high-contrast', highContrast)
        document.documentElement.classList.toggle('reduce-motion', reduceMotion)
      }
    } catch {}
  }, [fontSize, dyslexia, highContrast, reduceMotion])

  return (
    <section className={`sc-accessibility-settings rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sm:p-6 ${className}`} aria-label="Accessibility">
      <h3 className="text-base font-semibold text-[var(--ink-primary)]">Accessibility</h3>
      <div className="sc-preference-row">
        <div><h4>Reduce motion</h4><p>Keep interaction effects still. Your device’s reduced-motion setting is always respected.</p></div>
        <button type="button" className="ws-action ws-action-secondary" aria-label="Reduce Motion" aria-pressed={reduceMotion} onClick={() => setReduceMotion(value => !value)}>{reduceMotion ? 'On' : 'Off'}</button>
      </div>
      <details className="sc-text-options">
        <summary>Text and contrast options</summary>
        <div className="sc-preference-row">
          <span>Text size · {fontSize}px</span>
          <div className="flex items-center gap-2">
            <button type="button" className="ws-action ws-action-secondary" aria-label="Decrease base text size" disabled={fontSize <= 12} onClick={() => setFontSize(size => Math.max(12, size - 1))}>−</button>
            <button type="button" className="ws-action ws-action-secondary" aria-label="Increase base text size" disabled={fontSize >= 22} onClick={() => setFontSize(size => Math.min(22, size + 1))}>+</button>
          </div>
        </div>
        <div className="sc-preference-row"><span>Serif reading font</span><button type="button" className="ws-action ws-action-secondary" aria-label="Serif reading font" aria-pressed={dyslexia} onClick={() => setDyslexia(value => !value)}>{dyslexia ? 'On' : 'Off'}</button></div>
        <div className="sc-preference-row"><span>Stronger contrast</span><button type="button" className="ws-action ws-action-secondary" aria-label="Stronger contrast" aria-pressed={highContrast} onClick={() => setHighContrast(value => !value)}>{highContrast ? 'On' : 'Off'}</button></div>
      </details>
    </section>
  )
}
