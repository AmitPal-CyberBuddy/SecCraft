import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import { dictionary as common, adjacencyGraphs } from '@zxcvbn-ts/language-common'
import { dictionary as english, translations } from '@zxcvbn-ts/language-en'
export { generatePassword } from './passwordGenerator'

// Entirely local, with no breach lookup, telemetry, password storage or crack-time promise.
const estimator = new ZxcvbnFactory({ dictionary: { ...common, ...english }, graphs: adjacencyGraphs, translations })

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
