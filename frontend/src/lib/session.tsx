import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '@/lib/api'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import {
  allows,
  deriveUserState,
  type AccountRecord,
  type ApiState,
  type AuthAvailability,
  type Capability,
  type UserState,
} from '@/lib/access'

const SESSION_LOOKUP_TIMEOUT_MS = 1_500
const ACCOUNT_LOOKUP_TIMEOUT_MS = 6_000
const PUBLIC_CONFIG_TIMEOUT_MS = 4_000

type AccountErrorKind = 'none' | 'unverified' | 'unauthorized' | 'unavailable' | 'unknown'

export interface AccountError {
  kind: AccountErrorKind
  message: string
}

export interface PublicConfig {
  auth_configured: boolean
  signup_enabled: boolean
  email_verification_required?: boolean
  guest_learning_available?: boolean
}

interface SessionValue {
  /** `true` once the first, unavoidable session lookup has settled. */
  ready: boolean
  hasSession: boolean
  userState: UserState
  account: AccountRecord | null
  accountError: AccountError
  authAvailability: AuthAvailability
  apiState: ApiState
  publicConfig: PublicConfig | null
  can: (capability: Capability) => boolean
  refreshAccount: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<T>(resolve => {
      timer = setTimeout(() => resolve(fallback), ms)
    }),
  ]).finally(() => {
    // Always release the deadline, whichever side won the race.
    if (timer !== undefined) clearTimeout(timer)
  })
}

function readError(body: unknown, status: number): AccountError {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (detail && typeof detail === 'object') {
    const message = (detail as { message?: unknown }).message
    const code = (detail as { code?: unknown }).code
    if (code === 'email_not_verified') {
      return { kind: 'unverified', message: 'Verify your email address to continue with your account.' }
    }
    if (typeof message === 'string' && message) {
      return { kind: status === 401 ? 'unauthorized' : 'unknown', message }
    }
  }
  if (typeof detail === 'string' && detail) {
    return { kind: status === 401 ? 'unauthorized' : 'unknown', message: detail }
  }
  if (status === 401) return { kind: 'unauthorized', message: 'Your session has expired. Sign in again to use account features.' }
  if (status === 403) return { kind: 'unauthorized', message: 'This account cannot use that account-backed feature yet.' }
  if (status === 503) return { kind: 'unavailable', message: 'Account services are temporarily unavailable.' }
  return { kind: 'unknown', message: 'Account status could not be loaded right now.' }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [account, setAccount] = useState<AccountRecord | null>(null)
  const [accountError, setAccountError] = useState<AccountError>({ kind: 'none', message: '' })
  const [apiState, setApiState] = useState<ApiState>('unknown')
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)

  /** Public availability probe. Failure is expected and must never block the app. */
  const loadPublicConfig = useCallback(async () => {
    if (!supabaseConfigured) {
      setPublicConfig(null)
      setApiState('unreachable')
      return
    }
    try {
      const response = await withTimeout(apiFetch('/api/v1/public-config'), PUBLIC_CONFIG_TIMEOUT_MS, null)
      if (!response) {
        setApiState('unreachable')
        return
      }
      if (!response.ok) {
        response.body?.cancel().catch(() => {})
        setApiState(response.status >= 500 || response.status === 404 ? 'unreachable' : 'reachable')
        return
      }
      const body = (await response.json().catch(() => null)) as PublicConfig | null
      if (body && typeof body.auth_configured === 'boolean' && typeof body.signup_enabled === 'boolean') {
        setPublicConfig(body)
        setApiState('reachable')
      } else {
        setApiState('unreachable')
      }
    } catch {
      setApiState('unreachable')
    }
  }, [])

  /**
   * Read the caller's own account record. Guarded against overlapping runs so a burst of
   * `onAuthStateChange` events cannot fan out into repeated account requests.
   */
  const loadAccount = useCallback(async () => {
    if (inFlight.current) return inFlight.current
    const run = (async () => {
      if (!supabase) {
        setAccount(null)
        setAccountError({ kind: 'unavailable', message: 'Account services are not configured in this build.' })
        return
      }
      try {
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          SESSION_LOOKUP_TIMEOUT_MS,
          null as Awaited<ReturnType<typeof supabase.auth.getSession>> | null,
        )
        const session = sessionResult?.data?.session ?? null
        setHasSession(Boolean(session))
        if (!session) {
          setAccount(null)
          setAccountError({ kind: 'none', message: '' })
          return
        }
        const response = await withTimeout(apiFetch('/api/v1/account'), ACCOUNT_LOOKUP_TIMEOUT_MS, null)
        if (!response) {
          // Keep the session; the account panel shows a transient, non-blocking unavailable state.
          setAccountError({ kind: 'unavailable', message: 'Account services did not respond. Guest learning is unaffected.' })
          setApiState('unreachable')
          return
        }
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          setApiState('reachable')
          if (response.status === 401) setHasSession(false)
          setAccount(null)
          setAccountError(readError(body, response.status))
          return
        }
        const body = (await response.json().catch(() => null)) as AccountRecord | null
        if (!body || typeof body.account_status !== 'string' || typeof body.is_admin !== 'boolean') {
          setApiState('unreachable')
          setAccountError({ kind: 'unavailable', message: 'The account service returned an unexpected response.' })
          return
        }
        setApiState('reachable')
        setAccount(body)
        setAccountError({ kind: 'none', message: '' })
      } catch {
        // Identity lookup failure must degrade to guest, never to a broken screen.
        setHasSession(false)
        setAccount(null)
        setAccountError({ kind: 'unavailable', message: 'Account services are unavailable. Guest learning is unaffected.' })
      } finally {
        inFlight.current = null
      }
    })()
    inFlight.current = run
    return run
  }, [])

  useEffect(() => {
    let active = true
    void loadPublicConfig()
    void loadAccount().finally(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
    // Intentionally mount-only: the auth subscription below drives every later refresh.
  }, [loadAccount, loadPublicConfig])

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase replays the stored session as INITIAL_SESSION on subscribe. The mount effect above
      // already covers that, so only genuine transitions re-read the account. This keeps a normal
      // page load to a single /account request.
      if (_event === 'INITIAL_SESSION') return
      if (_event === 'SIGNED_OUT' || !session) {
        setHasSession(false)
        setAccount(null)
        setAccountError({ kind: 'none', message: '' })
        return
      }
      void loadAccount()
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [loadAccount])

  // Coming back online is the cheapest opportunity to retry a previously unreachable account API.
  useEffect(() => {
    if (apiState !== 'unreachable') return
    const retry = () => {
      void loadPublicConfig()
      if (hasSession) void loadAccount()
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [apiState, hasSession, loadAccount, loadPublicConfig])

  const signOut = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut()
    } catch {
      /* signing out locally is still the right outcome if the provider call fails */
    }
    setAccount(null)
    setHasSession(false)
    setAccountError({ kind: 'none', message: '' })
  }, [])

  const value = useMemo<SessionValue>(() => {
    const userState = deriveUserState({ hasSession, account })
    return {
      ready,
      hasSession,
      userState,
      account,
      accountError,
      authAvailability: supabaseConfigured ? 'ready' : 'unavailable',
      apiState,
      publicConfig,
      can: (capability: Capability) => allows(userState, capability),
      refreshAccount: loadAccount,
      signOut,
    }
  }, [ready, hasSession, account, accountError, apiState, publicConfig, loadAccount, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext)
  if (context) return context
  // A component rendered outside the provider (e.g. an isolated test harness) still gets a
  // coherent, guest-shaped value instead of a crash.
  return {
    ready: true,
    hasSession: false,
    userState: 'guest',
    account: null,
    accountError: { kind: 'none', message: '' },
    authAvailability: supabaseConfigured ? 'ready' : 'unavailable',
    apiState: 'unknown',
    publicConfig: null,
    can: capability => allows('guest', capability),
    refreshAccount: async () => {},
    signOut: async () => {},
  }
}
