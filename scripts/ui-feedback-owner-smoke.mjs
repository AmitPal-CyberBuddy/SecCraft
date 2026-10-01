// Owner UI fixture ONLY: identity module and API responses are intercepted in this browser.
// Real authorization is tested by backend contracts; this never grants live owner access.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules = process.env.UI_AUDIT_MODULES
const load = path => import(modules ? pathToFileURL(resolve(modules, path)).href : path)
const { chromium } = await load(modules ? 'playwright/index.mjs' : 'playwright')
const AxeBuilder = (await load(modules ? '@axe-core/playwright/dist/index.mjs' : '@axe-core/playwright')).default
const output = resolve(process.env.UI_AUDIT_OUTPUT || '.cache/ui-audit')
fs.mkdirSync(output, { recursive: true })
const base = process.env.UI_AUDIT_URL || 'http://localhost:3000'
const browser = await chromium.launch({ executablePath: process.env.UI_AUDIT_EXECUTABLE || undefined, args: ['--no-sandbox'], headless: true })
try {
  for (const theme of ['dark', 'light']) for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.addInitScript(theme => { try { localStorage.setItem('platform-theme', theme) } catch {} }, theme)
    await page.route('**/src/lib/session.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `
      export function SessionProvider({children}) { return children }
      export function useSession() { return { userState:'owner', ready:true, accountLoading:false,
        hasSession:true, account:{email:'owner@example.test'}, accountError:{kind:null},
        can:()=>true, signOut:async()=>{}, refreshAccount:async()=>{} } }
    ` }))
    let record = { id: 18, subject: 'A long feedback subject — ' + 'test '.repeat(20), category: 'bug', status: 'new', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '<img src=x onerror=alert(1)>\nPlease improve the lesson.', page_reference: '/labs', reply_email: 'very.long.reply.address.for.layout.review@example.test', user_id: null, internal_note: '', version: 1 }
    let failSave = true
    let saves = 0
    await page.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url())
      let status = 200, body
      if (request.method() === 'PATCH') {
        saves++
        if (failSave) { status = 409; body = { detail: 'Another review changed this entry. Reload it before saving.' } }
        else { record = { ...record, ...request.postDataJSON(), version: record.version + 1 }; body = record }
      } else if (url.pathname.endsWith('/admin/feedback/18')) body = record
      else if (url.pathname.endsWith('/admin/feedback')) body = { items: url.searchParams.get('status') === 'spam' ? [] : [record], next_cursor: null }
      else { status = 503; body = { detail: 'Offline test fixture' } }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    })
    try {
      await page.goto(base + '/admin/feedback', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /A long feedback subject/ }).click()
      await page.locator('.sc-feedback-message').waitFor()
      assert.equal(await page.locator('.sc-feedback-message img').count(), 0)
      await page.getByLabel('Internal note', { exact: true }).fill('Keep this internal note after a stale-save rejection.')
      await page.getByRole('button', { name: 'Save review', exact: true }).click()
      await page.getByRole('alert').waitFor()
      assert.match(await page.getByLabel('Internal note', { exact: true }).inputValue(), /Keep this/)
      failSave = false
      await page.getByRole('button', { name: 'Save review', exact: true }).click()
      await page.getByText(/Review saved\./).waitFor()
      assert.equal(saves, 2)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      fs.writeFileSync(`${output}/owner-feedback-${width}-${theme}.json`, JSON.stringify(scan.violations, null, 2))
      await page.screenshot({ path: `${output}/owner-feedback-${width}-${theme}.png`, fullPage: true })
      assert.deepEqual(scan.violations.map(item => item.id), [])
    } catch (error) {
      await page.screenshot({ path: `${output}/owner-feedback-failure-${width}-${theme}.png`, fullPage: true }).catch(() => {})
      throw error
    } finally { await context.close() }
  }
  console.log('PASS: owner inbox fixture at 320/1440 in dark/light; plain text, stale-save preservation, successful review, geometry and axe.')
} finally { await browser.close() }
