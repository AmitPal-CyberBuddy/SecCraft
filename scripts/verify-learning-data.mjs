#!/usr/bin/env node
/** Verify the implemented wireless-learning catalogue and its cross-file references. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendRoot = path.join(repoRoot, 'frontend')
const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'))
const { createServer } = await import(pathToFileURL(frontendRequire.resolve('vite')).href)
const server = await createServer({
  configFile: path.join(frontendRoot, 'vite.config.ts'),
  root: frontendRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const [moduleContent, quizContent, labContent, challengeContent, scenarioContent, pathContent] = await Promise.all([
    server.ssrLoadModule('/src/content/modules.json'),
    server.ssrLoadModule('/src/content/quizData.ts'),
    server.ssrLoadModule('/src/content/labs.ts'),
    server.ssrLoadModule('/src/content/challenges.json'),
    server.ssrLoadModule('/src/content/scenarios.json'),
    server.ssrLoadModule('/src/content/learning-paths.json'),
  ])
  const modules = moduleContent.default
  const quizzes = quizContent.quizData
  const { LABS, AVAILABLE_LABS } = labContent
  const challenges = challengeContent.default
  const scenarios = scenarioContent.default
  const learningPaths = pathContent.default
  const moduleIds = new Set(modules.map(module => module.id))
  const pathIds = new Set(learningPaths.map(learningPath => learningPath.id))
  const lessonKeys = new Set()
  let lessonCount = 0

  assert.equal(modules.length, 27, '15 wireless plus 12 Android modules')
  assert.equal(new Set(moduleIds).size, modules.length, 'module ids are unique')

  for (const module of modules) {
    assert.ok(pathIds.has(module.learningPathId), `${module.id} has a valid learning path`)
    assert.ok(module.prerequisites.every(id => moduleIds.has(id) && id !== module.id), `${module.id} prerequisites survive the merge`)
    for (const lesson of module.lessons ?? []) {
      const key = `${module.id}/${lesson.id}`
      assert.ok(!lessonKeys.has(key), `${key} is unique`)
      lessonKeys.add(key)
      lessonCount++
      assert.ok(fs.existsSync(path.join(frontendRoot, 'src/content/lessons', module.id, `${lesson.id}.md`)), `${key} has authored lesson content`)
    }
    if (Object.hasOwn(quizzes, module.id)) {
      assert.ok(quizzes[module.id].length > 0, `${module.id} quiz is not empty`)
      for (const [index, question] of quizzes[module.id].entries()) {
        assert.ok(question.question?.trim(), `${module.id} question ${index + 1} has prompt text`)
        assert.ok(Array.isArray(question.options) && question.options.length >= 2, `${module.id} question ${index + 1} has options`)
        assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.options.length, `${module.id} question ${index + 1} has a valid answer key`)
        assert.ok(question.explanation?.trim(), `${module.id} question ${index + 1} explains the answer`)
      }
    }
  }

  assert.equal(lessonCount, 99, '53 wireless and 46 Android lessons are present')
  assert.equal(lessonKeys.size, lessonCount)
  assert.equal(Object.keys(quizzes).length, 27, 'all authored modules have knowledge checks')
  const totalQuestions = Object.values(quizzes).reduce((sum, list) => sum + list.length, 0)
  assert.equal(totalQuestions, 146, 'every implemented quiz question is accounted for')
  assert.ok(modules.every(module => Object.hasOwn(quizzes, module.id)), 'each module has an authored knowledge check')
  assert.ok(quizzes['20-final-assessment']?.length, 'the final-assessment module has an authored knowledge check')
  assert.deepEqual(modules.find(item => item.id === '20-final-assessment').prerequisites, ['18-corporate-attacks'], 'wireless final case follows corporate attacks')
  const retired = new Set(['09-wpa2-practical', '13-rogue-ap', '16-eap', '17-radius', '19-methodology'])
  assert.ok([...retired].every(id => !moduleIds.has(id) && !Object.hasOwn(quizzes, id)), 'retired modules and quiz banks are absent')
  const wireless = learningPaths.find(item => item.id === 'wireless-pentesting')
  assert.deepEqual(wireless.modules, modules.filter(item => item.learningPathId === wireless.id).map(item => item.id), 'wireless path order matches its modules')
  const android = learningPaths.find(item => item.id === 'android-pentesting')
  assert.equal(android.status, 'available', 'Android Foundations is an honest released slice')
  assert.deepEqual(android.modules, modules.filter(item => item.learningPathId === android.id).map(item => item.id), 'Android path order matches its modules')
  assert.deepEqual(android.phases.flatMap(phase => phase.modules), android.modules, 'Android phases cover all authored modules')
  assert.match(android.longDescription, /no prebuilt APK, measured dynamic outcome/i, 'Android path states its dynamic-testing limitation')
  assert.deepEqual(wireless.phases.flatMap(phase => phase.modules), wireless.modules, 'path phases enumerate the same modules once')

  assert.equal(LABS.length, 29, 'wireless labs and nine source-case labs are retained')
  assert.equal(AVAILABLE_LABS.length, 28, 'only available labs enter learner progress')
  assert.equal(AVAILABLE_LABS.filter(lab => lab.grading === 'answer-checked').length, 3, 'answer-checked Practice scope is explicit')
  assert.ok(LABS.every(lab => moduleIds.has(lab.module)), 'every lab belongs to a shipped module')
  const inventory = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'src/content/lab-artifacts.json'), 'utf8')).artifacts
  for (const lab of AVAILABLE_LABS) {
    if (lab.pcap) assert.ok(inventory[lab.pcap], `${lab.id} references an available capture`)
  }
  assert.equal(LABS.find(lab => lab.id === 'lab-20-final')?.pcap, 'capstone-baseline', 'final lab is not recycled module 19 capture')
  assert.ok(inventory['capstone-retest'], 'staged post-change capture is available')
  assert.equal(challenges.find(challenge => challenge.id === 'chal-15-engagement')?.artifacts[0], 'capstone-baseline.pcapng', 'final challenge uses independent case')

  assert.equal(challenges.length, 22)
  assert.equal(challenges.reduce((sum, challenge) => sum + challenge.tasks.length, 0), 66)
  assert.ok(challenges.every(challenge => pathIds.has(challenge.learningPathId)), 'every challenge retains path ownership')
  assert.ok(challenges.every(challenge => moduleIds.has(challenge.module)), 'every challenge points to a surviving module')
  assert.ok(scenarios.every(scenario => moduleIds.has(scenario.module)), 'every scenario belongs to a shipped module')
  assert.ok(fs.existsSync(path.join(frontendRoot, 'public/android-foundations/SHA256SUMS')), 'Android text pack has an integrity manifest')
  assert.ok(fs.existsSync(path.join(frontendRoot, 'public/android-demos/notes-boundary-source.zip')), 'Android owned demo source archive is published')
  assert.ok(!fs.existsSync(path.join(frontendRoot, 'public/android-demos/notes-boundary.apk')), 'no unverified APK is presented as runnable')
  const sourceCases = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'src/content/androidCases.json'), 'utf8')).cases
  const publishedCases = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'public/android-cases/cases.json'), 'utf8')).cases
  assert.deepEqual(sourceCases, publishedCases, 'downloadable case pack and interactive case answers match')
  assert.deepEqual(sourceCases.map(item => item.id), android.modules.slice(3), 'each advanced Android module has its own case')
  assert.ok(sourceCases.every(item => item.questions.length === 3 && item.feedback.length === 3), 'every case has three prompts and feedback')
  assert.deepEqual(AVAILABLE_LABS.filter(lab => lab.learningPathId === android.id).map(lab => lab.id), sourceCases.map(item => `lab-${item.id}`), 'nine Android self-review labs resolve to cases')
  assert.ok(AVAILABLE_LABS.filter(lab => lab.learningPathId === android.id).every(lab => lab.grading === 'self-review' && !lab.pcap), 'Android labs do not impersonate capture or device grading')
  const rsnDecode = scenarios.find(scenario => scenario.id === 'scn-03-rsn-decode')
  assert.equal(rsnDecode?.situation, 'RSNE (element 48), hex: 30 18 01 00 00 0f ac 04 01 00 00 0f ac 04 02 00 00 0f ac 02 00 0f ac 08 80 00', 'the transition-mode scenario has a correctly sized RSNE with MFPC set')
  assert.ok(rsnDecode?.model_answer.includes('0x0080') && rsnDecode.model_answer.includes('MFPC (bit 7)') && rsnDecode.model_answer.includes('MFPR (bit 6)'), 'the RSN capability interpretation uses the correct bit positions')
  const pmfBits = scenarios.find(scenario => scenario.id === 'scn-03-pmf-bits')
  assert.ok(pmfBits?.options.some(option => option.analysis.includes('bit 6 (0x0040)') && option.analysis.includes('bit 7 (0x0080)')), 'the PMF explanation uses IEEE 802.11 RSN capability bit positions')

  console.log(`Learning-data contract passed: ${modules.length} modules, ${lessonCount} lessons, ${Object.keys(quizzes).length} quizzes/${totalQuestions} questions, ${LABS.length} labs (${AVAILABLE_LABS.length} available; 3 answer-checked), ${challenges.length} challenges/66 self-review tasks, ${scenarios.length} scenarios.`)
} finally {
  await server.close()
}
