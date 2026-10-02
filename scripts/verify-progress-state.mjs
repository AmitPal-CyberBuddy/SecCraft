#!/usr/bin/env node
/** Smoke-test the local progress store through Vite's SSR loader and a browser-like localStorage. */
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendRoot = path.join(repoRoot, 'frontend')
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'))
const { createServer } = await import(pathToFileURL(frontendRequire.resolve('vite')).href)
const values = new Map()
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
}

// Simulate a pre-current-version install with duplicated records and stale/unearned credits.
values.set('wififorge-progress', JSON.stringify({ version: 3, state: {
  currentModule: 'removed-module',
  currentLearningPathId: 'removed-path',
  completedLessons: [
    null,
    { moduleId: '02-wifi-fundamentals', lessonId: '01-identity-topology-and-beacons', points: 99 },
    { moduleId: '02-wifi-fundamentals', lessonId: '01-identity-topology-and-beacons', points: 99 },
    { moduleId: 'unknown', lessonId: 'missing', points: 99 },
  ],
  completedLabs: [
    null,
    { moduleId: '02-wifi-fundamentals', labId: 'lab-02-beacon', score: 100, points: 25 },
    { moduleId: '02-wifi-fundamentals', labId: 'removed-lab', score: 100, points: 25 },
  ],
  quizScores: [
    null,
    { moduleId: '02-wifi-fundamentals', quizId: 'quiz-01', score: 2, total: 5, points: 500 },
    { moduleId: '02-wifi-fundamentals', quizId: 'quiz-01', score: 4, total: 5, points: 500 },
  ],
  completedChallenges: [null, { challengeId: 'chal-01-beacon', moduleId: '02-wifi-fundamentals', points: 5000 }],
  achievements: [
    null,
    { id: 'first_lesson', title: 'stale title', points: 5000 },
    { id: 'module_complete', title: 'obsolete', points: 5000 },
  ],
  totalXp: 99999,
} }))

globalThis.localStorage = storage
globalThis.window = { localStorage: storage }

const server = await createServer({
  configFile: path.join(frontendRoot, 'vite.config.ts'),
  root: frontendRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { useProgressStore, MAX_XP, CERT_PROGRESS_THRESHOLD } = await server.ssrLoadModule('/src/store/useProgressStore.ts')
  const { resolveModuleView } = await server.ssrLoadModule('/src/lib/learningNavigation.ts')
  assert.equal(resolveModuleView(new URLSearchParams('tab=theory&lesson=02-evidence-severity-reporting'), ['01-methodology-and-roe', '02-independent-capture-case', '03-independent-attempt-and-decision-log', '04-findings-non-findings-and-review', '05-client-handoff-and-retest-closure'], [], true, true).lesson, 3, 'retired lesson deep link resolves to current replacement without granting completion')
  let state = useProgressStore.getState()

  assert.equal(state.currentModule, null, 'migration does not invent a resume module for invalid context')
  assert.equal(state.currentLearningPathId, null, 'invalid legacy context does not silently choose Wireless')
  assert.equal(state.completedLessons.length, 1, 'migration deduplicates valid lessons')
  assert.equal(state.completedLessons[0].points, 10, 'lesson credit uses the current award')
  assert.equal(state.completedLabs.length, 1, 'migration drops removed labs')
  assert.equal(state.completedLabs[0].score, undefined, 'legacy lab scores require fresh verification')
  assert.equal(state.completedLabs[0].points, 0, 'legacy lab XP is removed')
  assert.equal(state.quizScores.length, 1, 'migration keeps one passing quiz record')
  assert.equal(state.quizScores[0].points, 20, 'quiz XP is recalculated, not trusted from storage')
  assert.equal(state.completedChallenges.length, 0, 'legacy challenge credit is not silently grandfathered')
  assert.deepEqual(state.achievements.map(item => item.id), ['first_lesson'], 'obsolete achievement credit is removed')
  assert.equal(state.getTotalXp(), 40, 'XP is recalculated from normalized records')
  assert.equal(state.totalXp, 40, 'persisted XP matches the derived total')

  state.resetProgress()
  assert.equal(useProgressStore.getState().getTotalXp(), 0, 'reset clears all progress credit')
  assert.equal(useProgressStore.getState().currentModule, null, 'a reset learner chooses their path')

  let result = useProgressStore.getState().completeQuiz('02-wifi-fundamentals', 'quiz-01', 4, 5)
  assert.equal(result.points, 20, 'a passing quiz earns base XP once')
  result = useProgressStore.getState().completeQuiz('02-wifi-fundamentals', 'quiz-01', 5, 5)
  assert.equal(result.points, 10, 'improving a passed quiz only adds the perfect-score bonus')
  result = useProgressStore.getState().completeQuiz('02-wifi-fundamentals', 'quiz-01', 5, 5)
  assert.equal(result.points, 0, 'repeating a perfect quiz cannot award duplicate XP')
  assert.equal(useProgressStore.getState().getTotalXp(), 30)

  const firstLab = useProgressStore.getState().completeLab('02-wifi-fundamentals', 'lab-02-beacon', 100)
  const repeatedLab = useProgressStore.getState().completeLab('02-wifi-fundamentals', 'lab-02-beacon', 100)
  assert.equal(firstLab.points, 25)
  assert.equal(repeatedLab.points, 0, 'verified lab XP is one-time')
  const selfReview = useProgressStore.getState().completeLab('08-wpa-wpa2', 'lab-09-handshake', 100)
  assert.equal(selfReview.points, 0, 'self-review is recorded without verified XP')

  const firstLesson = useProgressStore.getState().completeLesson('02-wifi-fundamentals', '01-identity-topology-and-beacons')
  const repeatedLesson = useProgressStore.getState().completeLesson('02-wifi-fundamentals', '01-identity-topology-and-beacons')
  assert.equal(firstLesson.points, 10)
  assert.equal(repeatedLesson.points, 0, 'lesson XP is one-time')

  // Upgrade a v5 local record after the real module merge: preserve active lesson/lab
  // identity, archive retired knowledge checks and the retired report lesson without
  // silently calling an old quiz a pass on the larger current module.
  values.set('platform-progress', JSON.stringify({ version: 5, state: {
    currentModule: '16-eap',
    currentLearningPathId: 'wireless-pentesting',
    completedLessons: [
      { moduleId: '09-wpa2-practical', lessonId: '01-offline-audit-lab', points: 10 },
      { moduleId: '19-methodology', lessonId: '01-methodology-and-roe', points: 10 },
      { moduleId: '19-methodology', lessonId: '02-evidence-severity-reporting', points: 10 },
      { moduleId: '20-final-assessment', lessonId: '01-final-engagement', points: 10 },
    ],
    completedLabs: [{ moduleId: '09-wpa2-practical', labId: 'lab-09-handshake', points: 0 }],
    completedChallenges: [],
    quizScores: [
      { moduleId: '09-wpa2-practical', quizId: 'quiz-01', score: 5, total: 5, points: 30 },
      { moduleId: '19-methodology', quizId: 'quiz-01', score: 4, total: 5, points: 20 },
      { moduleId: '20-final-assessment', quizId: 'quiz-01', score: 5, total: 5, points: 30 },
    ],
    achievements: [],
  }}))
  await useProgressStore.persist.rehydrate()
  state = useProgressStore.getState()
  assert.equal(state.currentModule, '15-enterprise-fundamentals', 'resume moves to the surviving Enterprise module')
  assert.deepEqual(state.completedLessons.map(item => [item.moduleId, item.lessonId]), [
    ['08-wpa-wpa2', '01-offline-audit-lab'], ['20-final-assessment', '01-methodology-and-roe'],
  ], 'active lessons keep credit under their new parent; reporting lesson does not become capstone credit')
  assert.equal(state.completedLabs[0]?.moduleId, '08-wpa-wpa2', 'lab review follows its retained lab ID')
  assert.equal(state.quizScores.length, 0, 'retired module-specific quizzes do not pass different current checks')
  assert.equal(state.retiredRecords.length, 5, 'old quiz scores and replaced lessons survive as non-credit local history')
  assert.equal(state.getTotalXp(), 20, 'only still-active completed lessons earn credit after migration')

  const [moduleContent, quizContent, labContent, challengeContent] = await Promise.all([
    server.ssrLoadModule('/src/content/modules.json'),
    server.ssrLoadModule('/src/content/quizData.ts'),
    server.ssrLoadModule('/src/content/labs.ts'),
    server.ssrLoadModule('/src/content/challenges.json'),
  ])
  // Phase-1 redesign adds lessons, never silently upgrades previous participation.
  const foundations = moduleContent.default.find(module => module.id === '03-80211-architecture')
  const oldLessons = foundations.lessons.filter(lesson => lesson.id !== '03-foundations-independent-case')
  values.set('platform-progress', JSON.stringify({ version: 7, state: {
    currentModule: foundations.id, currentLearningPathId: 'wireless-pentesting', pathChosen: true,
    completedLessons: oldLessons.map(lesson => ({ moduleId: foundations.id, lessonId: lesson.id, points: 10, completedAt: '2026-09-01T00:00:00Z' })),
    completedLabs: [], completedChallenges: [], achievements: [], retiredRecords: [],
    quizScores: [{ moduleId: foundations.id, quizId: 'quiz-01', score: 5, total: 5, points: 30, completed: true }],
  } }))
  await useProgressStore.persist.rehydrate()
  state = useProgressStore.getState()
  assert.equal(state.completedLessons.length, 2, 'old foundation participation is retained')
  assert.equal(state.quizScores.length, 1, 'unchanged foundation quiz remains valid local history')
  assert.equal(state.getTotalXp(), 50, 'adding a case awards no automatic XP')
  assert.equal(state.isLessonCompleted(foundations.id, '03-foundations-independent-case'), false, 'new case requires fresh participation')
  assert.ok(state.getModuleProgress(foundations.id) < 100, 'new work changes the current denominator without deleting old work')

  // Phases 2–3 must preserve old activity without granting the new units or extra XP.
  for (const [mid, added] of [
    ['04-kali-wireless-setup', '03-capability-troubleshooting'],
    ['05-wireless-recon', '02-coverage-and-inventory'],
    ['06-traffic-analysis', '02-timeline-and-evidence-handoff'],
    ['08-wpa-wpa2', '04-bounded-candidate-audit'],
    ['10-wps', '02-applicability-lockout-and-budget'],
    ['11-wpa3', '02-policy-negotiation-and-negative-controls'],
  ]) {
    const module = moduleContent.default.find(m => m.id === mid)
    const previous = module.lessons.filter(l => l.id !== added)
    values.set('platform-progress', JSON.stringify({ version: 7, state: {
      currentModule: mid, currentLearningPathId: 'wireless-pentesting', pathChosen: true,
      completedLessons: previous.map(l => ({ moduleId: mid, lessonId: l.id, points: 10, completedAt: '2026-09-01T00:00:00Z' })),
      completedLabs: [], completedChallenges: [], achievements: [], retiredRecords: [], quizScores: [],
    } }))
    await useProgressStore.persist.rehydrate()
    state = useProgressStore.getState()
    assert.equal(state.completedLessons.length, previous.length, mid + ' preserves previous lessons')
    assert.equal(state.isLessonCompleted(mid, added), false, mid + ' new lesson not auto-completed')
    assert.equal(state.getTotalXp(), previous.length * 10, mid + ' no automatic XP')
    assert.ok(state.getModuleProgress(mid) < 100, mid + ' new denominator includes added work')
  }

  // Phase 4 adds two units to one module: neither may inherit earlier credit.
  for (const [mid, added] of [
    ['12-deauth-disassoc', ['03-management-effects-and-controls', '04-client-trust-and-attribution']],
    ['14-captive-portals', ['02-session-and-boundary-evidence']],
    ['15-enterprise-fundamentals', ['04-method-selection-and-trust-boundaries', '05-certificate-identity-validation', '06-radius-to-applied-policy']],
    ['20-final-assessment', ['03-independent-attempt-and-decision-log', '04-findings-non-findings-and-review', '05-client-handoff-and-retest-closure']],
    ['18-corporate-attacks', ['03-boundary-map-and-test-scope', '04-policy-order-and-evidence-controls', '05-retest-and-supported-impact']],
  ]) {
    const module = moduleContent.default.find(m => m.id === mid)
    const previous = module.lessons.filter(l => !added.includes(l.id))
    values.set('platform-progress', JSON.stringify({ version: 7, state: {
      currentModule: mid, currentLearningPathId: 'wireless-pentesting', pathChosen: true,
      completedLessons: previous.map(l => ({ moduleId: mid, lessonId: l.id, points: 10 })),
      completedLabs: [], completedChallenges: [], achievements: [], retiredRecords: [], quizScores: [],
    } }))
    await useProgressStore.persist.rehydrate()
    state = useProgressStore.getState()
    assert.equal(state.completedLessons.length, previous.length)
    for (const id of added) assert.equal(state.isLessonCompleted(mid, id), false, id + ' not inherited')
    assert.equal(state.getTotalXp(), previous.length * 10)
    assert.ok(state.getModuleProgress(mid) < 100)
  }

  useProgressStore.getState().resetProgress()
  for (const module of moduleContent.default) {
    for (const lesson of module.lessons) useProgressStore.getState().completeLesson(module.id, lesson.id)
    for (const questionList of [quizContent.quizData[module.id] ?? []]) {
      if (questionList.length) useProgressStore.getState().completeQuiz(module.id, 'quiz-01', questionList.length, questionList.length)
    }
  }
  for (const lab of labContent.AVAILABLE_LABS) {
    useProgressStore.getState().completeLab(lab.module, lab.id, lab.grading === 'answer-checked' ? 100 : undefined)
  }
  for (const challenge of challengeContent.default) useProgressStore.getState().completeChallenge(challenge.id)
  await new Promise(resolve => setTimeout(resolve, 160))

  state = useProgressStore.getState()
  assert.equal(state.getOverallProgress(), 100, 'the full recorded journey reaches platform completion')
  assert.equal(state.getPathProgress('wireless-pentesting'), 100, 'the full recorded journey completes its path')
  assert.ok(moduleContent.default.every(module => state.getModuleProgress(module.id) === 100), 'every module reaches 100% when all shipped activities are recorded')
  assert.ok(state.getTotalXp() <= MAX_XP, 'earned XP stays within its content-derived ceiling')
  assert.ok(state.getOverallProgress() >= CERT_PROGRESS_THRESHOLD && state.getPathProgress('wireless-pentesting') >= CERT_PROGRESS_THRESHOLD, 'the local record threshold is reachable; it does not issue a certificate')

  console.log('Progress migration, reset, retry/score upgrade, duplicate rewards, and a full browser-local practice journey passed (no certificate or verified competence).')
} finally {
  await server.close()
}
