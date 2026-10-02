import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { importPlan, paths, validateCatalogue, validateDocument, validateRelease } from '../../tools/content/contract.mjs'
import { scan } from '../verify-no-private-content.mjs'

const releaseFixture = path.join(paths.repoRoot, 'content/fixtures/synthetic-release.json')
const catalogueFixture = path.join(paths.repoRoot, 'content/fixtures/synthetic-catalogue.json')

function temporaryJson(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seccraft-contract-'))
  const file = path.join(dir, 'document.json')
  fs.writeFileSync(file, JSON.stringify(value))
  return file
}

test('synthetic authored release validates and import planning performs no writes', () => {
  const validated = validateRelease(releaseFixture)
  assert.equal(validated.valid, true)
  const planned = importPlan(releaseFixture)
  assert.equal(planned.valid, true)
  assert.equal(planned.plan.mode, 'dry-run')
  assert.equal(planned.plan.databaseWrites, false)
  assert.deepEqual(planned.plan.counts, { paths: 1, modules: 1, lessons: 1, labs: 1, items: 2, artifacts: 1 })
})

test('practice and verification grading cannot be crossed', () => {
  const release = JSON.parse(fs.readFileSync(releaseFixture))
  release.items[0].grading = 'verified'
  const result = validateRelease(temporaryJson(release))
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /must be equal to constant/)
})

test('cross-record references reject an unknown artifact', () => {
  const release = JSON.parse(fs.readFileSync(releaseFixture))
  release.labs[0].artifactIds = ['missing-artifact']
  const result = validateRelease(temporaryJson(release), { verifyArtifacts: false })
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /unknown artifact/)
})

test('records cannot refer to a module owned by another path', () => {
  const release = JSON.parse(fs.readFileSync(releaseFixture))
  release.paths.push({ id: 'other-path', title: 'Other synthetic path', maturity: 'preview', moduleIds: [] })
  release.lessons[0].pathId = 'other-path'
  const result = validateRelease(temporaryJson(release), { verifyArtifacts: false })
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /does not belong to path/)
})

test('artifact size and digest are checked before an import can be planned', () => {
  const release = JSON.parse(fs.readFileSync(releaseFixture))
  release.artifacts[0].sha256 = '0'.repeat(64)
  const result = validateRelease(temporaryJson(release), { artifactRoot: path.dirname(releaseFixture) })
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /digest mismatch/)
})

test('each live catalogue path has exactly one public sample lesson', () => {
  const catalogue = JSON.parse(fs.readFileSync(catalogueFixture))
  catalogue.paths[0].modules[0].lessons[0].publicSample = false
  const result = validateCatalogue(temporaryJson(catalogue))
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /expected 1 public sample lesson/)
})

test('public catalogue schema rejects private body and key fields', () => {
  const catalogue = JSON.parse(fs.readFileSync(catalogueFixture))
  catalogue.paths[0].modules[0].body = 'must not be public'
  catalogue.paths[0].modules[0].privateKey = 'must not be public'
  const result = validateDocument(paths.catalogueSchema, temporaryJson(catalogue))
  assert.equal(result.valid, false)
  assert.match(JSON.stringify(result.errors), /additional properties/)
})

test('leak scanner covers every protected class and report-only findings are expected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seccraft-leaks-'))
  const publicDir = path.join(root, 'frontend/public')
  fs.mkdirSync(publicDir, { recursive: true })
  const classes = ['lesson', 'lab', 'prompt', 'key', 'solution', 'verification', 'instructor', 'artifact']
  fs.writeFileSync(path.join(publicDir, 'leaks.txt'), classes.map(kind => `SC-PRIVATE:${kind}:synthetic-${kind}`).join('\n'))
  const findings = scan(root)
  assert.deepEqual(new Set(findings.map(item => item.category)), new Set(classes))
  assert.ok(findings.length > 0, 'P3.1 expects findings and must keep reporting them')
})
