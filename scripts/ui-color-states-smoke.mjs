// Rendered foreground/background checks complement the opaque token tests and default-state axe scan.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules = process.env.UI_AUDIT_MODULES
const { chromium } = await import(modules ? pathToFileURL(resolve(modules, 'playwright/index.mjs')).href : 'playwright')
const browser = await chromium.launch({ executablePath: process.env.UI_AUDIT_EXECUTABLE || undefined, args: ['--no-sandbox'], headless: true })
const base = process.env.UI_AUDIT_URL || 'http://localhost:3000'
const luminance = css => {
  const values = css.match(/[\d.]+/g).map(Number)
  assert.ok(values.length === 3 || values[3] === 1, `Expected opaque color: ${css}`)
  return values.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
}
const check = async (element, foreground = 'color', minimum = 4.5) => {
  const pair = await element.evaluate((el, foreground) => { const s = getComputedStyle(el); return [s[foreground], s.backgroundColor] }, foreground)
  const [low, high] = pair.map(luminance).sort((a, b) => a - b)
  assert.ok((high + .05) / (low + .05) >= minimum, `${pair.join(' / ')} below ${minimum}:1`)
}
try {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'reduce' })
    await context.addInitScript(theme => { try { localStorage.setItem('platform-theme', theme) } catch {} }, theme)
    await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Color-state test outage."}' }))
    const page = await context.newPage()
    await page.goto(base + '/feedback', { waitUntil: 'networkidle' })
    const action = page.getByRole('button', { name: 'Send feedback', exact: true })
    await check(action)
    await action.hover(); await page.waitForTimeout(150); await check(action)
    await page.mouse.down(); await page.waitForTimeout(150); await check(action)
    await page.mouse.move(0, 0); await page.mouse.up()
    const input = page.getByLabel('Subject', { exact: true })
    await check(input, 'borderTopColor', 3)
    await input.click()
    assert.equal(await input.evaluate(el => getComputedStyle(el).outlineStyle), 'none')
    await input.press('Shift+Tab')
    await page.keyboard.press('Tab')
    assert.equal(await input.evaluate(el => document.activeElement === el), true)
    assert.ok(await input.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'))
    await check(input, 'outlineColor', 3)
    await input.fill('Test color states')
    await page.getByLabel('Message', { exact: true }).fill('This message is a browser fixture, not real feedback.')
    await action.click()
    await page.getByRole('alert').waitFor()
    await check(page.getByRole('alert'))
    await page.goto(base + '/reports', { waitUntil: 'networkidle' })
    const preview = page.getByRole('button', { name: 'Preview', exact: true })
    await preview.click()
    assert.equal(await preview.getAttribute('aria-pressed'), 'true')
    await check(preview)
    await context.close()
  }
  console.log('PASS: rendered primary default/hover/pressed, input outline/focus, error notice and selected view in both themes.')
} finally { await browser.close() }
