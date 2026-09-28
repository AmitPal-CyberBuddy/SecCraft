import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { PointsToast } from '@/components/gamification/PointsToast'
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

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PointsToast />
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
    </BrowserRouter>
  )
}

export default App
