import { currentLessonId } from '@/content/legacy-module-map'

export type ModuleView = 'overview' | 'theory' | 'lab' | 'quiz' | 'report'

export function moduleLink(moduleId: string, view: ModuleView = 'overview', itemId?: string, pathId?: string) {
  const base = pathId ? `/paths/${encodeURIComponent(pathId)}/modules/${encodeURIComponent(moduleId)}` : `/modules/${encodeURIComponent(moduleId)}`
  const query = new URLSearchParams()
  if (view !== 'overview') query.set('tab', view)
  if (itemId && view === 'theory') query.set('lesson', itemId)
  if (itemId && view === 'lab') query.set('lab', itemId)
  return `${base}${query.size ? `?${query}` : ''}`
}

/** Resolve only supplied curriculum items. URL state never grants access or records progress. */
export function resolveModuleView(query: URLSearchParams, lessons: readonly string[], labs: readonly string[], hasQuiz: boolean, allowReport: boolean, moduleId?: string) {
  const requested = query.get('tab')
  const valid: ModuleView[] = ['overview', 'theory', 'lab', ...(hasQuiz ? ['quiz' as const] : []), ...(allowReport ? ['report' as const] : [])]
  const tab: ModuleView = valid.includes(requested as ModuleView) ? requested as ModuleView : 'overview'
  const lesson = Math.max(0, lessons.indexOf(currentLessonId(query.get('lesson') || '', moduleId)))
  const lab = labs.includes(query.get('lab') || '') ? query.get('lab')! : null
  return { tab, lesson, lab }
}

/** Clone before changing params; preserve unrelated path and view state. */
export function updateQuery(query: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(query)
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}
