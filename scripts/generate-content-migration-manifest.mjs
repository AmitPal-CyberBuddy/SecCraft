#!/usr/bin/env node
/** Generate the P3.2 dry-run migration inventory. This script never connects to a database or network. */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scan } from './verify-no-private-content.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'content/migration/CONTENT_MIGRATION_MANIFEST.json')
const release = 'dry-run-2026-10-02-v1'
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
const normalize = value => value.split(path.sep).join('/')
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const stat = rel => {
  const file = path.join(root, rel)
  return { filename: path.basename(rel), mediaType: mediaType(rel), size: fs.statSync(file).size, sha256: digest(file) }
}
const mediaType = rel => ({ '.md': 'text/markdown', '.json': 'application/json', '.csv': 'text/csv', '.pcap': 'application/vnd.tcpdump.pcap', '.pcapng': 'application/vnd.tcpdump.pcap', '.zip': 'application/zip', '.xml': 'application/xml', '.kt': 'text/x-kotlin', '.java': 'text/x-java-source', '.js': 'text/javascript', '.py': 'text/x-python', '.conf': 'text/plain', '.txt': 'text/plain' }[path.extname(rel).toLowerCase()] ?? 'application/octet-stream')
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const learningPaths = readJson('frontend/src/content/learning-paths.json')
const modules = readJson('frontend/src/content/modules.json')
const moduleById = new Map(modules.map(item => [item.id, item]))
const pathByModule = new Map()
for (const learningPath of learningPaths) for (const moduleId of learningPath.modules ?? []) pathByModule.set(moduleId, learningPath.id)

const entries = []
function add({ sourcePath, contentType, classification, reason, learningPath = null, module = null, contentId = null, targetKind, target, artifact = false, careerPath = null, publicAccess = null, deliveryClass = null }) {
  const id = `migration-${String(entries.length + 1).padStart(4, '0')}`
  entries.push({
    id, sourcePath, contentType, careerPath, learningPath, module,
    contentId: contentId ?? slug(sourcePath),
    classification,
    deliveryClass: deliveryClass ?? (classification === 'KEEP_PUBLIC' ? 'public' : 'protected-learner'),
    publicAccess: publicAccess ?? classification === 'KEEP_PUBLIC',
    target: { kind: targetKind, locator: target },
    release,
    ...(artifact ? { artifact: stat(sourcePath) } : {}),
    classificationReason: reason,
  })
}

for (const sourcePath of ['frontend/src/content/learning-paths.json', 'frontend/src/content/modules.json', 'frontend/src/content/skills.json', 'frontend/src/content/achievements.ts', 'frontend/src/content/platform.json']) {
  add({ sourcePath, contentType: 'catalogue-metadata', classification: 'KEEP_PUBLIC', reason: 'Public discovery metadata; projection must remain schema-whitelisted and contain no lesson bodies, prompts, keys, or solutions.', targetKind: 'public-catalogue-projection', target: 'generated catalogue metadata' })
}
for (const sourcePath of ['frontend/src/content/reference/checklist.json', 'frontend/src/content/reference/commands.json', 'frontend/src/content/reference/filters.json']) {
  add({ sourcePath, contentType: 'public-resource', classification: 'KEEP_PUBLIC', reason: 'Intentionally public reference material; retain only after the boundary validator confirms it contains no answer or verification material.', targetKind: 'public-static-resource', target: sourcePath.replace('frontend/src/content/', 'reference/') })
}

const sampleLessons = new Set([
  '01-intro-wireless/02-scope-and-assessment-decisions',
  'android-01-platform/01-architecture-sandbox-and-trust-boundaries',
])
const lessonRoot = path.join(root, 'frontend/src/content/lessons')
for (const absolute of walk(lessonRoot).filter(file => file.endsWith('.md')).sort()) {
  const sourcePath = normalize(path.relative(root, absolute))
  const lessonKey = normalize(path.relative(lessonRoot, absolute)).replace(/\.md$/, '')
  const [module, lessonId] = lessonKey.split('/')
  const isSample = sampleLessons.has(lessonKey)
  add({ sourcePath, contentType: 'lesson-body', classification: isSample ? 'KEEP_PUBLIC' : 'MOVE_TO_PROTECTED_CONTENT', reason: isSample ? 'Owner-approved public sample lesson; public sample is an intentional publication, not an access tier.' : 'Full lesson body is learner content and must not be shipped in the public frontend bundle.', careerPath: 'cybersecurity', learningPath: pathByModule.get(module) ?? null, module, contentId: lessonId, targetKind: isSample ? 'public-sample-projection' : 'postgres-record', target: isSample ? `public-samples/${lessonKey}` : `content.lesson:${module}/${lessonId}` })
}

const protectedCollections = [
  ['frontend/src/content/labs.ts', 'lab-instructions', 'content.lab'],
  ['frontend/src/content/labs.json', 'lab-instructions', 'content.lab'],
  ['frontend/src/content/quizzes.json', 'practice-assessment', 'content.item'],
  ['frontend/src/content/quizData.ts', 'practice-assessment', 'content.item'],
  ['frontend/src/content/challenges.json', 'practice-and-solution', 'content.item'],
  ['frontend/src/content/scenarios.json', 'scenario-and-answer', 'content.item'],
  ['frontend/src/content/androidCases.json', 'scenario-and-solution', 'content.item'],
  ['frontend/src/content/engagements.json', 'scenario-instructions', 'content.item'],
  ['frontend/src/content/lab-artifacts.json', 'artifact-key-and-integrity-metadata', 'content.artifact'],
  ['docs/instructors/ENG-01_answer_key.md', 'instructor-answer-key', 'content.instructor_material'],
]
for (const [sourcePath, contentType, target] of protectedCollections) {
  if (!fs.existsSync(path.join(root, sourcePath))) continue
  const deliveryClass = sourcePath.includes('instructor') ? 'instructor-only' : ['labs.ts', 'labs.json', 'engagements.json'].some(name => sourcePath.endsWith(name)) ? 'protected-learner' : 'server-only'
  add({ sourcePath, contentType, classification: 'MOVE_TO_PROTECTED_CONTENT', deliveryClass, reason: 'File-level migration source contains mixed learner and restricted fields. Child records preserve logical IDs; raw mixed files are never returned to learners.', careerPath: 'cybersecurity', learningPath: sourcePath.includes('android') ? 'android-pentesting' : sourcePath.includes('instructor') ? 'wireless-pentesting' : null, targetKind: 'postgres-record', target })
}

function addProtectedRecord(sourcePath, contentType, record, module, target, reason) {
  const learningPath = record.learningPathId ?? pathByModule.get(module) ?? (sourcePath.includes('android') ? 'android-pentesting' : null)
  add({ sourcePath, contentType, classification: 'MOVE_TO_PROTECTED_CONTENT', reason, careerPath: 'cybersecurity', learningPath, module: module ?? null, contentId: record.id, targetKind: 'postgres-record', target: `${target}:${module ?? 'unmapped'}/${record.id}` })
}
for (const lab of readJson('frontend/src/content/labs.json').labs) addProtectedRecord('frontend/src/content/labs.json', 'lab-record', lab, lab.module, 'content.lab', 'Full lab instructions and grading semantics belong in authenticated learning delivery.')
for (const [module, questions] of Object.entries(readJson('frontend/src/content/quizzes.json'))) {
  for (const question of questions) addProtectedRecord('frontend/src/content/quizzes.json', 'practice-item', question, module, 'content.item', 'Prompt, options, answer, and explanation must be split into learner-visible and server-only fields; historical public practice cannot become verified evidence.')
}
for (const challenge of readJson('frontend/src/content/challenges.json')) addProtectedRecord('frontend/src/content/challenges.json', 'challenge-record', challenge, challenge.module, 'content.item', 'Challenge tasks include expected answers, hints, and solution material and require authenticated delivery/server-only grading fields.')
for (const scenario of readJson('frontend/src/content/scenarios.json')) addProtectedRecord('frontend/src/content/scenarios.json', 'scenario-record', scenario, scenario.module, 'content.item', 'Scenario choices include correctness and analysis; prompt delivery and answer material must be separated.')
for (const androidCase of readJson('frontend/src/content/androidCases.json').cases) addProtectedRecord('frontend/src/content/androidCases.json', 'android-case-record', androidCase, androidCase.id, 'content.item', 'Android case questions and feedback are learner-only practice; feedback/expected reasoning must not be public or treated as verified evidence.')

const approvedWirelessFiles = new Set([
  'frontend/public/wireless-foundations/WF-FND-01/README.md',
  'frontend/public/wireless-foundations/WF-FND-01/authorized-inventory.csv',
  'frontend/public/wireless-foundations/WF-FND-01/scope.md',
  'frontend/public/wireless-foundations/WF-FND-01/worksheet.md',
])
const auditArtifacts = scan(root).filter(item => item.category === 'artifact' && item.file.startsWith('frontend/public/'))
const artifactPaths = [...new Set(auditArtifacts.map(item => item.file))].sort()
for (const sourcePath of artifactPaths) {
  const approved = approvedWirelessFiles.has(sourcePath)
  const basename = path.basename(sourcePath)
  const artifactMeta = Object.entries(readJson('frontend/src/content/lab-artifacts.json').artifacts).find(([, value]) => path.basename(value.path) === basename)
  const module = sourcePath.includes('/wireless-foundations/WF-FND-01/') ? '01-intro-wireless' : null
  const serverOnly = /(?:self-review|reference-results|reference-review|answer|solution)/i.test(sourcePath) || /\.(?:zip|tar|gz)$/i.test(sourcePath)
  add({ sourcePath, contentType: 'artifact', classification: approved ? 'KEEP_PUBLIC' : 'MOVE_TO_PROTECTED_CONTENT', deliveryClass: approved ? 'public' : serverOnly ? 'server-only' : 'protected-learner', reason: approved ? 'One of exactly four owner-approved Wireless scope-exercise sample files.' : serverOnly ? 'Owner decision: protected supporting/answer-bearing material or mixed archive; never delivered directly as a learner artifact.' : 'Owner decision: protected learner artifact; accessible only to approved learners after FastAPI authorization.', careerPath: 'cybersecurity', learningPath: sourcePath.includes('/android-') ? 'android-pentesting' : 'wireless-pentesting', module: module ?? (artifactMeta ? null : null), contentId: slug(sourcePath), targetKind: approved ? 'public-sample-object' : 'supabase-storage-object', target: approved ? `public-samples/wireless/${basename}` : `protected-artifacts/${sourcePath.replace('frontend/public/', '')}`, artifact: true })
}

for (const sourcePath of walk(path.join(root, 'android-labs')).filter(file => fs.statSync(file).isFile()).map(file => normalize(path.relative(root, file))).sort()) {
  add({ sourcePath, contentType: 'lab-source-artifact', classification: 'MOVE_TO_PROTECTED_CONTENT', reason: 'Buildable lab source supports learner exercises and must be delivered only to authorized learners unless separately approved as a public resource.', careerPath: 'cybersecurity', learningPath: 'android-pentesting', module: 'android-04-components', contentId: slug(sourcePath), targetKind: 'supabase-storage-object', target: `protected-artifacts/${sourcePath}`, artifact: true })
}
for (const sourcePath of walk(path.join(root, 'content/configs')).filter(file => fs.statSync(file).isFile()).map(file => normalize(path.relative(root, file))).sort()) {
  add({ sourcePath, contentType: 'lab-config-artifact', classification: 'MOVE_TO_PROTECTED_CONTENT', deliveryClass: 'protected-learner', reason: 'Owner decision: labelled good/bad hostapd configuration is protected learner-only lab input.', careerPath: 'cybersecurity', learningPath: 'wireless-pentesting', targetKind: 'supabase-storage-object', target: `protected-artifacts/${sourcePath}`, artifact: true })
}

const entryBySource = new Map(entries.map(entry => [entry.sourcePath, entry]))
const findings = scan(root).map((finding, index) => {
  let sourcePath = finding.file
  if (sourcePath.startsWith('frontend/dist/')) sourcePath = `frontend/public/${sourcePath.slice('frontend/dist/'.length)}`
  const entry = entryBySource.get(sourcePath)
  return { id: `finding-${String(index + 1).padStart(4, '0')}`, ...finding, sourcePath, migrationEntryId: entry?.id ?? null, classification: entry?.classification ?? 'UNMAPPED', classificationReason: entry?.classificationReason ?? 'No migration entry matched; generator validation must fail.' }
})
const counts = values => Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(item => item === value).length]))
const manifest = {
  schemaVersion: 1,
  mode: 'dry-run',
  productionWrites: false,
  release,
  repositoryModel: 'single-existing-seccraft-repository',
  runtimeTargets: { structuredContent: 'Supabase PostgreSQL (future; no connection or write)', artifacts: 'Supabase Storage (future; no connection or write)', publicCatalogue: 'metadata-only projection', learningDelivery: 'authenticated backend API with server-side authorization' },
  approvedPublicSamples: {
    wirelessLesson: '01-intro-wireless/02-scope-and-assessment-decisions',
    wirelessFiles: [...approvedWirelessFiles].sort(),
    androidLesson: 'android-01-platform/01-architecture-sandbox-and-trust-boundaries',
  },
  summary: {
    entries: entries.length,
    byClassification: Object.fromEntries(['KEEP_PUBLIC', 'MOVE_TO_PROTECTED_CONTENT', 'REVIEW_CLASSIFY'].map(kind => [kind, entries.filter(item => item.classification === kind).length])),
    byDeliveryClass: Object.fromEntries(['public', 'protected-learner', 'server-only', 'instructor-only'].map(kind => [kind, entries.filter(item => item.deliveryClass === kind).length])),
    unresolvedClassifications: entries.filter(item => item.classification === 'REVIEW_CLASSIFY').length,
    findings: findings.length,
    findingsByClassification: Object.fromEntries(['KEEP_PUBLIC', 'MOVE_TO_PROTECTED_CONTENT', 'REVIEW_CLASSIFY'].map(kind => [kind, findings.filter(item => item.classification === kind).length])),
    unmappedFindings: findings.filter(item => !item.migrationEntryId).length,
  },
  entries,
  leakAuditBaseline: { target: 'Zero unintended protected-content exposure in public build/API; approved catalogue and samples remain legitimate.', findings },
  manualDecisions: entries.filter(item => item.classification === 'REVIEW_CLASSIFY').map(item => ({ migrationEntryId: item.id, sourcePath: item.sourcePath, question: 'Should this be intentionally public, an authenticated learner artifact, or server-only material?' })),
}
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify(manifest.summary, null, 2))
if (manifest.summary.unmappedFindings) process.exitCode = 1

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    // Verification scripts may compile fixture helpers in place. Runtime caches are not authored content.
    if (entry.name === '__pycache__' || entry.name === '.DS_Store' || entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo')) return []
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}
