import { createClient } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

// The anon key is designed to be public. Never place a service-role key or database credential here.
export const supabase = projectUrl && anonKey
  ? createClient(projectUrl, anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

export const supabaseConfigured = Boolean(supabase)

export function accountRedirect(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = new URL(base, window.location.origin)
  return new URL(path.replace(/^\//, ''), root).toString()
}
