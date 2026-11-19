/**
 * Safe, learner-facing auth error guidance.
 *
 * Supabase Auth errors can distinguish "unknown email" from "wrong password" in some
 * configurations. SecCraft deliberately collapses those cases so the UI never becomes an
 * account-enumeration oracle. Only non-sensitive states (unconfirmed email, rate limiting,
 * service availability) get specific guidance.
 */

interface AuthErrorLike {
  code?: unknown
  message?: unknown
  status?: unknown
}

function errorText(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const candidate = error as AuthErrorLike
  const parts = [candidate.code, candidate.message]
    .filter((part): part is string => typeof part === 'string')
    .map(part => part.toLowerCase())
  return parts.join(' ')
}

export function loginErrorMessage(error: unknown): string {
  const text = errorText(error)
  const status = !error || typeof error !== 'object' ? undefined : (error as AuthErrorLike).status

  if (text.includes('email_not_confirmed') || text.includes('email not confirmed')) {
    return 'Confirm your email address before signing in. If the verification message expired, open your account page and resend it.'
  }
  if (text.includes('over_request_rate_limit') || text.includes('rate limit') || status === 429) {
    return 'Too many sign-in attempts. Wait a little and try again; guest learning stays available in the meantime.'
  }
  if (text.includes('invalid api key') || text.includes('no api key') || text.includes('not configured')) {
    return 'Account services are not configured in this build. You can continue learning as a guest.'
  }
  if (text.includes('invalid_credentials') || text.includes('invalid login credentials') || text.includes('invalid email or password')) {
    return 'Sign-in did not complete. Check the email and password, or reset your password if you cannot sign in.'
  }
  if (text.includes('network') || text.includes('failed to fetch') || text.includes('load failed') || text.includes('timeout')) {
    return 'Account services are unavailable right now. Guest learning stays available; try signing in again when the connection returns.'
  }
  return 'Sign-in did not complete. That usually means the details are wrong, the email is not verified yet, or the account service is unavailable. Guest learning stays available in the meantime.'
}
