import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { PointsToast } from '@/components/gamification/PointsToast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { KeyboardShortcuts } from '@/components/shortcuts/KeyboardShortcuts'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { Dashboard } from '@/pages/Dashboard'
import { LearningPath } from '@/pages/LearningPath'
import { Modules } from '@/pages/Modules'
import { ModuleDetail } from '@/pages/ModuleDetail'
import { Labs } from '@/pages/Labs'
import { Challenges } from '@/pages/Challenges'
import { ChallengeDetail } from '@/pages/ChallengeDetail'
import { Reference } from '@/pages/Reference'
import { Settings } from '@/pages/Settings'
import { Reports } from '@/pages/Reports'

const GuidedTour = lazy(() => import('@/components/tour/GuidedTour').then(m => ({ default: m.GuidedTour })))

function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('open-search', handleOpenSearch as any)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('open-search', handleOpenSearch as any)
    }
  }, [])

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <PointsToast />
        <OfflineIndicator />
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        <KeyboardShortcuts />
        <Suspense fallback={null}>
          <GuidedTour />
        </Suspense>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/path" element={<LearningPath />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/modules/:id" element={<ModuleDetail />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/reference" element={<Reference />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Shell>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
