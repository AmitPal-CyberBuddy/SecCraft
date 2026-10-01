import { scrollBehavior } from '@/lib/motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop - Ensures every route navigation starts at the top
 * Fixes the UX issue where "go to next module" would start at random scroll position
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Immediate scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    // Also scroll the main container if present
    const main = document.querySelector('main')
    if (main) {
      main.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    // Fallback smooth after a tick for any layout shifts
    const id = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() })
    }, 50)
    return () => clearTimeout(id)
  }, [pathname])

  return null
}

/**
 * useScrollToTopOnChange - Hook for intra-page navigation (lesson changes, tab changes)
 */
export function useScrollToTopOnChange(deps: any[]) {
  useEffect(() => {
    // Scroll the lesson content area to top
    const contentArea = document.getElementById('lesson-content-area')
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: scrollBehavior() })
    }
    // Also scroll window to top of content, not just random middle
    const headerOffset = 80 // Topbar height
    const element = document.getElementById('theory-content-start')
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - headerOffset - 20
      window.scrollTo({ top, behavior: scrollBehavior() })
    } else {
      // Fallback: scroll to top smoothly if no anchor
      window.scrollTo({ top: 0, behavior: scrollBehavior() })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
