import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeCtx {
  theme: Theme
  resolved: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', resolved: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('wififorge-theme') as Theme | null
    return saved || 'dark'
  })
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const res = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme
    setResolved(res)
    document.documentElement.classList.toggle('light', res === 'light')
    document.documentElement.setAttribute('data-theme', res)
    localStorage.setItem('wififorge-theme', theme)
    // Update theme-color meta
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', res === 'light' ? '#f8fafc' : '#020617')
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
