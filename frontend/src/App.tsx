import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
