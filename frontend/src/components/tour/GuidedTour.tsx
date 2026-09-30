import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Map, X } from 'lucide-react'
import { useSession } from '@/lib/session'
import { canAccessTier } from '@/lib/contentAccess'

const SEEN_KEY = 'platform-tour-seen'
function rememberTour() {
  try {
    localStorage.setItem(SEEN_KEY, 'true')
    // Respect a previously shipped local preference without making it a separate tour.
    localStorage.setItem('wififorge-tour-seen', 'true')
  } catch { /* storage may be unavailable */ }
}

/** A short orientation to controls visible on this page. Never point at routes or widgets not rendered here. */
export function GuidedTour() {
  const { pathname } = useLocation()
  const { userState } = useSession()
  const full = canAccessTier(userState, 'full')
  const [seen, setSeen] = useState(() => {
    try { return (localStorage.getItem(SEEN_KEY) || localStorage.getItem('wififorge-tour-seen')) === 'true' } catch { return false }
  })
  const [showPrompt, setShowPrompt] = useState(false)
  useEffect(() => {
    if (seen) return
    const timer = window.setTimeout(() => setShowPrompt(true), 2500)
    return () => window.clearTimeout(timer)
  }, [seen])

  const dismissPrompt = () => { setShowPrompt(false); setSeen(true); rememberTour() }
  const startTour = () => {
    setShowPrompt(false)
    const steps: DriveStep[] = [
      { popover: { title: 'A quick tour of this workspace', description: 'We will point to the controls on this screen. Nothing in the tour changes your progress. Use Next, Back, or Close at any time.' } },
      { element: '.sc-experience-row', popover: { title: full ? 'Your account experience' : 'Your preview experience', description: full ? 'Full Curriculum is shown for this approved account. Your browser practice is still unverified; use Progress sync to see account-held records.' : 'Preview Curriculum is shown here. Practice is saved in this browser and is unverified. Account status changes the experience, not whether bundled course files can be read.', side: 'bottom' } },
      { element: '#mobile-navigation-toggle', popover: { title: 'Find every tool', description: 'Open All tools for the full list: learning paths, labs, challenges, reference, reports and your account pages. The main learning links are also in the header on larger screens.', side: 'bottom' } },
      ...(pathname === '/app' && document.querySelector('.ws-focus') ? [
        { element: '.ws-focus', popover: { title: 'Your next learning step', description: 'This suggestion comes from lessons and practice recorded in this browser. Select its action to continue; it does not claim a verified skill or grade.', side: 'bottom' as const } },
      ] : []),
      { element: '[data-tour="search"]', popover: { title: 'Search the learning material', description: 'Select Search to find a path, module, lab or reference. You can also press Control K (or Command K on a Mac).', side: 'bottom' } },
      { element: '.sc-avatar-trigger', popover: { title: 'Your profile and records', description: 'Open this menu for your profile, settings and progress sync. It also shows your account state and sign-in options where applicable.', side: 'bottom' } },
    ]
    const tour = driver({
      steps,
      showProgress: true,
      animate: false,
      overlayColor: '#0c1717',
      stagePadding: 7,
      stageRadius: 5,
      popoverClass: 'sc-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      onDestroyStarted: () => { rememberTour(); setSeen(true); tour.destroy() },
    })
    tour.drive()
  }

  return <>
    {showPrompt && <section className="sc-tour-invite" aria-label="Workspace tour invitation">
      <button type="button" className="sc-tour-dismiss" aria-label="Dismiss tour invitation" onClick={dismissPrompt}><X size={16} aria-hidden="true" /></button>
      <span className="sc-library-domain">Orientation</span>
      <h2>New to this workspace?</h2>
      <p>See what the navigation, your learning record and the main controls actually do. About one minute; no progress is changed.</p>
      <div><button type="button" className="ws-action" onClick={startTour}>Show me around</button><button type="button" className="ws-action ws-action-secondary" onClick={dismissPrompt}>Not now</button></div>
    </section>}
    <button type="button" onClick={startTour} className="sc-tour-launch" aria-label="Start workspace tour" title="Tour the workspace"><Map size={18} aria-hidden="true" /><span>Tour</span></button>
  </>
}
