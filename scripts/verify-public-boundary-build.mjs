#!/usr/bin/env node
/** Enforcing audit for CONTENT_BOUNDARY_BUILD=1 output only. */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('frontend/dist')
if (!fs.existsSync(root)) throw new Error('frontend/dist is missing; run the boundary build first')
const files = walk(root)
const allowedTop = new Set(['index.html', '404.html', '.nojekyll', '_headers', 'robots.txt', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.json', 'sw.js'])
const approvedSamples = new Set(['README.md', 'authorized-inventory.csv', 'scope.md', 'worksheet.md'].map(name => `wireless-foundations/WF-FND-01/${name}`))
const unexpected = files.map(file => rel(file)).filter(name => !name.startsWith('assets/') && !allowedTop.has(name) && !approvedSamples.has(name))
if (unexpected.length) throw new Error(`unapproved public build files:\n${unexpected.join('\n')}`)

const searchable = files.filter(file => /\.(?:js|json|html|md|txt|csv)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n')
const fingerprints = []
const quizzes = json('frontend/src/content/quizzes.json')
for (const questions of Object.values(quizzes)) for (const item of questions) if (item.explanation?.length > 30) fingerprints.push(['quiz solution', item.explanation])
for (const challenge of json('frontend/src/content/challenges.json')) for (const task of challenge.tasks ?? []) if (task.answer?.length > 20) fingerprints.push(['challenge answer', task.answer])
for (const scenario of json('frontend/src/content/scenarios.json')) for (const option of scenario.options ?? []) if (option.analysis?.length > 30) fingerprints.push(['scenario solution', option.analysis])
for (const item of json('frontend/src/content/androidCases.json').cases ?? []) for (const feedback of item.feedback ?? []) if (feedback.length > 30) fingerprints.push(['Android solution', feedback])
const instructor = fs.readFileSync('docs/instructors/ENG-01_answer_key.md', 'utf8').split('\n').find(line => line.length > 60 && !line.startsWith('#'))
if (instructor) fingerprints.push(['instructor key', instructor])
const leaks = fingerprints.filter(([, value]) => searchable.includes(value)).slice(0, 20)
if (leaks.length) throw new Error(`protected content fingerprints in public build:\n${leaks.map(([kind, value]) => `${kind}: ${value.slice(0, 100)}`).join('\n')}`)
if (/postgres(?:ql)?(?:\+psycopg)?:\/\/[^\s"']+:[^\s"']+@/i.test(searchable) || /SUPABASE_SERVICE_ROLE_KEY|CONTENT_(?:MIGRATION|BACKUP)_DATABASE_URL/.test(searchable)) {
  throw new Error('database or backend-only credential material found in public build')
}
for (const token of searchable.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
  try {
    const payload = JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url').toString('utf8'))
    if (payload.role === 'service_role') throw new Error('Supabase service-role token found in public build')
  } catch (error) {
    if (error.message.includes('service-role')) throw error
  }
}
console.log(`Public boundary build passed: ${files.length} files; exactly four Wireless sample files; 0 protected fingerprints; 0 backend credentials; 0 unapproved artifacts.`)

function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }
function rel(file) { return path.relative(root, file).split(path.sep).join('/') }
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) }
