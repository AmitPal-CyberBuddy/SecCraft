import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface User {
  id: string
  username: string
  email: string
  role: 'student' | 'instructor' | 'admin'
  team?: string
  xp: number
  level: number
}

interface AuthCtx {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isInstructor: boolean
  isAdmin: boolean
}

const Ctx = createContext<AuthCtx>({} as any)

const mockUsers: Record<string, { password: string; user: User }> = {
  'operator': { password: 'operator', user: { id: '1', username: 'operator', email: 'operator@wififorge.local', role: 'student', team: 'red-team-alpha', xp: 2450, level: 10 } },
  'alice': { password: 'alice', user: { id: '2', username: 'alice.wifi', email: 'alice@wififorge.local', role: 'instructor', team: 'instructors', xp: 3200, level: 12 } },
  'admin': { password: 'admin', user: { id: '3', username: 'admin', email: 'admin@wififorge.local', role: 'admin', team: 'admin', xp: 9999, level: 15 } },
}

function safeGet(k: string) { try { if (typeof localStorage === 'undefined') return null; return localStorage.getItem(k) } catch { return null } }
function safeSet(k: string, v: string) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v) } catch {} }
function safeRemove(k: string) { try { if (typeof localStorage !== 'undefined') localStorage.removeItem(k) } catch {} }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = safeGet('wififorge-auth')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.user) {
          setUser(parsed.user)
          setToken(parsed.token)
        }
      }
    } catch {}
  }, [])

  const login = async (username: string, password: string) => {
    await new Promise(r => setTimeout(r, 600))
    const key = username.toLowerCase().split('.')[0]
    const entry = mockUsers[key] || mockUsers[username.toLowerCase()]
    if (entry && entry.password === password) {
      const tok = `wififorge_jwt_${btoa(`${entry.user.id}:${Date.now()}`)}_${Math.random().toString(36).slice(2)}`
      setUser(entry.user)
      setToken(tok)
      safeSet('wififorge-auth', JSON.stringify({ user: entry.user, token: tok }))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    safeRemove('wififorge-auth')
  }

  return (
    <Ctx.Provider value={{
      user, token,
      login, logout,
      isAuthenticated: !!user,
      isInstructor: user?.role === 'instructor' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() { return useContext(Ctx) }
