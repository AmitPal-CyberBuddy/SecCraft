import modules from './modules.json'
import paths from './learning-paths.json'

/** Human sequence number; stable IDs deliberately keep their original numbers for saved records and links. */
export function moduleOrdinal(id: string): string {
  const path = paths.find(entry => (entry.modules as string[]).includes(id))
  const index = path ? (path.modules as string[]).indexOf(id) : modules.findIndex(module => module.id === id)
  return index < 0 ? id.split('-')[0] : String(index + 1).padStart(2, '0')
}
