import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/** A guest-only display name. It is never an account identity or authorization role. */
export interface LocalProfile {
  displayName: string
}

interface Ctx {
  profile: LocalProfile | null
  /** True when a display name has been set locally. Not an authentication state. */
  hasProfile: boolean
  save: (profile: LocalProfile) => void
  clear: () => void
}

const KEY = 'platform-profile'
const LEGACY_KEY = 'wififorge-profile'
const Ctx = createContext<Ctx>({} as Ctx)

function read(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalProfile>
    if (!parsed || typeof parsed.displayName !== 'string' || !parsed.displayName.trim()) return null
    // Any legacy self-declared role is deliberately discarded during read/migration.
    return { displayName: parsed.displayName.trim().slice(0, 64) }
  } catch {
    return null
  }
}

export function LocalProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null)

  useEffect(() => {
    setProfile(read())
  }, [])

  const value = useMemo<Ctx>(() => ({
    profile,
    hasProfile: profile !== null,
    save: next => {
      const clean: LocalProfile = { displayName: next.displayName.trim().slice(0, 64) }
      setProfile(clean)
      try {
        localStorage.setItem(KEY, JSON.stringify(clean))
        localStorage.setItem(LEGACY_KEY, JSON.stringify(clean))
      } catch { /* storage unavailable */ }
    },
    clear: () => {
      setProfile(null)
      try {
        localStorage.removeItem(KEY)
        localStorage.removeItem(LEGACY_KEY)
      } catch { /* storage unavailable */ }
    },
  }), [profile])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLocalProfile(): Ctx {
  return useContext(Ctx)
}
