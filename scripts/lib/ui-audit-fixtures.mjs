// Shared offline fixtures for the browser QA scripts (see docs/ui-ux-phase5-validation.md).
//
// Lesson text is not part of the client bundle. It is delivered by the authenticated content API
// (backend/app/api/v1/content.py -> GET /api/v1/content/lessons/{module}/{lesson}), which requires an
// approved account. A guest, or a learner whose API is unreachable, correctly sees "Lesson Content
// Unavailable", so a script that asserts on real lesson text has to model an approved learner.
//
// `routeApprovedLearnerApi` does that without a backend or a login: it answers the lesson endpoint
// from the same markdown files the API reads, in the API's response shape, and leaves every other
// /api/ request offline (503) so the guest/offline fallbacks elsewhere in the UI stay under test.
// It grants nothing in the application; it only fulfils requests inside the test browser.
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const LESSONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/src/content/lessons')
// Same identifier rule the API applies (SAFE_ID_PATTERN in backend/app/api/v1/content.py).
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const LESSON_ENDPOINT = /\/api\/v1\/content\/lessons\/([^/?#]+)\/([^/?#]+)$/

const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** The API's lesson payload for a request path, or a 404 payload when the lesson does not exist. */
export function lessonApiResponse(pathname) {
  const match = LESSON_ENDPOINT.exec(pathname)
  if (!match) return json(404, { detail: 'Lesson not found.' })
  let moduleId, lessonId
  try {
    moduleId = decodeURIComponent(match[1])
    lessonId = decodeURIComponent(match[2])
  } catch {
    return json(404, { detail: 'Invalid module_id.' })
  }
  if (!SAFE_ID.test(moduleId) || !SAFE_ID.test(lessonId)) return json(404, { detail: 'Invalid identifier.' })
  const file = resolve(LESSONS_DIR, moduleId, `${lessonId}.md`)
  if (!file.startsWith(LESSONS_DIR + sep)) return json(404, { detail: 'Invalid identifier.' })
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    return json(404, { detail: 'Lesson not found.' })
  }
  // The API titles a lesson from its first level-one heading.
  const heading = content.split(/\r?\n/).find(line => line.startsWith('# '))
  const title = heading ? heading.slice(2).trim() : lessonId.replace(/-/g, ' ')
  return json(200, { module_id: moduleId, lesson_id: lessonId, title, content })
}

/**
 * Install the approved-learner content fixture on a Playwright browser context (or page).
 * Everything under /api/ is offline (503) except lesson delivery.
 */
export async function routeApprovedLearnerApi(context, { offlineBody = '{}' } = {}) {
  await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: offlineBody }))
  // Playwright gives the most recently registered matching route precedence, so this overrides the catch-all.
  await context.route('**/api/v1/content/lessons/*/*', route => route.fulfill(lessonApiResponse(new URL(route.request().url()).pathname)))
}
