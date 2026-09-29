import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { PointsToast } from '@/components/gamification/PointsToast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { KeyboardShortcuts } from '@/components/shortcuts/KeyboardShortcuts'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { Dashboard } from '@/pages/Dashboard'
import { LearningPath } from '@/pages/LearningPath'
import { LearningPaths } from '@/pages/LearningPaths'
import { PathDetail } from '@/pages/PathDetail'
import { Modules } from '@/pages/Modules'
import { ModuleDetail } from '@/pages/ModuleDetail'
import { Labs } from '@/pages/Labs'
import { Challenges } from '@/pages/Challenges'
import { ChallengeDetail } from '@/pages/ChallengeDetail'
import { Reference } from '@/pages/Reference'
import { Engagement } from '@/pages/Engagement'
import { Settings } from '@/pages/Settings'
import { Reports } from '@/pages/Reports'
import { Analytics } from '@/pages/Analytics'
import { Achievements } from '@/pages/Achievements'
import { Daily } from '@/pages/Daily'
import { NotFound } from '@/pages/NotFound'

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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
            {/* Platform-level learning paths */}
            <Route path="/paths" element={<LearningPaths />} />
            <Route path="/paths/:pathId" element={<PathDetail />} />
            <Route path="/paths/:pathId/modules" element={<Modules />} />
            <Route path="/paths/:pathId/modules/:id" element={<ModuleDetail />} />
            {/* Legacy routes with redirects / backward compat — Stage 6 compatibility */}
            <Route path="/path" element={<Navigate to="/paths/wireless-pentesting" replace />} />
            <Route path="/learning-path" element={<Navigate to="/paths/wireless-pentesting" replace />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/modules/:id" element={<ModuleDetail />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/paths/:pathId/labs" element={<Labs />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/paths/:pathId/challenges" element={<Challenges />} />
            <Route path="/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/paths/:pathId/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/reference" element={<Reference />} />
            <Route path="/engagement" element={<Engagement />} />
            <Route path="/engagement/:id" element={<Engagement />} />
            <Route path="/assessments" element={<Engagement />} />
            <Route path="/assessments/:id" element={<Engagement />} />
            <Route path="/paths/:pathId/assessments" element={<Engagement />} />
            <Route path="/paths/:pathId/engagements" element={<Engagement />} />
            <Route path="/paths/:pathId/engagements/:id" element={<Engagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            {/* New: split dashboard — analytics, achievements, daily moved to separate pages */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/progress" element={<Analytics />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/badges" element={<Achievements />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/streak" element={<Daily />} />
            {/* Keep legacy LearningPath component accessible for reference but redirect main entry */}
            <Route path="/legacy/path" element={<LearningPath />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Shell>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
