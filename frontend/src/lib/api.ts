import { supabase } from '@/lib/supabase'

const configuredBase = import.meta.env.VITE_API_BASE?.trim().replace(/\/+$/, '') || ''
const SESSION_LOOKUP_TIMEOUT_MS = 1_500
const API_REQUEST_TIMEOUT_MS = 8_000

/** API host only, for example https://api.example.com. Leave unset to use the same-origin /api proxy. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return configuredBase ? `${configuredBase}${normalizedPath}` : normalizedPath
}

function requiresAccountToken(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]
  return pathname === '/api/v1/feedback'
    || pathname === '/api/v1/account'
    || pathname === '/api/v1/progress'
    || pathname.startsWith('/api/v1/progress/')
    || pathname === '/api/v1/attempts'
    || pathname.startsWith('/api/v1/attempts/')
    || pathname === '/api/v1/admin'
    || pathname.startsWith('/api/v1/admin/')
    || pathname.startsWith('/api/v1/content/lessons/')
    || pathname.startsWith('/api/v1/content/quizzes/')
    || pathname.startsWith('/api/v1/content/labs/')
    || pathname.startsWith('/api/v1/content/artifacts/')
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const headers = new Headers(init.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')

  // Public catalogue and content requests do not need an Auth session. This also keeps the guest
  // experience from waiting on Supabase token refresh when only static content is being loaded.
  if (supabase && requiresAccountToken(normalizedPath) && !headers.has('authorization')) {
    let sessionTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const token = await Promise.race([
        supabase.auth.getSession().then(({ data }) => data.session?.access_token),
        new Promise<undefined>(resolve => { sessionTimer = setTimeout(() => resolve(undefined), SESSION_LOOKUP_TIMEOUT_MS) }),
      ])
      if (token) headers.set('authorization', `Bearer ${token}`)
    } catch {
      // Guest/offline operation remains available; protected API calls will fail closed server-side.
    } finally {
      if (sessionTimer !== undefined) clearTimeout(sessionTimer)
    }
  }

  const controller = new AbortController()
  const callerSignal = init.signal
  const abortFromCaller = () => controller.abort(callerSignal?.reason)
  if (callerSignal?.aborted) abortFromCaller()
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
  let cleanedUp = false
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    clearTimeout(timeoutTimer)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }
  const timeoutTimer = setTimeout(() => {
    controller.abort()
    cleanup()
  }, API_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(apiUrl(normalizedPath), { ...init, headers, signal: controller.signal })
    // fetch() resolves when headers arrive, not when the body is read. Keep the deadline active
    // through JSON/text parsing so a stalled backend body cannot hang the guest UI indefinitely.
    if (response.body) {
      const cancelBody = response.body.cancel.bind(response.body)
      Object.defineProperty(response.body, 'cancel', {
        configurable: true,
        value: (reason?: unknown) => Promise.resolve(cancelBody(reason)).finally(cleanup),
      })
    }
    for (const method of ['arrayBuffer', 'blob', 'formData', 'json', 'text'] as const) {
      const readBody = response[method].bind(response)
      Object.defineProperty(response, method, {
        configurable: true,
        value: (...args: Parameters<typeof readBody>) => Promise.resolve(readBody(...args)).finally(cleanup),
      })
    }
    if (!response.body || response.bodyUsed) cleanup()
    return response
  } catch (error) {
    cleanup()
    throw error
  }
}

export async function discardResponseBody(response: Response): Promise<void> {
  try { await response.body?.cancel() } catch { /* the response body may already be consumed or locked */ }
}

export interface ModuleLesson {
  id: string
  title: string
  kind: string
}

export interface Module {
  id: string
  learningPathId?: string
  title: string
  phase: number
  phaseName?: string
  difficulty: string
  estimated_hours: number
  prerequisites: string[]
  /** Legacy convenience flag derived from lab_requirement. */
  status: "simulated" | "hardware" | "locked"
  /** SIMULATION | HYBRID | RF_REQUIRED | REAL — see docs/SIMULATION_VS_HARDWARE.md */
  lab_requirement?: string
  lab_requirement_generic?: string
  content_status?: string
  skills: string[]
  description?: string
  objectives?: string[]
  artifacts?: string[]
  decision_practice?: string[]
  evidence_focus?: string
  retest_focus?: string
  lessons?: ModuleLesson[]
  labs?: string[]
  progress?: number
}

export interface LearningPath {
  id: string
  title: string
  shortTitle: string
  description: string
  longDescription: string
  category: string
  icon: string
  color: string
  difficulty: string
  estimatedHours: number
  prerequisites: string[]
  status: 'available' | 'coming-soon' | 'planned'
  featured: boolean
  modules: string[]
  skills: string[]
  labs: number
  challenges: number
  certificate: boolean
  tagline?: string
  legacyBrand?: string
}

export async function fetchModules(pathId?: string): Promise<Module[]> {
  try {
    const url = pathId ? `/api/modules?path=${encodeURIComponent(pathId)}` : '/api/modules'
    const res = await apiFetch(url)
    if (!res.ok) {
      await discardResponseBody(res)
      throw new Error("API not available")
    }
    return await res.json()
  } catch {
    const modules = await import("../content/modules.json")
    const list = modules.default as Module[]
    if (pathId) return list.filter(m => (m as any).learningPathId === pathId)
    return list
  }
}

export async function fetchModule(id: string): Promise<Module | null> {
  try {
    const res = await apiFetch(`/api/modules/${encodeURIComponent(id)}`)
    if (!res.ok) {
      await discardResponseBody(res)
      throw new Error("not found")
    }
    return await res.json()
  } catch {
    const modules = await import("../content/modules.json")
    const list = modules.default as Module[]
    return list.find(m => m.id === id) || null
  }
}

export async function fetchLearningPaths(): Promise<LearningPath[]> {
  try {
    const res = await apiFetch('/api/learning-paths')
    if (!res.ok) {
      await discardResponseBody(res)
      throw new Error("API not available")
    }
    return await res.json()
  } catch {
    const paths = await import("../content/learning-paths.json")
    return paths.default as LearningPath[]
  }
}

export async function fetchLearningPath(id: string): Promise<LearningPath | null> {
  try {
    const res = await apiFetch(`/api/learning-paths/${encodeURIComponent(id)}`)
    if (!res.ok) {
      await discardResponseBody(res)
      throw new Error("not found")
    }
    return await res.json()
  } catch {
    const paths = await import("../content/learning-paths.json")
    const list = paths.default as LearningPath[]
    return list.find(p => p.id === id) || null
  }
}

export interface LessonContentResult {
  ok: boolean
  moduleId: string
  lessonId: string
  title: string
  content: string
  status?: number
  code?: string
  message?: string
}

export async function fetchLesson(moduleId: string, lessonId: string): Promise<LessonContentResult> {
  try {
    const res = await apiFetch(`/api/v1/content/lessons/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}`)
    if (res.ok) {
      const data = await res.json()
      return {
        ok: true,
        moduleId: data.module_id || moduleId,
        lessonId: data.lesson_id || lessonId,
        title: data.title || lessonId,
        content: data.content || '',
        status: res.status,
      }
    }
    let code: string | undefined
    let message: string | undefined
    try {
      const err = await res.json()
      if (err?.detail?.code) code = err.detail.code
      if (err?.detail?.message) message = err.detail.message
      else if (typeof err?.detail === 'string') message = err.detail
    } catch {
      await discardResponseBody(res)
    }
    return {
      ok: false,
      moduleId,
      lessonId,
      title: lessonId,
      content: '',
      status: res.status,
      code,
      message,
    }
  } catch (err) {
    return {
      ok: false,
      moduleId,
      lessonId,
      title: lessonId,
      content: '',
      status: 0,
      message: err instanceof Error ? err.message : 'Network failure',
    }
  }
}

export async function fetchLessonContent(moduleId: string, lessonId: string): Promise<string> {
  const result = await fetchLesson(moduleId, lessonId)
  if (result.ok) {
    return result.content
  }
  if (result.status === 401) {
    return `# Account Required\n\nFull lesson curriculum and technical walkthroughs require an approved learner account.\n\nPlease [sign in or register](/account) to access lesson materials and retain your progress.`
  }
  if (result.status === 403) {
    if (result.code === 'account_pending') {
      return `# Account Approval Pending\n\nYour SecCraft account has been registered and is currently awaiting administrator review.\n\nOnce approved, you will have immediate access to all technical walkthroughs, scenario challenges, and lab fixtures. You can check your account status anytime in [Account Settings](/account).`
    }
    if (result.code === 'account_rejected') {
      return `# Account Not Approved\n\nYour account registration was not approved for platform access.\n\nPlease review your status in [Account Settings](/account) or contact platform administration via the feedback form.`
    }
    if (result.code === 'account_suspended') {
      return `# Account Suspended\n\nThis account is currently suspended from accessing platform learning materials.\n\nPlease check [Account Settings](/account) for details.`
    }
    return `# Access Restricted\n\n${result.message || 'Approved account privileges are required to view this lesson.'}`
  }
  if (result.status === 404) {
    return `# Lesson Not Found\n\nThe requested lesson \`${lessonId}\` could not be located in module \`${moduleId}\`. Please select another lesson from the curriculum outline.`
  }
  return `# Lesson Content Unavailable\n\nUnable to load lesson content (${result.message || 'API connection failed'}). If you are practicing offline, ensure the local API server is active.`
}

export async function fetchModuleQuiz(moduleId: string): Promise<any | null> {
  try {
    const res = await apiFetch(`/api/v1/content/quizzes/${encodeURIComponent(moduleId)}`)
    if (res.ok) {
      return await res.json()
    }
    await discardResponseBody(res)
  } catch {}
  return null
}

export async function fetchLabDetails(labId: string): Promise<any | null> {
  try {
    const res = await apiFetch(`/api/v1/content/labs/${encodeURIComponent(labId)}`)
    if (res.ok) {
      return await res.json()
    }
    await discardResponseBody(res)
  } catch {}
  return null
}

export async function fetchPlatform() {
  try {
    const res = await apiFetch('/api/platform')
    if (res.ok) return await res.json()
    await discardResponseBody(res)
  } catch {}
  const plat = await import("../content/platform.json")
  return plat.default
}
