import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('learning links, URL state and curriculum selection survive navigation', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const saved = new Map()
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'Event', 'MouseEvent', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] })
  }
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  window.scrollTo = () => {}
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.HTMLElement.prototype.scrollTo = () => {}
  const oldFetch = globalThis.fetch
  let quizMode = 'offline'
  let submittedQuiz
  let sampleLessonRequests = 0
  const sampleLessonAuthorization = []
  let protectedLessonRequests = 0
  const sampleLessonId = '01-architecture-sandbox-and-trust-boundaries'
  const testQuizQuestions = Array.from({ length: 6 }, (_, index) => ({
    id: `test-q${index + 1}`,
    question: `Authenticated practice prompt ${index + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_index: 2,
  }))
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url)
    if (path.includes('/api/v1/content/samples/lessons/')) {
      sampleLessonRequests += 1
      sampleLessonAuthorization.push(new Headers(init.headers).get('authorization'))
      if (path.endsWith(`android-01-platform/${sampleLessonId}`)) {
        return new Response(JSON.stringify({
          module_id: 'android-01-platform', lesson_id: sampleLessonId,
          content: '# Public architecture sample\n\nA public sample lesson made available without an account.',
          access: 'public-sample',
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ detail: 'Public sample not found.' }), { status: 404 })
    }
    if (path.includes('/api/v1/content/lessons/')) {
      protectedLessonRequests += 1
      return new Response(JSON.stringify({ detail: 'Bearer access token required.' }), { status: 401, headers: { 'content-type': 'application/json' } })
    }
    if (!path.includes('/api/v1/content/quizzes/')) return new Response('{}', { status: 503 })
    if (path.endsWith('/grade')) {
      submittedQuiz = JSON.parse(String(init.body))
      const answers = submittedQuiz.answers
      return new Response(JSON.stringify({
        module_id: 'android-03-apk-triage', score: testQuizQuestions.length, total: testQuizQuestions.length,
        passed: true, grading_class: 'practice',
        results: testQuizQuestions.map(question => ({
          id: question.id, selected_index: answers[question.id], correct_index: question.correct_index,
          correct: answers[question.id] === question.correct_index, explanation: 'Feedback returned after server-side grading.',
        })),
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (quizMode !== 'authorized') return new Response('{}', { status: 503 })
    return new Response(JSON.stringify({
      module_id: 'android-03-apk-triage', grading_class: 'practice',
      questions: testQuizQuestions.map(({ id, question, options }) => ({ id, question, options })),
    }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  const rootPath = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root: rootPath, configFile: `${rootPath}/vite.config.ts`, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter, Routes, Route, useNavigate, useLocation } = await import('react-router-dom')
  const { MotionConfig } = await import('framer-motion')
  const { moduleLink, resolveModuleView, updateQuery } = await vite.ssrLoadModule('/src/lib/learningNavigation.ts')
  const { ModuleDetail } = await vite.ssrLoadModule('/src/pages/ModuleDetail.tsx')
  const { Modules } = await vite.ssrLoadModule('/src/pages/Modules.tsx')
  const { SessionProvider } = await vite.ssrLoadModule('/src/lib/session.tsx')
  const { LocalProfileProvider } = await vite.ssrLoadModule('/src/components/profile/LocalProfile.tsx')
  const { LABS } = await vite.ssrLoadModule('/src/content/labs.ts')
  const modules = JSON.parse(readFileSync(`${rootPath}/src/content/modules.json`, 'utf8'))
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    await vite.close()
    globalThis.fetch = oldFetch
    dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const h = React.createElement
  let navigate, location
  function NavigationProbe() { navigate = useNavigate(); location = useLocation(); return null }
  const android = modules.find(module => module.id === 'android-04-components')
  const lab = LABS.find(item => item.module === android.id)
  const entry = moduleLink(android.id, 'lab', lab.id, 'android-pentesting')
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [entry] }, h(LocalProfileProvider, null, h(SessionProvider, null,
    h(MotionConfig, { reducedMotion: 'always', transition: { duration: 0 } },
      h(NavigationProbe), h(Routes, null,
        h(Route, { path: '/paths/:pathId/modules/:id', element: h(ModuleDetail) }),
        h(Route, { path: '/modules', element: h(Modules) }),
      )))))))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
  assert.equal(document.querySelector('[aria-label="Module workspace"] [aria-pressed="true"]').textContent, `Labs${android.labs?.length || 1}`)
  assert.match(document.body.textContent, /Selected lab:/)
  assert.match(document.body.textContent, /source evidence clinic/)
  assert.equal(new URLSearchParams(location.search).get('lab'), lab.id)
  const labels = readFileSync(`${rootPath}/src/pages/ModuleDetail.tsx`, 'utf8')
  assert.equal((labels.match(/htmlFor=\{`\$\{lab.id\}-/g) || []).length, 12)
  assert.equal((labels.match(/<input id=\{`\$\{lab.id\}-/g) || []).length, 12)
  const showAll = [...document.querySelectorAll('button')].find(button => button.textContent === 'Show all module labs')
  await act(async () => showAll.click())
  assert.equal(new URLSearchParams(location.search).has('lab'), false)
  await act(async () => navigate(-1))
  assert.equal(new URLSearchParams(location.search).get('lab'), lab.id)
  assert.match(document.body.textContent, /Selected lab:/)
  await act(async () => navigate(1))
  assert.equal(new URLSearchParams(location.search).has('lab'), false)

  await act(async () => navigate('/modules?q=nonexistent-query&phase=1'))
  assert.equal(document.querySelector('input[type="search"]').value, 'nonexistent-query')
  assert.match(document.body.textContent, /No modules match/)
  const clear = [...document.querySelectorAll('button')].find(button => button.textContent === 'Clear filters')
  await act(async () => clear.click())
  assert.equal(location.search, '')
  assert.ok(document.querySelectorAll('.ws-catalog-row').length > 0)
  await act(async () => navigate(-1))
  assert.equal(document.querySelector('input[type="search"]').value, 'nonexistent-query')
  await act(async () => navigate(1))
  assert.equal(document.querySelector('input[type="search"]').value, '')

  for (const path of ['wireless-pentesting', 'android-pentesting']) {
    const module = modules.find(item => item.learningPathId === path && item.lessons.length)
    const href = moduleLink(module.id, 'theory', module.lessons[0].id, path)
    const parsed = new URL(href, 'http://localhost')
    const resolved = resolveModuleView(parsed.searchParams, module.lessons.map(item => item.id), [], false, path !== 'android-pentesting')
    assert.equal(resolved.tab, 'theory')
    assert.equal(resolved.lesson, 0)
  }
  assert.deepEqual(resolveModuleView(new URLSearchParams('tab=bad&lesson=missing&lab=other-module'), ['lesson'], ['lab'], false, false), { tab: 'overview', lesson: 0, lab: null })
  assert.equal(resolveModuleView(new URLSearchParams('tab=report'), [], [], false, false).tab, 'overview')
  const original = new URLSearchParams('path=android-pentesting&q=old&level=guided')
  const updated = updateQuery(original, { q: null, level: null })
  assert.equal(updated.toString(), 'path=android-pentesting')
  assert.equal(original.get('q'), 'old')
  const { useProgressStore } = await vite.ssrLoadModule('/src/store/useProgressStore.ts')
  await act(async () => { useProgressStore.getState().resetProgress(); navigate('/modules') })
  assert.equal(useProgressStore.getState().currentLearningPathId, null)
  assert.match(document.body.textContent, /Choose your learning path/)
  assert.equal(document.querySelectorAll('.sc-path-choices .ws-action').length, 2)
  const merge = useProgressStore.persist.getOptions().merge
  const emptyLegacy = { currentLearningPathId: 'wireless-pentesting', currentModule: '01-intro-wireless', completedLessons: [] }
  assert.equal(merge(emptyLegacy, useProgressStore.getState()).currentLearningPathId, null)
  assert.equal(merge({ ...emptyLegacy, pathChosen: true }, useProgressStore.getState()).currentLearningPathId, 'wireless-pentesting')
  assert.equal(merge({ ...emptyLegacy, currentLearningPathId: 'android-pentesting' }, useProgressStore.getState()).currentModule, null)
  const invalidQuizState = merge({
    ...emptyLegacy,
    pathChosen: true,
    quizScores: [
      { moduleId: 'android-03-apk-triage', quizId: 'quiz-01', score: 99, total: 6 },
      { moduleId: 'android-03-apk-triage', quizId: 'quiz-01', score: 5.5, total: 6 },
      { moduleId: 'android-03-apk-triage', quizId: 'quiz-01', score: 5, total: 5 },
      { moduleId: 'android-03-apk-triage', quizId: 'quiz-01', score: 5, total: 6 },
    ],
  }, useProgressStore.getState())
  assert.equal(invalidQuizState.quizScores.length, 1, 'only a whole-number passing score with the exact module question count is retained')
  assert.equal(invalidQuizState.quizScores[0].score, 5)
  await act(async () => useProgressStore.getState().setCurrentModule(android.id))
  assert.equal(useProgressStore.getState().currentLearningPathId, 'android-pentesting')
  await act(async () => useProgressStore.getState().setCurrentLearningPath('wireless-pentesting'))
  assert.equal(useProgressStore.getState().currentModule, null)
  await act(async () => navigate('/modules?path=missing'))
  assert.match(document.body.textContent, /Path not found/)
  assert.equal(document.querySelectorAll('.ws-catalog-row').length, 0)
  const planned = JSON.parse(readFileSync(`${rootPath}/src/content/learning-paths.json`, 'utf8')).find(path => path.status !== 'available')
  await act(async () => navigate(`/modules?path=${planned.id}`))
  assert.match(document.body.textContent, /This path is planned/)
  assert.equal(document.querySelectorAll('.ws-catalog-row').length, 0)
  assert.equal(useProgressStore.getState().currentLearningPathId, 'wireless-pentesting', 'invalid and planned routes never replace a real choice')

  // Protected quiz prompts do not fall back to answer-bearing browser data when the learner API is unavailable.
  await act(async () => navigate('/paths/android-pentesting/modules/android-04-components?tab=quiz'))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 140)) })
  const unavailableQuizTab = [...document.querySelectorAll('[aria-label="Module workspace"] button')].find(button => button.textContent.includes('Quiz'))
  assert.equal(unavailableQuizTab?.getAttribute('aria-pressed'), 'true')
  assert.match(document.body.textContent, /Knowledge check unavailable/)
  assert.match(document.body.textContent, /approved account or check the API connection/i)
  assert.equal(document.querySelectorAll('input[type="radio"]').length, 0)

  // An approved learner receives answer-free prompts; grading returns feedback only after submission.
  quizMode = 'authorized'
  await act(async () => navigate('/paths/android-pentesting/modules/android-03-apk-triage?tab=quiz'))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 140)) })
  assert.match(document.body.textContent, /Authenticated practice prompt 1/)
  assert.equal(document.querySelectorAll('input[type="radio"]').length, 24)
  const quizGroups = [...document.querySelectorAll('.sc-learning-content fieldset')]
  assert.equal(quizGroups.length, testQuizQuestions.length)
  assert.ok(quizGroups.every(group => group.querySelector('legend')?.textContent.trim()), 'every set of quiz choices has a programmatic question label')
  for (let index = 0; index < testQuizQuestions.length; index++) {
    const correctDisplayedOption = [...document.querySelectorAll(`input[name="q${index}"]`)]
      .find(option => option.closest('label')?.textContent.includes('Option C'))
    assert.ok(correctDisplayedOption)
    await act(async () => correctDisplayedOption.click())
  }
  const submitQuiz = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Submit practice quiz'))
  assert.ok(submitQuiz)
  await act(async () => { submitQuiz.click(); await new Promise(resolve => setTimeout(resolve, 0)) })
  assert.equal(Object.keys(submittedQuiz.answers).length, testQuizQuestions.length)
  assert.ok(Object.values(submittedQuiz.answers).every(answer => answer === 2), 'the shuffled learner choice maps back to its server-authored option index')
  assert.match(document.querySelector('.sc-quiz-summary').textContent, /Passed · 6 \/ 6 correct/)
  assert.match(document.body.textContent, /Practice result, not a verified assessment/)
  assert.match(document.body.textContent, /Feedback returned after server-side grading/)
  const quizXp = useProgressStore.getState().getTotalXp()
  const quizRecords = useProgressStore.getState().quizScores.length
  for (const [moduleId, quizId, score, total] of [
    ['unknown-module', 'quiz-01', 6, 6],
    ['android-03-apk-triage', 'quiz-02', 6, 6],
    ['android-03-apk-triage', 'quiz-01', 6, 5],
    ['android-03-apk-triage', 'quiz-01', 5.5, 6],
  ]) {
    assert.deepEqual(useProgressStore.getState().completeQuiz(moduleId, quizId, score, total), { points: 0, isNew: false })
  }
  assert.equal(useProgressStore.getState().quizScores.length, quizRecords, 'invalid local quiz records do not alter progress')
  assert.equal(useProgressStore.getState().getTotalXp(), quizXp, 'invalid local quiz records cannot award practice XP')

  // The selected public sample works for a guest without touching the protected lesson route.
  await act(async () => navigate(`/paths/android-pentesting/modules/android-01-platform?tab=theory&lesson=${sampleLessonId}`))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 140)) })
  assert.match(document.body.textContent, /public sample lesson made available without an account/i)
  assert.match(document.body.textContent, /Public sample/)
  assert.equal(sampleLessonAuthorization.at(-1), null, 'public lesson samples do not require or send a bearer token')
  assert.equal(protectedLessonRequests, 0, 'public samples do not fall through to the protected lesson route')

  // Direct entry to a protected lesson explains the real boundary and offers retry/account actions.
  await act(async () => navigate('/paths/android-pentesting/modules/android-01-platform?tab=theory&lesson=02-components-binder-and-permissions'))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 140)) })
  assert.match(document.body.textContent, /Approved account needed/)
  assert.match(document.body.textContent, /public catalogue, supplied samples and bundled local labs remain available/i)
  assert.ok([...document.querySelectorAll('a')].some(link => link.textContent.includes('Request or check access')))
  const requestsBeforeRetry = protectedLessonRequests
  const retryLesson = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Retry lesson')
  assert.ok(retryLesson)
  await act(async () => { retryLesson.click(); await new Promise(resolve => setTimeout(resolve, 140)) })
  assert.ok(protectedLessonRequests > requestsBeforeRetry, 'retry issues a fresh direct lesson request')
})
