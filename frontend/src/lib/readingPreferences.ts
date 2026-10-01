/** Restore browser-local reading preferences before the first React render. */
export function restoreReadingPreferences() {
  try {
    const read = (suffix: string) => localStorage.getItem(`platform-a11y-${suffix}`) ?? localStorage.getItem(`wififorge-a11y-${suffix}`)
    const size = Number.parseInt(read('font-size') || '16', 10)
    document.documentElement.style.setProperty('--a11y-font-size', `${Number.isFinite(size) ? Math.min(22, Math.max(12, size)) : 16}px`)
    for (const [key, name] of [['dyslexia', 'dyslexia'], ['high-contrast', 'high-contrast'], ['reduce-motion', 'reduce-motion']]) {
      document.documentElement.classList.toggle(name, read(key) === 'true')
    }
  } catch { /* Restricted storage keeps the readable defaults. */ }
}
