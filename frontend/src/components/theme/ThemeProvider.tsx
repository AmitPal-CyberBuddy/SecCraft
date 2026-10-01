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
    const media = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

    let transitionTimer: ReturnType<typeof setTimeout> | undefined
    const applyTheme = () => {
      const res: 'dark' | 'light' = theme === 'system'
        ? (media?.matches ? 'dark' : 'light')
        : theme
      if (typeof document !== 'undefined') {
        const root = document.documentElement
        const previous = root.getAttribute('data-theme')
        if (previous && previous !== res) {
          root.classList.add('theme-changing')
          clearTimeout(transitionTimer)
          transitionTimer = setTimeout(() => root.classList.remove('theme-changing'), 280)
        }
        root.classList.toggle('light', res === 'light')
        root.setAttribute('data-theme', res)
        root.style.colorScheme = res
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', res === 'light' ? '#f5f7fa' : '#0d141e')
      }
      setResolved(res)
    }

    applyTheme()
    if (theme === 'system' && media) media.addEventListener('change', applyTheme)
    safeSet('platform-theme', theme)
    return () => {
      clearTimeout(transitionTimer)
      if (theme === 'system' && media) media.removeEventListener('change', applyTheme)
    }
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }
