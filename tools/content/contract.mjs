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
