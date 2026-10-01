import { useEffect, useState } from 'react'

/** Deployment notice shared by public pages, learner workspace and owner console. */
export function UpdateNotice() {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onUpdate = () => setAvailable(true)
    window.addEventListener('seccraft:update-available', onUpdate)
    void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
      .then(registration => { if (registration?.waiting && navigator.serviceWorker.controller) setAvailable(true) })
      .catch(() => {})
    return () => window.removeEventListener('seccraft:update-available', onUpdate)
  }, [])

  if (!available) return null
  return <div role="status" className="fixed bottom-4 left-4 z-[110] max-w-sm rounded-xl border border-[var(--accent-border)] bg-[var(--panel-inset)] p-4 text-sm text-[var(--ink-primary)] shadow-xl">
    <p className="font-semibold">SecCraft update available</p>
    <p className="mt-1 text-[var(--ink-secondary)]">Save or export any work in progress before updating. You can continue for now.</p>
    <div className="mt-3 flex gap-3">
      <button type="button" className="rounded-lg sc-learning-action px-3 py-2 font-semibold " onClick={() => {
        void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(registration => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }))
      }}>Update now</button>
      <button type="button" className="rounded-lg border border-[var(--line-strong)] px-3 py-2" onClick={() => setAvailable(false)}>Later</button>
    </div>
  </div>
}
