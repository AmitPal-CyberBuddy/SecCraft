import { restoreReadingPreferences } from './lib/readingPreferences'
import { createRoot } from 'react-dom/client'
import { MotionPreferences } from '@/components/animations/MotionPreferences'
import './index.css'
import './styles/workspace.css'
import './styles/public-home.css'
import './styles/controls.css'
import './styles/skeleton.css'
import './styles/technical-tools.css'
import './styles/secondary-pages.css'
import './styles/feedback.css'
import './styles/color-system.css'
import './styles/motion.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LocalProfileProvider } from '@/components/profile/LocalProfile'
import { SessionProvider } from '@/lib/session'

restoreReadingPreferences()

createRoot(document.getElementById('root')!).render(
  <MotionPreferences>
    <ThemeProvider>
      <LocalProfileProvider>
        {/* Session state is presentation only: it decides what to render, never what is permitted.
            The API remains the authorization boundary on every request. */}
        <SessionProvider>
          <App />
        </SessionProvider>
      </LocalProfileProvider>
    </ThemeProvider>
  </MotionPreferences>,
)

// Offline shell — registered from the build base so it also works from a
// GitHub Pages sub-path (https://<owner>.github.io/SecCraft/). Dev is skipped
// on purpose so Vite's HMR is never served from the cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // A newly activated worker may serve a different shell and asset set.
      // Reload once, but not on the initial install (when no worker controlled this tab).
      if (hadController && !reloading) {
        reloading = true
        window.location.reload()
      }
    })
    const hadController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then(r => {
        const announceWaiting = () => {
          if (r.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new Event('seccraft:update-available'))
          }
        }
        announceWaiting()
        r.addEventListener('updatefound', () => {
          const installing = r.installing
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed') announceWaiting()
          })
        })
        void r.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) void r.update().catch(() => {})
        })
        console.log('[seccraft] service worker ready —', r.scope)
      })
      .catch(e => console.log('[seccraft] service worker unavailable —', e.message))
  })
}
