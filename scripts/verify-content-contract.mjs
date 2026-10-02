#!/usr/bin/env node
import path from 'node:path'
import { paths, validateCatalogue, validateMigrationManifest, validateRelease, formatErrors } from '../tools/content/contract.mjs'

const cases = [
  ['authored release', validateRelease(path.join(paths.repoRoot, 'content/fixtures/synthetic-release.json'))],
  ['public catalogue', validateCatalogue(path.join(paths.repoRoot, 'content/fixtures/synthetic-catalogue.json'))],
  ['dry-run migration manifest', validateMigrationManifest()],
]
let failed = false
for (const [name, result] of cases) {
  if (!result.valid) {
    failed = true
    console.error(`${name} invalid:\n${formatErrors(result.errors)}`)
  } else console.log(`${name}: schema valid`)
}
if (failed) process.exitCode = 1
