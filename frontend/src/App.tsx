import { FeedbackPage } from '@/pages/Feedback'
import { AdminFeedback } from '@/pages/AdminFeedback'
import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, RouterProvider, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { AdminShell } from '@/components/layout/AdminShell'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { PointsToast } from '@/components/gamification/PointsToast'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { KeyboardShortcuts } from '@/components/shortcuts/KeyboardShortcuts'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { UpdateNotice } from '@/components/offline/UpdateNotice'
import { PublicLayout } from '@/components/public/PublicLayout'
import { Dashboard } from '@/pages/Dashboard'
import { PublicHome } from '@/pages/PublicHome'
import { AboutPage, HowItWorksPage } from '@/pages/PublicInfo'
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

// Account surfaces are route-split: most sessions are guests and never open them, and the owner
// console is a separate experience that no learner needs to download.
const LoginPage = lazy(() => import('@/pages/Account').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/Account').then(m => ({ default: m.SignupPage })))
const AccountStatusPage = lazy(() => import('@/pages/Account').then(m => ({ default: m.AccountStatusPage })))
const ResetPasswordPage = lazy(() => import('@/pages/Account').then(m => ({ default: m.ResetPasswordPage })))
const UpdatePasswordPage = lazy(() => import('@/pages/Account').then(m => ({ default: m.UpdatePasswordPage })))
const AdminPage = lazy(() => import('@/pages/Admin').then(m => ({ default: m.AdminPage })))
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })))
const Sync = lazy(() => import('@/pages/Sync').then(m => ({ default: m.Sync })))

const workspace = (page: ReactNode) => <Shell>{page}</Shell>
const ownerConsole = (page: ReactNode) => <AdminShell><Suspense fallback={<AdminRouteFallback />}>{page}</Suspense></AdminShell>
const publicRoutes = new Set(['/feedback', '/', '/about', '/how-it-works', '/login', '/signup', '/account', '/reset-password', '/update-password'])

function AdminRouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--ink-secondary)]" role="status" aria-live="polite">
      <span className="mr-2.5 h-2 w-2 rounded-full bg-[var(--owner)]" aria-hidden="true" /> Loading the owner console…
    </div>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--ink-secondary)]" role="status" aria-live="polite">
      <span className="mr-2.5 h-2 w-2 rounded-full bg-[var(--action-fill)]" aria-hidden="true" /> Loading…
    </div>
  )
}

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
      <UpdateNotice />
      {!isPublicRoute && <>
        <PointsToast />
        <GlobalSearch open={searchOpen} onClose={closeSearch} />
        <KeyboardShortcuts />
        {!location.pathname.startsWith('/admin') && <Suspense fallback={null}><GuidedTour /></Suspense>}
      </>}
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<PublicHome />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="login" element={<Suspense fallback={<RouteFallback />}><LoginPage /></Suspense>} />
          <Route path="signup" element={<Suspense fallback={<RouteFallback />}><SignupPage /></Suspense>} />
          <Route path="account" element={<Suspense fallback={<RouteFallback />}><AccountStatusPage /></Suspense>} />
          <Route path="reset-password" element={<Suspense fallback={<RouteFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="update-password" element={<Suspense fallback={<RouteFallback />}><UpdatePasswordPage /></Suspense>} />
        </Route>

        {/* The former dashboard remains available to guests at /app; / stays a public homepage. */}
        <Route path="/app" element={workspace(<Dashboard />)} />
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        {/* Owner controls live in their own chrome, separate from every learner surface. */}
        <Route path="/admin/feedback" element={ownerConsole(<AdminFeedback />)} />
        <Route path="/admin" element={ownerConsole(<AdminPage />)} />

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
        <Route path="/profile" element={workspace(<Suspense fallback={<RouteFallback />}><Profile /></Suspense>)} />
        <Route path="/sync" element={workspace(<Suspense fallback={<RouteFallback />}><Sync /></Suspense>)} />
        <Route path="/progress/sync" element={<Navigate to="/sync" replace />} />
        <Route path="/analytics" element={workspace(<Analytics />)} />
        <Route path="/progress" element={workspace(<Analytics />)} />
        <Route path="/achievements" element={workspace(<Achievements />)} />
        <Route path="/badges" element={workspace(<Achievements />)} />
        <Route path="/daily" element={workspace(<Daily />)} />
        <Route path="/streak" element={workspace(<Daily />)} />
        <Route path="/legacy/path" element={<Navigate to="/paths/wireless-pentesting" replace />} />
        <Route path="*" element={workspace(<NotFound />)} />
      </Routes>
    </>
  )
}

// A data router provides supported navigation blocking for unsaved drafts, including POP history.
const router = createBrowserRouter([{ path: '*', element: <ErrorBoundary><ApplicationRoutes /></ErrorBoundary> }], { basename: import.meta.env.BASE_URL })

function App() {
  return <RouterProvider router={router} />
}

export default App
