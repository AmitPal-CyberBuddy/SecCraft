import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeCtx {
  theme: Theme
  resolved: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', resolved: 'dark', setTheme: () => {} })

function safeGet(k: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    // Platform-first, legacy fallback
    return localStorage.getItem(k) || localStorage.getItem(k.replace('platform-', 'wififorge-'))
  } catch { return null }
}
function safeSet(k: string, v: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(k, v)
      const legacy = k.replace('platform-', 'wififorge-')
      if (legacy !== k) {
        try { localStorage.setItem(legacy, v) } catch {}
      }
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = safeGet('platform-theme') as Theme | null
      return saved || 'dark'
    } catch { return 'dark' }
  })
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      const sysDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
      const res = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme
      setResolved(res)
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('light', res === 'light')
        document.documentElement.setAttribute('data-theme', res)
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', res === 'light' ? '#f8fafc' : '#020617')
      }
      safeSet('platform-theme', theme)
    } catch {}
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
