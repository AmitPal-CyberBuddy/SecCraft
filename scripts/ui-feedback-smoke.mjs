// Real-browser forms and history with safe API fixtures, never a live account or message.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules = process.env.UI_AUDIT_MODULES
const { chromium } = await import(modules ? pathToFileURL(resolve(modules, 'playwright/index.mjs')).href : 'playwright')
const output = resolve(process.env.UI_AUDIT_OUTPUT || '.cache/ui-audit')
fs.mkdirSync(output, { recursive: true })
const base = process.env.UI_AUDIT_URL || 'http://localhost:3000'
const browser = await chromium.launch({ executablePath: process.env.UI_AUDIT_EXECUTABLE || undefined, args: ['--no-sandbox'], headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' })
const submissions = []
let result = 503
await page.route('**/api/**', route => {
  if (route.request().url().endsWith('/api/v1/feedback')) {
    submissions.push(route.request().postDataJSON())
    return route.fulfill({ status: result, headers: { 'Retry-After': '1' }, contentType: 'application/json', body: JSON.stringify(result === 201 ? { saved: true, reference: 99 } : { detail: 'Test service unavailable. Keep your message.' }) })
  }
  return route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Offline QA fixture"}' })
})
try {
  await page.goto(base + '/feedback?page=/labs', { waitUntil: 'networkidle' })
  await page.getByLabel('Subject', { exact: true }).fill('A lab correction')
  await page.getByLabel('Message', { exact: true }).fill('Please clarify this lab exercise. This is a QA fixture.')
  assert.equal(await page.getByLabel('Page or module path (optional)').inputValue(), '/labs')
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await page.getByRole('alert').waitFor()
  result = 429
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await page.getByText(/Try again in/).waitFor()
  assert.ok(await page.getByRole('button', { name: 'Send feedback', exact: true }).isDisabled())
  await page.reload({ waitUntil: 'networkidle' })
  assert.match(await page.getByLabel('Message', { exact: true }).inputValue(), /clarify/)
  result = 201
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await page.getByText('Feedback saved · reference #99').waitFor()
  assert.equal(submissions.length, 3)
  assert.equal(new Set(submissions.map(item => item.request_id)).size, 1)
  await page.screenshot({ path: output + '/feedback-success-mobile.png', fullPage: true })

  await page.goto(base + '/app', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
  await page.locator('#primary-navigation a[href="/reports"]').click()
  await page.locator('#finding-title').waitFor()
  let release
  const pending = new Promise(resolve => { release = resolve })
  await page.route('**/lab-data/beacon-only.json', async route => {
    await pending
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ frames: [{ number: 1, bssid: '00:00:00:00:00:00' }] }) })
  })
  await page.getByRole('button', { name: 'Load worked example (lab data)', exact: true }).click()
  await page.locator('#finding-title').fill('Preserve my concurrent edit')
  release()
  await page.getByText(/not applied because you edited/).waitFor()
  let confirmations = 0
  page.on('dialog', async dialog => { confirmations++; await dialog.dismiss() })
  await page.goBack()
  await page.waitForURL('**/reports')
  assert.equal(await page.locator('#finding-title').inputValue(), 'Preserve my concurrent edit')
  assert.ok(confirmations > 0, 'history navigation must ask before losing the draft')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.goBack()
  await page.waitForURL('**/app')

  await page.goto(base + '/settings', { waitUntil: 'networkidle' })
  const reduced = page.getByRole('button', { name: /^Reduce Motion/ })
  await reduced.click()
  assert.equal(await reduced.getAttribute('aria-pressed'), 'true')
  assert.equal(await page.evaluate(async () => (await import('/src/lib/motion.ts')).scrollBehavior()), 'instant')
  await page.reload({ waitUntil: 'networkidle' })
  assert.ok(await page.locator('html').evaluate(el => el.classList.contains('reduce-motion')))
  console.log('PASS: feedback failure/429/reload/retry receipt; example-load race; history guard cancellation and saved exit; persistent local reduced motion.')
} catch (error) {
  await page.screenshot({ path: output + '/feedback-reliability-failure.png', fullPage: true }).catch(() => {})
  throw error
} finally { await browser.close() }
