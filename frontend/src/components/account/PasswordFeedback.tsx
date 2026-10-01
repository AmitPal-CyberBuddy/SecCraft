import type { passwordGuidance } from '@/lib/passwordGuidance'

export function PasswordFeedback({ guidance }: { guidance: ReturnType<typeof passwordGuidance> }) {
  const filled = guidance.strength === 'Strong' ? 3 : guidance.strength === 'Moderate' ? 2 : guidance.strength ? 1 : 0
  return <div className="sc-password-feedback" data-strength={guidance.strength || 'empty'}>
    <p role="status" aria-live="polite" aria-atomic="true">Password strength: <strong>{guidance.strength ?? 'Not entered'}</strong></p>
    <div className="sc-password-meter" aria-hidden="true">{[1, 2, 3].map(step => <span key={step} data-filled={step <= filled} />)}</div>
    <p>{guidance.feedback}</p>
    <p className="sc-password-policy">8–128 characters. Strength is an estimate, not a breach check.</p>
  </div>
}
