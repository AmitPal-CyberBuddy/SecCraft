import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { PointsToast } from '@/components/gamification/PointsToast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { KeyboardShortcuts } from '@/components/shortcuts/KeyboardShortcuts'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { PublicLayout } from '@/components/public/PublicLayout'
import { Dashboard } from '@/pages/Dashboard'
import { PublicHome } from '@/pages/PublicHome'
import { AboutPage, HowItWorksPage } from '@/pages/PublicInfo'
import { LoginPage, SignupPage, AccountStatusPage, ResetPasswordPage, UpdatePasswordPage } from '@/pages/Account'
import { AdminPage } from '@/pages/Admin'
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

const workspace = (page: ReactNode) => <Shell>{page}</Shell>
const publicRoutes = new Set(['/', '/about', '/how-it-works', '/login', '/signup', '/account', '/reset-password', '/update-password'])

function ApplicationRoutes() {
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const location = useLocation()
  const isPublicRoute = publicRoutes.has(location.pathname)

  useEffect(() => {
    if (isPublicRoute) return
    const handleOpenSearch = () => setSearchOpen(true)
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('open-search', handleOpenSearch as EventListener)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('open-search', handleOpenSearch as EventListener)
    }
  }, [isPublicRoute])

  return (
    <>
      <ScrollToTop />
      <OfflineIndicator />
      {!isPublicRoute && <>
        <PointsToast />
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        <KeyboardShortcuts />
        <Suspense fallback={null}><GuidedTour /></Suspense>
      </>}
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<PublicHome />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="account" element={<AccountStatusPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="update-password" element={<UpdatePasswordPage />} />
        </Route>

        {/* The former dashboard remains available to guests at /app; / stays a public homepage. */}
        <Route path="/app" element={workspace(<Dashboard />)} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/admin" element={workspace(<AdminPage />)} />

        {/* Existing learning routes remain intact and usable without an account. */}
        <Route path="/paths" element={workspace(<LearningPaths />)} />
        <Route path="/paths/:pathId" element={workspace(<PathDetail />)} />
        <Route path="/paths/:pathId/modules" element={workspace(<Modules />)} />
        <Route path="/paths/:pathId/modules/:id" element={workspace(<ModuleDetail />)} />
        <Route path="/path" element={<Navigate to="/paths/wireless-pentesting" replace />} />
        <Route path="/learning-path" element={<Navigate to="/paths/wireless-pentesting" replace />} />
        <Route path="/modules" element={workspace(<Modules />)} />
        <Route path="/modules/:id" element={workspace(<ModuleDetail />)} />
        <Route path="/labs" element={workspace(<Labs />)} />
        <Route path="/paths/:pathId/labs" element={workspace(<Labs />)} />
        <Route path="/challenges" element={workspace(<Challenges />)} />
        <Route path="/paths/:pathId/challenges" element={workspace(<Challenges />)} />
        <Route path="/challenges/:id" element={workspace(<ChallengeDetail />)} />
        <Route path="/paths/:pathId/challenges/:id" element={workspace(<ChallengeDetail />)} />
        <Route path="/reference" element={workspace(<Reference />)} />
        <Route path="/engagement" element={workspace(<Engagement />)} />
        <Route path="/engagement/:id" element={workspace(<Engagement />)} />
        <Route path="/assessments" element={workspace(<Engagement />)} />
        <Route path="/assessments/:id" element={workspace(<Engagement />)} />
        <Route path="/paths/:pathId/assessments" element={workspace(<Engagement />)} />
        <Route path="/paths/:pathId/engagements" element={workspace(<Engagement />)} />
        <Route path="/paths/:pathId/engagements/:id" element={workspace(<Engagement />)} />
        <Route path="/reports" element={workspace(<Reports />)} />
        <Route path="/settings" element={workspace(<Settings />)} />
        <Route path="/analytics" element={workspace(<Analytics />)} />
        <Route path="/progress" element={workspace(<Analytics />)} />
        <Route path="/achievements" element={workspace(<Achievements />)} />
        <Route path="/badges" element={workspace(<Achievements />)} />
        <Route path="/daily" element={workspace(<Daily />)} />
        <Route path="/streak" element={workspace(<Daily />)} />
        <Route path="/legacy/path" element={workspace(<LearningPath />)} />
        <Route path="*" element={workspace(<NotFound />)} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary><ApplicationRoutes /></ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
