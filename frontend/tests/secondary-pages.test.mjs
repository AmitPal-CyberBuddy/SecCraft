import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('secondary pages preserve reset consent, theme selection and local milestone meaning', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const saved = new Map()
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'Event', 'MouseEvent', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] })
  }
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  window.scrollTo = () => {}
  const oldFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('{}', { status: 503 })
  const rootPath = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root: rootPath, configFile: `${rootPath}/vite.config.ts`, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter } = await import('react-router-dom')
  const { MotionConfig } = await import('framer-motion')
  const { Settings } = await vite.ssrLoadModule('/src/pages/Settings.tsx')
  const { AnalyticsDashboard } = await vite.ssrLoadModule('/src/components/analytics/AnalyticsDashboard.tsx')
  const { BadgesShowcase } = await vite.ssrLoadModule('/src/components/gamification/BadgesShowcase.tsx')
  const { SessionProvider } = await vite.ssrLoadModule('/src/lib/session.tsx')
  const { LocalProfileProvider } = await vite.ssrLoadModule('/src/components/profile/LocalProfile.tsx')
  const { ThemeProvider } = await vite.ssrLoadModule('/src/components/theme/ThemeProvider.tsx')
  const { useProgressStore, ACHIEVEMENTS_DEF } = await vite.ssrLoadModule('/src/store/useProgressStore.ts')
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount()); await vite.close(); globalThis.fetch = oldFetch; dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const h = React.createElement
  const render = async component => act(async () => root.render(h(MemoryRouter, null, h(LocalProfileProvider, null, h(SessionProvider, null, h(ThemeProvider, null,
    h(MotionConfig, { reducedMotion: 'always', transition: { duration: 0 } }, h(component))))))))
  const button = name => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === name)
  const click = async name => { assert.ok(button(name), name); await act(async () => button(name).click()) }
  useProgressStore.setState({ completedLessons: [{ moduleId: 'android-01-foundations', lessonId: 'fixture', points: 10, completed: true, completedAt: new Date().toISOString() }] })
  localStorage.setItem('platform-profile', JSON.stringify({ displayName: 'Keep my name' }))
  localStorage.setItem('platform-report-fixture', 'Keep my draft')
  await render(Settings)
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
  assert.equal(document.querySelectorAll('[aria-label="Settings sections"] a').length, 5)
  await click('Light')
  assert.equal(button('Light').getAttribute('aria-pressed'), 'true')
  assert.equal(button('Dark').getAttribute('aria-pressed'), 'false')
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light')
  const fontSizeBefore = document.documentElement.style.getPropertyValue('--a11y-font-size')
  const increase = document.querySelector('[aria-label="Increase base text size"]')
  assert.ok(increase)
  await act(async () => increase.click())
  assert.equal(parseInt(document.documentElement.style.getPropertyValue('--a11y-font-size')), parseInt(fontSizeBefore) + 1)
  assert.ok(!document.body.textContent.includes('Checklist — 12/12'))
  const { restoreReadingPreferences } = await vite.ssrLoadModule('/src/lib/readingPreferences.ts')
  document.documentElement.style.removeProperty('--a11y-font-size')
  restoreReadingPreferences()
  assert.equal(parseInt(document.documentElement.style.getPropertyValue('--a11y-font-size')), parseInt(fontSizeBefore) + 1)
  await click('Reset All Progress')
  assert.equal(useProgressStore.getState().completedLessons.length, 1)
  await click('Cancel')
  assert.equal(useProgressStore.getState().completedLessons.length, 1)
  assert.equal(button('Confirm reset'), undefined)
  await click('Reset All Progress'); await click('Confirm reset')
  assert.equal(useProgressStore.getState().completedLessons.length, 0)
  assert.match(document.querySelector('[role="status"]').textContent, /Learning progress reset/)
  assert.equal(localStorage.getItem('platform-report-fixture'), 'Keep my draft')
  assert.match(localStorage.getItem('platform-profile'), /Keep my name/)
  assert.equal(localStorage.getItem('platform-theme'), 'light')

  await act(async () => useProgressStore.setState({ achievements: [ACHIEVEMENTS_DEF[0]] }))
  await render(BadgesShowcase)
  const earned = document.querySelector('.sc-badges section')
  assert.match(earned.textContent, /Earned milestones/)
  assert.equal(earned.querySelectorAll('article').length, 1)
  assert.match(earned.textContent, /Earned locally.*unverified/)
  assert.equal(document.querySelectorAll('.sc-badges article').length, ACHIEVEMENTS_DEF.length)

  const { default: modules } = await vite.ssrLoadModule('/src/content/modules.json')
  const { default: challengeContent } = await vite.ssrLoadModule('/src/content/challenges.json')
  const android = modules.find(m => m.learningPathId === 'android-pentesting')
  const wireless = modules.find(m => m.learningPathId === 'wireless-pentesting')
  const firstChallenge = challengeContent.find(challenge => challenge.learningPathId === 'wireless-pentesting')
  const challengeRecord = { challengeId: firstChallenge.id, moduleId: firstChallenge.module, points: firstChallenge.points, completedAt: new Date().toISOString() }
  await act(async () => useProgressStore.setState({ currentLearningPathId: 'android-pentesting', completedLessons: [android, wireless].map(m => ({ moduleId: m.id, lessonId: m.lessons[0].id, points: 10, completed: true, completedAt: new Date().toISOString() })), completedLabs: [], completedChallenges: [], quizScores: [], achievements: [] }))
  await render(AnalyticsDashboard)
  assert.match(document.body.textContent, new RegExp(android.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.ok(!document.body.textContent.includes(wireless.title), 'current-path rows must not mix curricula')
  assert.deepEqual([...document.querySelectorAll('.sc-week-bar > span:last-child')].map(el => el.textContent), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  assert.equal([...document.querySelectorAll('.sc-week-value')].reduce((sum, el) => sum + parseInt(el.textContent), 0), 20)
  assert.match(document.querySelector('.sc-analytics-scope').textContent, /Module rows below cover the selected path/)
  assert.match(document.querySelector('.sc-analytics-scope').textContent, /browser-local records across paths/)

  await act(async () => useProgressStore.setState({ completedLessons: [], completedLabs: [], completedChallenges: [challengeRecord], quizScores: [], achievements: [] }))
  await render(AnalyticsDashboard)
  assert.doesNotMatch(document.body.textContent, /Nothing recorded on this device yet/)
  assert.match(document.body.textContent, /1 challenge checkpoint recorded locally/)
  assert.equal([...document.querySelectorAll('.sc-week-value')].reduce((sum, el) => sum + parseInt(el.textContent), 0), firstChallenge.points)

  await act(async () => useProgressStore.setState({ completedLessons: [], completedLabs: [{ moduleId: '08-wpa-wpa2', labId: 'lab-09-handshake', completed: true, points: 0, completedAt: new Date().toISOString() }], completedChallenges: [], quizScores: [], achievements: [] }))
  await render(AnalyticsDashboard)
  assert.match(document.body.textContent, /Practice was recorded, but no XP was credited/)
  assert.match(document.body.textContent, /1 local completion record falls in this week/)
  assert.doesNotMatch(document.body.textContent, /Nothing recorded on this device yet/)

  await t.test('new XP feedback pauses on focus and stale expiry cannot clear a newer event', async () => {
    const { PointsToast } = await vite.ssrLoadModule('/src/components/gamification/PointsToast.tsx')
    const timeout = globalThis.setTimeout
    const timers = []
    globalThis.setTimeout = (callback, ms, ...args) => ms === 8000 ? (timers.push(callback), 123456) : timeout(callback, ms, ...args)
    try {
      Object.defineProperty(document, 'visibilityState', { configurable:true, value:'visible' })
      await render(() => h('div', null, h('button', {id:'return-target'}, 'Record'), h(PointsToast)))
      document.getElementById('return-target').focus()
      const first = {amount:10,reason:'First local event',at:'first'}
      await act(async () => useProgressStore.setState({lastEarnedPoints:first}))
      const oldTimer = timers.at(-1)
      const next = {amount:20,reason:'Next local event',at:'next'}
      await act(async () => useProgressStore.setState({lastEarnedPoints:next}))
      await act(async () => oldTimer())
      assert.equal(useProgressStore.getState().lastEarnedPoints,next)
      const close = document.querySelector('[aria-label="Dismiss XP earned notification"]')
      await act(async () => close.focus())
      const count = timers.length
      await act(async () => useProgressStore.setState({lastEarnedPoints:{...next,at:'third'}}))
      assert.equal(timers.length,count,'focused notification must not schedule expiry')
      await act(async () => close.click())
      assert.equal(useProgressStore.getState().lastEarnedPoints,null)
      assert.equal(document.activeElement.id,'return-target')
      assert.equal(document.querySelector('.sc-earned-message'),null)
    } finally { globalThis.setTimeout = timeout }
  })

})
