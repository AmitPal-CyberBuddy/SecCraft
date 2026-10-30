const GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*_-+=?',
] as const
const ALL = GROUPS.join('')

// Rejection sampling avoids modulo bias and uses no Math.random or password persistence.
function secureIndex(size: number): number {
  const limit = Math.floor(256 / size) * size
  const value = new Uint8Array(1)
  do { globalThis.crypto.getRandomValues(value) } while (value[0] >= limit)
  return value[0] % size
}

/** Twenty CSPRNG-selected characters, with at least one character from every group. */
export function generatePassword(): string {
  const chars = GROUPS.map(group => group[secureIndex(group.length)])
  while (chars.length < 20) chars.push(ALL[secureIndex(ALL.length)])
  for (let index = chars.length - 1; index > 0; index--) {
    const other = secureIndex(index + 1)
    ;[chars[index], chars[other]] = [chars[other], chars[index]]
  }
  return chars.join('')
}
