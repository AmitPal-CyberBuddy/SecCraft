import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/production.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LocalProfileProvider } from '@/components/profile/LocalProfile'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LocalProfileProvider>
      <App />
    </LocalProfileProvider>
  </ThemeProvider>,
)

// Offline shell — registered from the build base so it also works from a
// GitHub Pages sub-path (https://<owner>.github.io/WiFiForge/). Dev is skipped
// on purpose so Vite's HMR is never served from the cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(r => console.log('[wififorge] service worker ready —', r.scope))
      .catch(e => console.log('[wififorge] service worker unavailable —', e.message))
  })
}
