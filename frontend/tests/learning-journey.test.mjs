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
  globalThis.fetch = async () => new Response('{}', { status: 503 })
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
  const { Labs } = await vite.ssrLoadModule('/src/pages/Labs.tsx')
  const { Challenges } = await vite.ssrLoadModule('/src/pages/Challenges.tsx')
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
        h(Route, { path: '/modules/:id', element: h(ModuleDetail) }),
        h(Route, { path: '/modules', element: h(Modules) }),
        h(Route, { path: '/labs', element: h(Labs) }),
        h(Route, { path: '/challenges', element: h(Challenges) }),
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

  const firstWirelessModule = modules.find(item => item.learningPathId === 'wireless-pentesting' && item.lessons?.length)
  assert.ok(firstWirelessModule)
  await act(async () => { useProgressStore.getState().resetProgress(); navigate(`/modules/${firstWirelessModule.id}`) })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
  const suggestedStep = document.querySelector('.sc-module-next')
  assert.ok(suggestedStep, 'module overview must surface one suggested next step')
  assert.match(suggestedStep.textContent, new RegExp(`Lesson 1 of ${firstWirelessModule.lessons.length}`))
  assert.match(suggestedStep.textContent, new RegExp(firstWirelessModule.lessons[0].title))
  const openLesson = [...suggestedStep.querySelectorAll('button')].find(button => button.textContent.includes('Open lesson'))
  assert.ok(openLesson)
  await act(async () => openLesson.click())
  assert.equal(new URLSearchParams(location.search).get('tab'), 'theory')
  assert.equal(new URLSearchParams(location.search).get('lesson'), firstWirelessModule.lessons[0].id)
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
  const markComplete = [...document.querySelectorAll('.sc-reading-toolbar button')].find(button => button.textContent.includes('Mark complete · 10 practice XP'))
  assert.ok(markComplete)
  await act(async () => markComplete.click())
  assert.equal(useProgressStore.getState().completedLessons.length, 1)
  assert.match(document.querySelector('.sc-reading-toolbar').textContent, /Completed · local record/)
  assert.ok([...document.querySelectorAll('.sc-reading-toolbar button')].some(button => button.disabled && button.textContent.includes('Completed · local record')))
  assert.match(document.querySelector('.sc-lesson-index').textContent, new RegExp(`1/${firstWirelessModule.lessons.length}`))
  assert.match(document.querySelector('.sc-lesson-index').textContent, /Completed locally/)
  await act(async () => navigate(`/modules/${firstWirelessModule.id}`))
  const resumedStep = document.querySelector('.sc-module-next')
  assert.match(resumedStep.textContent, new RegExp(`Lesson 2 of ${firstWirelessModule.lessons.length}`))
  assert.match(resumedStep.textContent, new RegExp(`1 of ${firstWirelessModule.lessons.length} lessons are marked complete`))

  const wirelessLabs = LABS.filter(item => item.learningPathId === 'wireless-pentesting')
  const availableWirelessLabs = wirelessLabs.filter(item => item.status !== 'PLANNED')
  const localAnswerChecks = availableWirelessLabs.filter(item => item.grading === 'answer-checked').length
  const selfReviewLabs = availableWirelessLabs.filter(item => item.grading === 'self-review').length
  await act(async () => { useProgressStore.getState().setCurrentLearningPath('wireless-pentesting'); navigate('/labs') })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 120)) })
  const practiceModel = document.querySelector('[aria-label="Lab practice model"]')
  assert.ok(practiceModel)
  assert.match(practiceModel.textContent, new RegExp(`${availableWirelessLabs.length}available labs`))
  assert.match(practiceModel.textContent, new RegExp(`${localAnswerChecks}local answer checks`))
  assert.match(practiceModel.textContent, new RegExp(`${selfReviewLabs}guided self-review`))
  assert.match(practiceModel.textContent, /planned entry excluded from available totals/)
  const typeGroup = document.querySelector('[aria-label="Filter labs by type"]')
  const uniqueLabTypes = [...new Set(wirelessLabs.map(item => item.type))]
  assert.equal(typeGroup.querySelectorAll('button').length, uniqueLabTypes.length + 1, 'every catalogue type remains filterable')
  assert.equal(typeGroup.querySelectorAll('button[aria-pressed]').length, uniqueLabTypes.length + 1)
  const lastType = uniqueLabTypes.at(-1)
  const lastTypeButton = typeGroup.querySelector(`[aria-label="Filter labs by ${lastType}"]`)
  assert.ok(lastTypeButton, 'types beyond the first six are not hidden')
  await act(async () => lastTypeButton.click())
  const matchingLabCount = wirelessLabs.filter(item => item.type === lastType).length
  assert.match(document.querySelector('.sc-lab-filter-summary [role="status"]').textContent, new RegExp(`Showing ${matchingLabCount} of ${wirelessLabs.length}`))
  assert.equal(lastTypeButton.getAttribute('aria-pressed'), 'true')
  await act(async () => [...document.querySelectorAll('.sc-lab-filter-summary button')].find(button => button.textContent === 'Clear filters').click())
  const labSearch = document.querySelector('input[aria-label="Search labs"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(labSearch, 'no-such-lab')
    labSearch.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.match(document.querySelector('.sc-lab-empty h3').textContent, /No lab entries match/)
  assert.match(document.querySelector('.sc-lab-filter-summary [role="status"]').textContent, /Showing 0 of/)
  await act(async () => [...document.querySelectorAll('.sc-lab-filter-summary button')].find(button => button.textContent === 'Clear filters').click())
  assert.ok(document.querySelectorAll('.ws-lab-workspace .ws-catalog-row').length > 0)

  const challengeCatalog = JSON.parse(readFileSync(`${rootPath}/src/content/challenges.json`, 'utf8'))
  const firstWirelessChallenge = challengeCatalog.find(item => item.learningPathId === 'wireless-pentesting')
  assert.ok(firstWirelessChallenge)
  await act(async () => navigate('/challenges'))
  const challengeCard = [...document.querySelectorAll('.sc-challenges .ws-catalog-row')].find(card => card.querySelector('h3')?.textContent === firstWirelessChallenge.title)
  assert.ok(challengeCard)
  assert.match(challengeCard.textContent, /No checkpoint recorded/)
  assert.match(challengeCard.querySelector('.ws-row-link').textContent, /Open challenge/)
  await act(async () => useProgressStore.getState().completeChallenge(firstWirelessChallenge.id))
  assert.match(challengeCard.textContent, /Checkpoint recorded locally/)
  assert.match(challengeCard.querySelector('.ws-row-link').textContent, /Review challenge/)
  assert.match(document.querySelector('.sc-practice-summary').textContent, /1 checkpoint recorded locally/)

})
