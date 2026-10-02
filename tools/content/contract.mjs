import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(repoRoot, 'frontend/package.json'))
const Ajv2020 = require('ajv/dist/2020').default

export const paths = {
  repoRoot,
  releaseSchema: path.join(repoRoot, 'content/schemas/content-release.schema.json'),
  catalogueSchema: path.join(repoRoot, 'content/schemas/public-catalogue.schema.json'),
  migrationSchema: path.join(repoRoot, 'content/schemas/content-migration-manifest.schema.json'),
  migrationManifest: path.join(repoRoot, 'content/migration/CONTENT_MIGRATION_MANIFEST.json'),
}

export function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function validateDocument(schemaFile, documentFile) {
  const schema = loadJson(schemaFile)
  const document = loadJson(documentFile)
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validate = ajv.compile(schema)
  const valid = validate(document)
  return { valid, document, errors: validate.errors ?? [] }
}

function error(instancePath, message) {
  return { instancePath, message }
}

export function validateCatalogue(documentFile) {
  const result = validateDocument(paths.catalogueSchema, documentFile)
  if (!result.valid) return result
  const errors = []
  const seenIds = new Set()
  const seenSlugs = new Set()
  for (const cataloguePath of result.document.paths) {
    if (seenIds.has(cataloguePath.id)) errors.push(error(`/paths/${cataloguePath.id}`, `duplicate path id: ${cataloguePath.id}`))
    if (seenSlugs.has(cataloguePath.slug)) errors.push(error(`/paths/${cataloguePath.id}/slug`, `duplicate path slug: ${cataloguePath.slug}`))
    seenIds.add(cataloguePath.id)
    seenSlugs.add(cataloguePath.slug)
    const sampleCount = cataloguePath.modules.flatMap(module => module.lessons).filter(lesson => lesson.publicSample).length
    const expected = cataloguePath.maturity === 'coming-soon' ? 0 : 1
    if (sampleCount !== expected) errors.push(error(`/paths/${cataloguePath.id}`, `expected ${expected} public sample lesson(s), found ${sampleCount}`))
  }
  return { ...result, valid: errors.length === 0, errors }
}

export function validateMigrationManifest(documentFile = paths.migrationManifest) {
  const result = validateDocument(paths.migrationSchema, documentFile)
  if (!result.valid) return result
  const manifest = result.document
  const errors = []
  const entryIds = new Set()
  const stableIds = new Set()
  for (const entry of manifest.entries) {
    if (entryIds.has(entry.id)) errors.push(error(`/entries/${entry.id}`, `duplicate entry id ${entry.id}`))
    entryIds.add(entry.id)
    const stableId = [entry.learningPath, entry.module, entry.contentType, entry.contentId].join(':')
    if (stableIds.has(stableId)) errors.push(error(`/entries/${entry.id}`, `duplicate stable content identity ${stableId}`))
    stableIds.add(stableId)
    const source = path.join(repoRoot, entry.sourcePath)
    if (!fs.existsSync(source)) errors.push(error(`/entries/${entry.id}/sourcePath`, `source does not exist: ${entry.sourcePath}`))
    if (entry.publicAccess !== (entry.classification === 'KEEP_PUBLIC')) errors.push(error(`/entries/${entry.id}/publicAccess`, 'publicAccess must match KEEP_PUBLIC classification'))
    if ((entry.deliveryClass === 'public') !== entry.publicAccess) errors.push(error(`/entries/${entry.id}/deliveryClass`, 'public delivery class must match publicAccess'))
    if (entry.classification === 'REVIEW_CLASSIFY') errors.push(error(`/entries/${entry.id}/classification`, 'owner decisions are complete; unresolved classification is forbidden'))
    if (entry.release !== manifest.release) errors.push(error(`/entries/${entry.id}/release`, `expected release ${manifest.release}`))
    if (entry.artifact && fs.existsSync(source)) {
      const bytes = fs.readFileSync(source)
      const digest = crypto.createHash('sha256').update(bytes).digest('hex')
      if (entry.artifact.size !== bytes.length) errors.push(error(`/entries/${entry.id}/artifact/size`, 'artifact size no longer matches source'))
      if (entry.artifact.sha256 !== digest) errors.push(error(`/entries/${entry.id}/artifact/sha256`, 'artifact digest no longer matches source'))
    }
  }
  for (const finding of manifest.leakAuditBaseline.findings) {
    if (!entryIds.has(finding.migrationEntryId)) errors.push(error(`/leakAuditBaseline/${finding.id}`, `unknown migration entry ${finding.migrationEntryId}`))
  }
  const classified = Object.fromEntries(['KEEP_PUBLIC', 'MOVE_TO_PROTECTED_CONTENT', 'REVIEW_CLASSIFY'].map(kind => [kind, manifest.entries.filter(entry => entry.classification === kind).length]))
  if (JSON.stringify(classified) !== JSON.stringify(manifest.summary.byClassification)) errors.push(error('/summary/byClassification', 'classification counts do not match entries'))
  if (manifest.summary.entries !== manifest.entries.length) errors.push(error('/summary/entries', 'entry count does not match entries'))
  if (manifest.summary.findings !== manifest.leakAuditBaseline.findings.length) errors.push(error('/summary/findings', 'finding count does not match baseline'))
  if (manifest.summary.findings !== 317) errors.push(error('/summary/findings', `expected approved post-build baseline of 317, found ${manifest.summary.findings}`))
  return { ...result, valid: errors.length === 0, errors }
}

export function validateRelease(documentFile, { artifactRoot = path.dirname(documentFile), verifyArtifacts = true } = {}) {
  const result = validateDocument(paths.releaseSchema, documentFile)
  if (!result.valid) return result

  const release = result.document
  const pathById = new Map(release.paths.map(record => [record.id, record]))
  const moduleById = new Map(release.modules.map(record => [record.id, record]))
  const artifactIds = new Set(release.artifacts.map(record => record.id))
  const records = [...release.paths, ...release.modules, ...release.lessons, ...release.labs, ...release.items, ...release.artifacts]
  const seenIds = new Set()
  const errors = []

  for (const record of records) {
    if (seenIds.has(record.id)) errors.push(error(`/${record.id}`, `duplicate release-wide id: ${record.id}`))
    seenIds.add(record.id)
  }

  for (const module of release.modules) {
    const owner = pathById.get(module.pathId)
    if (!owner) errors.push(error(`/modules/${module.id}/pathId`, `unknown path ${module.pathId}`))
    else if (!owner.moduleIds.includes(module.id)) errors.push(error(`/modules/${module.id}`, `module is absent from path ${owner.id} moduleIds`))
  }
  for (const authoredPath of release.paths) {
    for (const moduleId of authoredPath.moduleIds) {
      const module = moduleById.get(moduleId)
      if (!module) errors.push(error(`/paths/${authoredPath.id}/moduleIds`, `unknown module ${moduleId}`))
      else if (module.pathId !== authoredPath.id) errors.push(error(`/paths/${authoredPath.id}/moduleIds`, `module ${moduleId} belongs to path ${module.pathId}`))
    }
  }
  for (const record of [...release.lessons, ...release.labs, ...release.items]) {
    if (!pathById.has(record.pathId)) errors.push(error(`/${record.id}/pathId`, `unknown path ${record.pathId}`))
    const module = moduleById.get(record.moduleId)
    if (!module) errors.push(error(`/${record.id}/moduleId`, `unknown module ${record.moduleId}`))
    else if (module.pathId !== record.pathId) errors.push(error(`/${record.id}/moduleId`, `module ${record.moduleId} does not belong to path ${record.pathId}`))
  }
  for (const lab of release.labs) {
    for (const artifactId of lab.artifactIds) {
      if (!artifactIds.has(artifactId)) errors.push(error(`/labs/${lab.id}/artifactIds`, `unknown artifact ${artifactId}`))
    }
  }

  if (verifyArtifacts) {
    for (const artifact of release.artifacts) {
      const file = path.join(artifactRoot, artifact.filename)
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        errors.push(error(`/artifacts/${artifact.id}/filename`, `artifact file not found: ${artifact.filename}`))
        continue
      }
      const bytes = fs.readFileSync(file)
      if (bytes.length !== artifact.size) errors.push(error(`/artifacts/${artifact.id}/size`, `expected ${artifact.size} bytes, found ${bytes.length}`))
      const digest = crypto.createHash('sha256').update(bytes).digest('hex')
      if (digest !== artifact.sha256) errors.push(error(`/artifacts/${artifact.id}/sha256`, `digest mismatch for ${artifact.filename}`))
    }
  }

  return { ...result, valid: errors.length === 0, errors }
}

export function importPlan(documentFile) {
  const result = validateRelease(documentFile)
  if (!result.valid) return result
  const release = result.document
  return {
    valid: true,
    document: release,
    errors: [],
    plan: {
      mode: 'dry-run',
      databaseWrites: false,
      releaseId: release.releaseId,
      synthetic: release.synthetic,
      counts: Object.fromEntries(['paths', 'modules', 'lessons', 'labs', 'items', 'artifacts'].map(key => [key, release[key].length])),
      operations: [
        'validate schema, ownership, references, and artifact integrity',
        'stage an immutable release (P3.2+; not implemented)',
        'upload private artifacts (P3.2+; not implemented)',
        'activate the staged release transactionally (P3.2+; not implemented)',
      ],
    },
  }
}

export function formatErrors(errors) {
  return errors.map(item => `${item.instancePath || '/'} ${item.message}`).join('\n')
}

export async function runCli(argv = process.argv.slice(2)) {
  const [command, suppliedFile] = argv
  const file = suppliedFile ? path.resolve(suppliedFile) : path.join(repoRoot, 'content/fixtures/synthetic-release.json')
  if (!['validate', 'plan'].includes(command)) throw new Error('usage: content-contract.mjs <validate|plan> [release.json]')
  const result = command === 'plan' ? importPlan(file) : validateRelease(file)
  if (!result.valid) {
    console.error(formatErrors(result.errors))
    process.exitCode = 1
    return
  }
  console.log(command === 'plan' ? JSON.stringify(result.plan, null, 2) : `valid content release: ${result.document.releaseId}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli()
