import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useSession } from '@/lib/session'
import { allows } from '@/lib/access'

/**
 * The account-side view of progress.
 *
 * This is a *read* of `GET /api/v1/progress`. It is intentionally separate from the local Zustand
 * store: the two are never merged, and neither is presented as the other. The server response is
 * used to show what the platform actually holds, including the honest split between verified rows
 * and rows that arrived as an unverified import.
 */

export interface ServerProgressRecord {
  path_id: string
  module_id: string
  activity_type: string
  activity_id: string
  content_version: string
  state: string
  source: string
  verified: boolean
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}

export interface ServerProgress {
  records: ServerProgressRecord[]
  verified: number
  imported: number
  completed: number
  xp: number
  xpVerified: boolean
  achievements: { id: string; verified: boolean; awardedAt: string | null }[]
  checkedAt: string
}

/** Match the GET /api/v1/progress achievement response (`id`, not `achievement_id`). */
export function mapServerAchievements(rows: unknown): ServerProgress['achievements'] {
  if (!Array.isArray(rows)) return []
  return (rows as Array<{ id: string; verified: boolean; awarded_at: string | null }>).map(row => ({
    id: String(row.id),
    verified: row.verified === true,
    awardedAt: row.awarded_at ?? null,
  }))
}

export type ServerProgressState = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'

export interface ServerProgressResult {
  state: ServerProgressState
  data: ServerProgress | null
  message: string
  reload: () => Promise<void>
}

function messageFor(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (detail && typeof detail === 'object') {
    const code = (detail as { code?: unknown }).code
    const message = (detail as { message?: unknown }).message
    if (code === 'email_not_verified') return 'Verify your email address before using account progress.'
    if (typeof message === 'string' && message) return message
  }
  if (typeof detail === 'string' && detail) return detail
  if (status === 401) return 'Your session expired. Sign in again to read account progress.'
  if (status === 403) return 'This account cannot use account-backed progress yet.'
  if (status === 503) return 'Account services are temporarily unavailable.'
  return 'Account progress could not be loaded.'
}

/**
 * Reads the account progress snapshot. It deliberately does **not** write anything into the local
 * store: importing is an explicit, user-initiated action handled by the sync screen.
 */
export function useServerProgress(): ServerProgressResult {
  const { userState, ready } = useSession()
  const allowed = allows(userState, 'account-progress')
  const [state, setState] = useState<ServerProgressState>('idle')
  const [data, setData] = useState<ServerProgress | null>(null)
  const [message, setMessage] = useState('')
  const requestRef = useRef(0)

  const reload = useCallback(async () => {
    if (!ready) return
    if (!allowed) {
      setState('denied')
      setData(null)
      setMessage('')
      return
    }
    const requestId = ++requestRef.current
    setState('loading')
    setMessage('')
    try {
      const response = await apiFetch('/api/v1/progress')
      const body = await response.json().catch(() => null)
      if (requestRef.current !== requestId) return
      if (!response.ok) {
        setState(response.status === 503 ? 'unavailable' : 'denied')
        setData(null)
        setMessage(messageFor(response.status, body))
        return
      }
      const records = Array.isArray((body as { records?: unknown })?.records) ? ((body as { records: ServerProgressRecord[] }).records) : []
      const verified = records.filter(record => record?.verified === true).length
      const completed = records.filter(record => record?.state === 'completed').length
      setData({
        records,
        verified,
        imported: records.length - verified,
        completed,
        xp: Number((body as { xp?: { total?: unknown } })?.xp?.total) || 0,
        xpVerified: (body as { xp?: { verified?: unknown } })?.xp?.verified === true,
        achievements: mapServerAchievements((body as { achievements?: unknown })?.achievements),
        checkedAt: new Date().toLocaleTimeString(),
      })
      setState('ready')
    } catch {
      if (requestRef.current !== requestId) return
      setState('unavailable')
      setData(null)
      setMessage('Account progress could not be loaded. Local learning and local progress are unaffected.')
    }
  }, [allowed, ready])

  useEffect(() => {
    void reload()
  }, [reload])

  return useMemo(() => ({ state, data, message, reload }), [state, data, message, reload])
}

