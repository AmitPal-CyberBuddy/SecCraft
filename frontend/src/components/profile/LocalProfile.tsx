import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Local profile — **no authentication**.
 *
 * The hosted build is a static, local-first academy: there is no server, so there is nothing to
 * authenticate against and this app deliberately does not pretend otherwise (no fake login, no
 * placeholder JWT, no implied account security). This provider only stores a display name and a
 * self-declared role in the browser so labels like "instructor view" can be shown.
 *
 * If you run the optional FastAPI backend (see backend/ and docker-compose), real JWT authentication
 * for classroom use is available there — the static build never claims it.
 *
 * Storage: platform-profile with wififorge-profile fallback (Stage 6 compatibility)
 */

export type ProfileRole = 'learner' | 'instructor'

export interface LocalProfile {
  displayName: string
  role: ProfileRole
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
    const role: ProfileRole = parsed.role === 'instructor' ? 'instructor' : 'learner'
    return { displayName: parsed.displayName.slice(0, 64), role }
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
      const clean: LocalProfile = {
        displayName: next.displayName.trim().slice(0, 64),
        role: next.role === 'instructor' ? 'instructor' : 'learner',
      }
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
