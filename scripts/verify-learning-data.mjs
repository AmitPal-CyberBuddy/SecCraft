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

  assert.equal(modules.length, 20, 'the shipped wireless path has 20 modules')
  assert.equal(new Set(moduleIds).size, modules.length, 'module ids are unique')

  for (const module of modules) {
    assert.ok(pathIds.has(module.learningPathId), `${module.id} has a valid learning path`)
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

  assert.equal(lessonCount, 27, 'all 27 referenced lessons are present')
  assert.equal(lessonKeys.size, lessonCount)
  assert.equal(Object.keys(quizzes).length, 17, 'quizzes are authored only where implemented')
  const totalQuestions = Object.values(quizzes).reduce((sum, list) => sum + list.length, 0)
  assert.equal(totalQuestions, 85, 'every implemented quiz question is accounted for')
  assert.deepEqual(modules.filter(module => !Object.hasOwn(quizzes, module.id)).map(module => module.id), [
    '01-intro-wireless', '03-80211-architecture', '04-kali-wireless-setup',
  ], 'modules without authored quizzes stay explicit rather than showing empty quiz tabs')
  assert.ok(quizzes['20-final-assessment']?.length, 'the final-assessment module has an authored knowledge check')

  assert.equal(LABS.length, 20, 'planned and available lab catalogue entries are retained')
  assert.equal(AVAILABLE_LABS.length, 19, 'only available labs enter learner progress')
  assert.equal(AVAILABLE_LABS.filter(lab => lab.grading === 'verified').length, 3, 'machine-checked grading scope is explicit')
  assert.ok(LABS.every(lab => moduleIds.has(lab.module)), 'every lab belongs to a shipped module')
  assert.equal(challenges.length, 15)
  assert.equal(challenges.reduce((sum, challenge) => sum + challenge.tasks.length, 0), 45)
  assert.ok(challenges.every(challenge => pathIds.has(challenge.learningPathId)), 'every challenge retains path ownership')
  assert.ok(scenarios.every(scenario => moduleIds.has(scenario.module)), 'every scenario belongs to a shipped module')
  const rsnDecode = scenarios.find(scenario => scenario.id === 'scn-03-rsn-decode')
  assert.equal(rsnDecode?.situation, 'RSNE (element 48), hex: 30 18 01 00 00 0f ac 04 01 00 00 0f ac 04 02 00 00 0f ac 02 00 0f ac 08 80 00', 'the transition-mode scenario has a correctly sized RSNE with MFPC set')
  assert.ok(rsnDecode?.model_answer.includes('0x0080') && rsnDecode.model_answer.includes('MFPC (bit 7)') && rsnDecode.model_answer.includes('MFPR (bit 6)'), 'the RSN capability interpretation uses the correct bit positions')
  const pmfBits = scenarios.find(scenario => scenario.id === 'scn-03-pmf-bits')
  assert.ok(pmfBits?.options.some(option => option.analysis.includes('bit 6 (0x0040)') && option.analysis.includes('bit 7 (0x0080)')), 'the PMF explanation uses IEEE 802.11 RSN capability bit positions')

  console.log(`Learning-data contract passed: ${modules.length} modules, ${lessonCount} lessons, ${Object.keys(quizzes).length} quizzes/${totalQuestions} questions, ${LABS.length} labs (${AVAILABLE_LABS.length} available; 3 answer-checked), ${challenges.length} challenges/45 self-review tasks, ${scenarios.length} scenarios.`)
} finally {
  await server.close()
}
