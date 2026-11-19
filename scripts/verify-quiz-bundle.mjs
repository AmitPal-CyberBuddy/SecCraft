#!/usr/bin/env node
/** Ensure protected quiz prompts and solution fingerprints never enter a frontend build. */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('frontend/dist')
if (!fs.existsSync(root)) throw new Error('frontend/dist is missing; build the frontend first')
const bundleFiles = walk(root).filter(file => /\.(?:js|json|html|css|svg|txt|xml|webmanifest)$/.test(file))
if (!bundleFiles.length) throw new Error('frontend build contains no searchable application assets')
const bundle = bundleFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n')
const banks = JSON.parse(fs.readFileSync('frontend/src/content/quizzes.json', 'utf8'))
const fingerprints = []
for (const [moduleId, questions] of Object.entries(banks)) {
  for (const question of questions) {
    if (question.question?.length > 40) fingerprints.push([`prompt ${moduleId}/${question.id}`, question.question])
    if (question.explanation?.length > 30) fingerprints.push([`solution ${moduleId}/${question.id}`, question.explanation])
    const answer = question.options?.[question.correct]
    if (answer?.length > 60) fingerprints.push([`answer ${moduleId}/${question.id}`, answer])
  }
}
const leaks = fingerprints.filter(([, text]) => bundle.includes(text))
if (leaks.length) {
  throw new Error(`protected quiz material found in frontend assets:\n${leaks.slice(0, 20).map(([label, text]) => `${label}: ${text.slice(0, 120)}`).join('\n')}`)
}
console.log(`Quiz bundle audit passed: ${bundleFiles.length} built assets; ${fingerprints.length} prompts, solutions, and answer fingerprints absent.`)

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}
