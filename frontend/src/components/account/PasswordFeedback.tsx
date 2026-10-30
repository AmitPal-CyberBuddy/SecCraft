import type { passwordGuidance } from '@/lib/passwordGuidance'

export function PasswordFeedback({ guidance, checking = false, unavailable = false }: {
  guidance: ReturnType<typeof passwordGuidance>; checking?: boolean; unavailable?: boolean
}) {
  const filled = checking || unavailable ? 0 : guidance.strength === 'Strong' ? 3 : guidance.strength === 'Moderate' ? 2 : guidance.strength ? 1 : 0
  const strength = checking ? 'checking' : unavailable ? 'unavailable' : guidance.strength || 'empty'
  const label = checking ? 'Checking…' : unavailable ? 'Unavailable' : guidance.strength ?? 'Not entered'
  const feedback = checking ? 'Loading the local strength estimate…'
    : unavailable ? 'The local strength estimate is unavailable. Use a unique password and your password manager.'
      : guidance.feedback
  return <div className="sc-password-feedback" data-strength={strength}>
    <p role="status" aria-live="polite" aria-atomic="true">Password strength: <strong>{label}</strong></p>
    <div className="sc-password-meter" aria-hidden="true">{[1, 2, 3].map(step => <span key={step} data-filled={step <= filled} />)}</div>
    <p>{feedback}</p>
    <p className="sc-password-policy">8–128 characters. Strength is an estimate, not a breach check.</p>
  </div>
}
