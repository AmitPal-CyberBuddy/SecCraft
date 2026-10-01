import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import { dictionary as common, adjacencyGraphs } from '@zxcvbn-ts/language-common'
import { dictionary as english, translations } from '@zxcvbn-ts/language-en'

// Entirely local, with no breach lookup, telemetry, password storage or crack-time promise.
const estimator = new ZxcvbnFactory({ dictionary: { ...common, ...english }, graphs: adjacencyGraphs, translations })

const GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*_-+=?',
] as const
const ALL = GROUPS.join('')

export function passwordGuidance(password: string, personalWords: string[] = []) {
  const validLength = password.length >= 8 && password.length <= 128
  if (!password) return { strength: null, score: 0, validLength, feedback: 'Use a unique password or several unrelated words.' }
  // Bound analysis cost even when called outside a maxLength-limited input.
  const result = estimator.check(password.slice(0, 128), ['SecCraft', 'WiFiForge', 'correct horse battery staple', 'correcthorsebatterystaple', ...personalWords.slice(0, 20).filter(Boolean).map(word => word.slice(0, 128))])
  const score = validLength ? result.score : 0
  const strength = score === 4 ? 'Strong' : score >= 2 ? 'Moderate' : 'Weak'
  const feedback = password.length > 128 ? 'Use no more than 128 characters.'
    : password.length < 8 ? 'Use at least 8 characters; a longer password is usually better.'
    : result.feedback.warning || result.feedback.suggestions[0] || 'Looks difficult to guess. Use it only for this account.'
  return { strength, score, validLength, feedback }
}

// Rejection sampling avoids modulo bias, and the first four picks guarantee one
// character from each group. Never use Math.random or persist a generated secret.
function secureIndex(size: number): number {
  const limit = Math.floor(256 / size) * size
  const value = new Uint8Array(1)
  do { globalThis.crypto.getRandomValues(value) } while (value[0] >= limit)
  return value[0] % size
}

function generateCandidate(): string {
  const chars = GROUPS.map(group => group[secureIndex(group.length)])
  while (chars.length < 20) chars.push(ALL[secureIndex(ALL.length)])
  for (let index = chars.length - 1; index > 0; index--) {
    const other = secureIndex(index + 1)
    ;[chars[index], chars[other]] = [chars[other], chars[index]]
  }
  return chars.join('')
}

// Keep the suggestion and its feedback consistent, without weakening the estimator.
export function generatePassword(): string {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCandidate()
    if (passwordGuidance(candidate).strength === 'Strong') return candidate
  }
  throw new Error('Could not create a strong suggestion. Please try again.')
}
