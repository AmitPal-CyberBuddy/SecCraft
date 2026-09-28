import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/production.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AuthProvider } from '@/components/auth/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>,
)
