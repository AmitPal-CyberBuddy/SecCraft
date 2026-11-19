import { supabase } from '@/lib/supabase'

const configuredBase = import.meta.env.VITE_API_BASE?.trim().replace(/\/+$/, '') || ''
const SESSION_LOOKUP_TIMEOUT_MS = 1_500
const API_REQUEST_TIMEOUT_MS = 8_000

// Keep the browser's sample entry points aligned with the API's explicit public allowlist.
// Everything else uses the approved-account lesson endpoint; no lesson markdown is bundled here.
const PUBLIC_SAMPLE_LESSONS = new Set([
  '01-intro-wireless/02-scope-and-assessment-decisions',
  'android-01-platform/01-architecture-sandbox-and-trust-boundaries',
])

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
  access?: 'public-sample' | 'approved-content'
}

function parseLessonResponse(data: any, moduleId: string, lessonId: string, status: number, access: LessonContentResult['access']): LessonContentResult {
  if (data?.module_id !== moduleId || data?.lesson_id !== lessonId || typeof data?.content !== 'string' || !data.content.trim()) {
    return {
      ok: false,
      moduleId,
      lessonId,
      title: lessonId,
      content: '',
      status: 502,
      message: 'The content service returned an incomplete lesson response.',
    }
  }
  return {
    ok: true,
    moduleId,
    lessonId,
    title: typeof data.title === 'string' && data.title ? data.title : lessonId,
    content: data.content,
    status,
    access,
  }
}

async function fetchPublicSampleLesson(moduleId: string, lessonId: string): Promise<LessonContentResult | null> {
  if (!PUBLIC_SAMPLE_LESSONS.has(`${moduleId}/${lessonId}`)) return null
  try {
    const res = await apiFetch(`/api/v1/content/samples/lessons/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}`)
    if (res.ok) {
      const data = await res.json()
      if (data?.access !== 'public-sample') {
        return { ok: false, moduleId, lessonId, title: lessonId, content: '', status: 502, message: 'The content service returned an invalid public-sample response.' }
      }
      return parseLessonResponse(data, moduleId, lessonId, res.status, 'public-sample')
    }
    // A missing allowlisted sample may have been removed in a newer release. An approved learner
    // may still receive it from the protected release route below; other failures should be shown
    // as service errors rather than misreported as an account restriction.
    if (res.status !== 404) {
      const result = await readLessonError(res, moduleId, lessonId)
      return result
    }
    await discardResponseBody(res)
    return null
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

async function readLessonError(res: Response, moduleId: string, lessonId: string): Promise<LessonContentResult> {
  let code: string | undefined
  let message: string | undefined
  try {
    const err = await res.json()
    if (typeof err?.detail?.code === 'string') code = err.detail.code
    if (typeof err?.detail?.message === 'string') message = err.detail.message
    else if (typeof err?.detail === 'string') message = err.detail
  } catch {
    await discardResponseBody(res)
  }
  return { ok: false, moduleId, lessonId, title: lessonId, content: '', status: res.status, code, message }
}

export async function fetchLesson(moduleId: string, lessonId: string): Promise<LessonContentResult> {
  const sample = await fetchPublicSampleLesson(moduleId, lessonId)
  if (sample) return sample
  try {
    const res = await apiFetch(`/api/v1/content/lessons/${encodeURIComponent(moduleId)}/${encodeURIComponent(lessonId)}`)
    if (res.ok) {
      const data = await res.json()
      return parseLessonResponse(data, moduleId, lessonId, res.status, 'approved-content')
    }
    return await readLessonError(res, moduleId, lessonId)
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
    return `# Approved Account Needed\n\nThis lesson text is protected and requires an approved learner account. It is not one of SecCraft's selected public sample lessons. The public catalogue, supplied samples and bundled local labs remain available.\n\n[Request or check account access](/account).`
  }
  if (result.status === 403) {
    if (result.code === 'email_not_verified') {
      return `# Verify Your Email\n\nVerify the email address on your account before requesting protected lesson text. The public catalogue, supplied samples and bundled local labs remain available.\n\n[Check account settings](/account).`
    }
    if (result.code === 'account_pending') {
      return `# Account Approval Pending\n\nYour account is awaiting owner review. Approval unlocks protected lesson text and knowledge-check prompts; public samples and bundled local labs remain available.\n\n[Check account settings](/account).`
    }
    if (result.code === 'account_rejected') {
      return `# Account Not Approved\n\nProtected lesson text is unavailable for this account. The public catalogue, supplied samples and bundled local labs remain available.\n\n[Review account status](/account) or contact the platform owner through the feedback form.`
    }
    if (result.code === 'account_suspended') {
      return `# Account Suspended\n\nProtected lesson text and account-backed records are unavailable for this account. The public catalogue, supplied samples and bundled local labs remain available.\n\n[Check account settings](/account).`
    }
    return `# Access Restricted\n\n${result.message || 'An approved account is required for this protected lesson text.'} Public samples and bundled local labs remain available.`
  }
  if (result.status === 404) {
    return `# Lesson Not Found\n\nThe requested lesson \`${lessonId}\` could not be located in module \`${moduleId}\`. Select another lesson from the public outline or contact the platform owner if this link should work.`
  }
  return `# Lesson Content Unavailable\n\nThe learner service could not provide this lesson text. Check the connection and retry. Public samples and bundled local labs remain available.`
}

export interface ModuleQuizGradeResult {
  module_id: string
  score: number
  total: number
  passed: boolean
  grading_class: 'practice'
  results: Array<{
    id: string
    selected_index: number
    correct_index: number
    correct: boolean
    explanation: string
  }>
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

/** Submit learner-visible option indices for server-side practice grading; answer keys never ship with the prompt. */
export async function gradeModuleQuiz(moduleId: string, answers: Record<string, number>): Promise<ModuleQuizGradeResult | null> {
  try {
    const res = await apiFetch(`/api/v1/content/quizzes/${encodeURIComponent(moduleId)}/grade`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    if (res.ok) return await res.json() as ModuleQuizGradeResult
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
