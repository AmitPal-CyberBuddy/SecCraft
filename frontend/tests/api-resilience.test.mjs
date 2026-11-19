import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

test('guest content falls back for HTTP errors and bounded API timeouts', async (t) => {
  const testEnv = new Map([
    ['VITE_API_BASE', ''],
    ['VITE_SUPABASE_URL', 'https://auth-test.invalid'],
    ['VITE_SUPABASE_ANON_KEY', 'unit-test-public-anon-key'],
  ])
  const savedEnv = new Map([...testEnv.keys()].map(key => [key, process.env[key]]))
  for (const [key, value] of testEnv) process.env[key] = value

  const vite = await createServer({
    configFile: `${frontendRoot}/vite.config.ts`,
    root: frontendRoot,
    mode: 'test',
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  t.after(async () => {
    await vite.close()
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  const { apiFetch, fetchModules } = await vite.ssrLoadModule('/src/lib/api.ts')
  const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')
  assert.ok(supabase, 'test Auth client should be configured')
  const savedFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = savedFetch })

  let sessionLookups = 0
  supabase.auth.getSession = async () => {
    sessionLookups += 1
    return { data: { session: null }, error: null }
  }
  globalThis.fetch = async () => new Response('[]', { status: 200 })
  assert.deepEqual(await fetchModules(), [])
  assert.equal(sessionLookups, 0, 'public content must not wait for a Supabase session')

  for (const status of [401, 403, 500]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'simulated failure' }), {
      status,
      headers: { 'content-type': 'application/json' },
    })
    const modules = await fetchModules()
    assert.ok(modules.length > 0, `bundled guest content should survive HTTP ${status}`)
  }

  const savedSetTimeout = globalThis.setTimeout
  const requestedTimeouts = []
  globalThis.setTimeout = (callback, delay, ...args) => {
    requestedTimeouts.push(delay)
    return savedSetTimeout(callback, 0, ...args)
  }
  try {
    globalThis.fetch = (_input, init) => new Promise((_, reject) => {
      const rejectAborted = () => reject(new DOMException('request aborted', 'AbortError'))
      if (init.signal.aborted) rejectAborted()
      else init.signal.addEventListener('abort', rejectAborted, { once: true })
    })
    const modules = await fetchModules()
    assert.ok(modules.length > 0, 'bundled guest content should survive a connection timeout')
    assert.ok(requestedTimeouts.includes(8_000), 'API requests should have an 8-second deadline')

    globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
      start(controller) {
        const abort = () => controller.error(new DOMException('request body aborted', 'AbortError'))
        if (init.signal.aborted) abort()
        else init.signal.addEventListener('abort', abort, { once: true })
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
    const bodyTimeoutFallback = await fetchModules()
    assert.ok(bodyTimeoutFallback.length > 0, 'bundled guest content should survive a stalled response body')

    supabase.auth.getSession = () => {
      sessionLookups += 1
      return new Promise(() => {})
    }
    let forwardedAuthorization = 'not captured'
    globalThis.fetch = async (_input, init) => {
      forwardedAuthorization = new Headers(init.headers).get('authorization')
      return new Response('{}', { status: 200 })
    }
    const accountResponse = await apiFetch('/api/v1/account')
    assert.equal(accountResponse.status, 200)
    assert.equal(sessionLookups, 1)
    assert.ok(requestedTimeouts.includes(1_500), 'Supabase session lookup should have a 1.5-second deadline')
    assert.equal(forwardedAuthorization, null, 'a timed-out session lookup must not invent a bearer token')

    supabase.auth.getSession = async () => ({
      data: { session: { access_token: 'unit-test-access-token' } },
      error: null,
    })
    await apiFetch('/api/v1/account')
    assert.equal(forwardedAuthorization, 'Bearer unit-test-access-token')

    const { fetchLesson, fetchLessonContent } = await vite.ssrLoadModule('/src/lib/api.ts')
    let lessonAuthHeader = null
    globalThis.fetch = async (_input, init) => {
      lessonAuthHeader = new Headers(init.headers).get('authorization')
      return new Response(JSON.stringify({
        module_id: 'android-01-platform',
        lesson_id: '01-architecture',
        content: '# Android Architecture\n\nVerified lesson content.',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const lessonRes = await fetchLesson('android-01-platform', '01-architecture')
    assert.equal(lessonRes.ok, true)
    assert.equal(lessonRes.access, 'approved-content')
    assert.equal(lessonAuthHeader, 'Bearer unit-test-access-token', 'protected lesson endpoint must receive active bearer token')

    const lessonText = await fetchLessonContent('android-01-platform', '01-architecture')
    assert.ok(lessonText.includes('Verified lesson content.'))

    let sampleAuthHeader = 'not captured'
    let protectedSampleFallbacks = 0
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/api/v1/content/samples/lessons/')) {
        sampleAuthHeader = new Headers(init.headers).get('authorization')
        return new Response(JSON.stringify({
          module_id: 'android-01-platform',
          lesson_id: '01-architecture-sandbox-and-trust-boundaries',
          content: '# Public sample\n\nA bounded public lesson example.',
          access: 'public-sample',
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      protectedSampleFallbacks += 1
      return new Response('{}', { status: 401 })
    }
    const sample = await fetchLesson('android-01-platform', '01-architecture-sandbox-and-trust-boundaries')
    assert.equal(sample.ok, true)
    assert.equal(sample.access, 'public-sample')
    assert.match(sample.content, /bounded public lesson example/)
    assert.equal(sampleAuthHeader, null, 'the explicit public sample route must not wait for or send an account token')
    assert.equal(protectedSampleFallbacks, 0, 'a successfully loaded public sample must not be fetched again through the protected route')

    // 401 unauthenticated
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Authentication required' }), { status: 401 })
    const unauthText = await fetchLessonContent('android-01-platform', '01-architecture')
    assert.ok(unauthText.includes('Approved Account Needed'))
    assert.match(unauthText, /protected and requires an approved learner account/i)
    assert.match(unauthText, /public catalogue, supplied samples and bundled local labs remain available/i)
    assert.doesNotMatch(unauthText, /full lesson curriculum and technical walkthroughs/i)

    // 403 pending
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: { code: 'account_pending', message: 'Pending' } }), { status: 403 })
    const pendingText = await fetchLessonContent('android-01-platform', '01-architecture')
    assert.ok(pendingText.includes('Account Approval Pending'))
    assert.match(pendingText, /public samples and bundled local labs remain available/i)

    // Invalid content responses fail closed instead of rendering an empty or misidentified lesson.
    globalThis.fetch = async () => new Response(JSON.stringify({ module_id: 'other-module', lesson_id: '01-architecture', content: '' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
    const invalidLesson = await fetchLesson('android-01-platform', '01-architecture')
    assert.equal(invalidLesson.ok, false)
    assert.equal(invalidLesson.status, 502)
  } finally {
    globalThis.setTimeout = savedSetTimeout
  }
})
