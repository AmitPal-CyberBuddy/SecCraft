// Signup guidance only. The API enforces 8–128 characters; the identity provider
// may enforce additional project-side rules. Neither a meter nor this helper is an
// authentication or password-security guarantee.
const GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*_-+=?',
] as const
const ALL = GROUPS.join('')

export function passwordGuidance(password: string) {
  const checks = [
    { label: '8–128 characters', met: password.length >= 8 && password.length <= 128 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Symbol', met: /[^A-Za-z0-9\s]/.test(password) },
  ]
  const variety = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9\s]/].filter(pattern => pattern.test(password)).length
  const repeated = /(.)\1{3,}/.test(password)
  const strength = !password ? null
    : password.length >= 16 && variety === 4 && !repeated ? 'Strong'
      : password.length >= 10 && variety >= 3 && !repeated ? 'Moderate'
        : 'Weak'
  return { checks, strength }
}

// Rejection sampling avoids modulo bias, and the first four picks guarantee one
// character from each group. Never use Math.random or persist a generated secret.
function secureIndex(size: number): number {
  const limit = Math.floor(256 / size) * size
  const value = new Uint8Array(1)
  do { globalThis.crypto.getRandomValues(value) } while (value[0] >= limit)
  return value[0] % size
}

export function generatePassword(): string {
  const chars = GROUPS.map(group => group[secureIndex(group.length)])
  while (chars.length < 20) chars.push(ALL[secureIndex(ALL.length)])
  for (let index = chars.length - 1; index > 0; index--) {
    const other = secureIndex(index + 1)
    ;[chars[index], chars[other]] = [chars[other], chars[index]]
  }
  return chars.join('')
}
