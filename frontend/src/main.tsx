import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import './styles/production.css'
import './styles/refinement.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LocalProfileProvider } from '@/components/profile/LocalProfile'
import { SessionProvider } from '@/lib/session'

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <ThemeProvider>
      <LocalProfileProvider>
        {/* Session state is presentation only: it decides what to render, never what is permitted.
            The API remains the authorization boundary on every request. */}
        <SessionProvider>
          <App />
        </SessionProvider>
      </LocalProfileProvider>
    </ThemeProvider>
  </MotionConfig>,
)

// Offline shell — registered from the build base so it also works from a
// GitHub Pages sub-path (https://<owner>.github.io/SecCraft/). Dev is skipped
// on purpose so Vite's HMR is never served from the cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(r => console.log('[seccraft] service worker ready —', r.scope))
      .catch(e => console.log('[seccraft] service worker unavailable —', e.message))
  })
}
