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

export function validateRelease(documentFile) {
  const result = validateDocument(paths.releaseSchema, documentFile)
  if (!result.valid) return result
  const { paths: releases, lessons, labs, items, artifacts } = result.document
  const pathIds = new Set(releases.map(item => item.id))
  const moduleIds = new Set(releases.flatMap(item => item.moduleIds))
  const artifactIds = new Set(artifacts.map(item => item.id))
  const ids = [...releases, ...lessons, ...labs, ...items, ...artifacts].map(item => item.id)
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  const errors = []
  if (duplicate) errors.push({ instancePath: '', message: `duplicate release-wide id: ${duplicate}` })
  for (const record of [...lessons, ...labs, ...items]) {
    if (!pathIds.has(record.pathId)) errors.push({ instancePath: `/${record.id}/pathId`, message: `unknown path ${record.pathId}` })
    if (!moduleIds.has(record.moduleId)) errors.push({ instancePath: `/${record.id}/moduleId`, message: `unknown module ${record.moduleId}` })
  }
  for (const lab of labs) for (const id of lab.artifactIds) {
    if (!artifactIds.has(id)) errors.push({ instancePath: `/${lab.id}/artifactIds`, message: `unknown artifact ${id}` })
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
      counts: Object.fromEntries(['paths', 'lessons', 'labs', 'items', 'artifacts'].map(key => [key, release[key].length])),
      operations: [
        'validate schema and cross-record references',
        'stage an immutable release (P3.2+; not implemented)',
        'verify artifact hashes (P3.2+; not implemented)',
        'activate the staged release transactionally (P3.2+; not implemented)',
      ],
    },
  }
}

export function formatErrors(errors) {
  return errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('\n')
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
