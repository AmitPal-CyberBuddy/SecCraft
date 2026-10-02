#!/usr/bin/env node
/** Report protected-content exposure. P3.1 defaults to report-only; --enforce is reserved for the P3.5 contract gate. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXCLUDED_PARTS = new Set(['.git', 'node_modules', 'build', 'coverage', '.vite'])
const FIXTURE_ROOT = path.join(ROOT, 'content/fixtures')
const MARKER = /SC-PRIVATE:(lesson|lab|prompt|key|solution|verification|instructor|artifact):[a-z0-9-]+/g
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.ts', '.tsx', '.js', '.mjs', '.py', '.txt', '.csv', '.yaml', '.yml'])
const ARTIFACT_EXTENSIONS = new Set(['.pcap', '.pcapng', '.cap', '.apk', '.zip', '.tar', '.gz', '.bin', '.sqlite', '.db'])

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_PARTS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (full.startsWith(FIXTURE_ROOT)) continue
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

export function scan(root = ROOT) {
  const findings = []
  const add = (file, category, reason, marker = null) => findings.push({ file: path.relative(root, file).replaceAll(path.sep, '/'), category, reason, ...(marker ? { marker } : {}) })
  for (const file of walk(root)) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/')
    // The application/test fallback database is an ignored runtime product, never authored content.
    if (rel === 'backend/seccraft.db' || rel === 'backend/wififorge.db') continue
    const ext = path.extname(file).toLowerCase()
    if (TEXT_EXTENSIONS.has(ext)) {
      const text = fs.readFileSync(file, 'utf8')
      for (const match of text.matchAll(MARKER)) add(file, match[1], 'protected-content canary marker', match[0])
    }
    if (/^frontend\/src\/content\/lessons\/.*\.md$/.test(rel)) add(file, 'lesson', 'lesson body in frontend source')
    if (/^frontend\/src\/content\/(quizData\.ts|quizzes\.json|challenges\.json|scenarios\.json|androidCases\.json)$/.test(rel)) {
      add(file, 'prompt', 'answer-bearing practice prompts in frontend source')
      add(file, 'key', 'answer/key-bearing practice data in frontend source')
      add(file, 'solution', 'feedback, rationale, or solution material in frontend source')
    }
    if (/^frontend\/src\/content\/labs\.ts$/.test(rel)) add(file, 'lab', 'lab instructions in frontend source')
    if (/(^|\/)(instructors?|teacher)(\/|$)|(^|\/)(answer[_-]?key|solutions?)([._/-]|$)/i.test(rel)) add(file, 'instructor', 'instructor or answer-shaped path')
    if (/^frontend\/public\/(pcaps|lab-data|wireless-practice|wireless-foundations|android-[^/]+)\//.test(rel) || ARTIFACT_EXTENSIONS.has(ext)) add(file, 'artifact', 'public lab/artifact material')
    if (/^protected-content\/verification\//.test(rel)) add(file, 'verification', 'private verification material in source tree')
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.category.localeCompare(b.category))
}

export function report(findings, { enforce = false } = {}) {
  const counts = Object.fromEntries(['lesson', 'lab', 'prompt', 'key', 'solution', 'verification', 'instructor', 'artifact'].map(category => [category, 0]))
  for (const finding of findings) counts[finding.category] = (counts[finding.category] ?? 0) + 1
  console.log(`Private-content exposure scan: ${findings.length} finding(s); mode=${enforce ? 'enforce' : 'report-only'}`)
  for (const [category, count] of Object.entries(counts).sort()) console.log(`  ${category}: ${count}`)
  for (const finding of findings) console.log(`  REPORT ${finding.category.padEnd(12)} ${finding.file} — ${finding.reason}`)
  if (enforce && findings.length) process.exitCode = 1
  else if (findings.length) console.log('Expected during P3.1: findings are reported but do not fail CI. Owner review is required before enforcement at P3.5.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) report(scan(), { enforce: process.argv.includes('--enforce') })
