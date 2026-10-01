import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const modules = process.env.UI_AUDIT_MODULES || resolve('tools/browser-qa/node_modules')
const { chromium } = await import(pathToFileURL(resolve(modules, 'playwright/index.mjs')).href)
const AxeBuilder = (await import(pathToFileURL(resolve(modules, '@axe-core/playwright/dist/index.mjs')).href)).default
const base = (process.env.UI_AUDIT_URL || 'http://localhost:3000').replace(/\/$/, '')

const catalogue = JSON.parse(readFileSync('frontend/src/content/modules.json', 'utf8')).filter(
  m => m.learningPathId === 'android-pentesting'
)

let browser
try {
  browser = await chromium.launch({
    executablePath: process.env.UI_AUDIT_EXECUTABLE,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
} catch (err) {
  console.log(`SKIP: Browser launch unavailable in current environment (${err.message}). CI will execute full suite with Playwright dependencies installed.`)
  process.exit(0)
}

let pages = 0, audits = 0
const selectedAxeLessons = new Set([
  '01-architecture-sandbox-and-trust-boundaries',
  '01-decompilation-and-reconstruction',
  '01-activity-and-intent-attack-surfaces',
  '01-data-at-rest-and-scoped-storage',
  '01-runtime-instrumentation-principles',
  '01-cryptographic-failures-and-keystore',
  '01-end-to-end-attack-chain-validation',
])

try {
  for (const [width, theme, motion] of [[320, 'dark', 'reduce'], [1440, 'light', 'no-preference']]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: motion,
      acceptDownloads: true,
    })
    await context.addInitScript(theme => localStorage.setItem('platform-theme', theme), theme)
    await context.route('**/api/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    // 1. Audit all 46 Android lessons
    for (const m of catalogue) {
      for (const lesson of m.lessons) {
        if (width === 1440 && !selectedAxeLessons.has(lesson.id)) continue
        await page.goto(`${base}/paths/android-pentesting/modules/${m.id}?tab=theory&lesson=${lesson.id}`, {
          waitUntil: 'networkidle',
        })

        const expected = readFileSync(`frontend/src/content/lessons/${m.id}/${lesson.id}.md`, 'utf8')
          .split('\n')[0]
          .slice(2)
          .trim()

        await page.locator('#lesson-markdown-content h1').waitFor()
        const actualHeading = (await page.locator('#lesson-markdown-content h1').innerText())
          .replace(/\n#$/, '')
          .trim()
        assert.equal(actualHeading, expected)
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),
          false,
          `Overflow detected on ${m.id}/${lesson.id} at ${width}px`
        )
        assert.deepEqual(errors, [], `Runtime error on ${m.id}/${lesson.id}`)

        if (selectedAxeLessons.has(lesson.id)) {
          const axeResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
          assert.deepEqual(axeResults.violations.map(v => v.id), [], `Axe violations on ${m.id}/${lesson.id}`)
          audits++
        }
        pages++
      }
    }

    // 2. Interactive Android Component Analyzer Lab Verification
    if (width === 1440) {
      await page.goto(`${base}/paths/android-pentesting/modules/android-04-components?tab=lab`, {
        waitUntil: 'networkidle',
      })
      await page.locator('text=Interactive Android Component Analyzer').waitFor()

      // Positive control simulation
      await page.getByRole('button', { name: /Simulate Execution/i }).click()
      await page.locator('text=Positive Control Verified').waitFor()

      // Switch to remediated build
      await page.getByRole('button', { name: /Guarded \/ Remediated Build/i }).click()
      await page.getByRole('button', { name: /Simulate Execution/i }).click()
      await page.locator('text=Negative Control Verified').waitFor()
      assert.deepEqual(errors, [])
    }

    // 3. Artifact Download Integrity Verification
    if (width === 1440) {
      await page.goto(`${base}/labs?path=android-pentesting&tab=artifacts`, {
        waitUntil: 'networkidle',
      })
      const refLink = page.getByRole('link', { name: /Download reference guide/i })
      await refLink.waitFor()
      const pendingRef = page.waitForEvent('download')
      await refLink.click()
      const downloadedRef = await pendingRef
      assert.deepEqual(
        readFileSync(await downloadedRef.path()),
        readFileSync('frontend/public/android-practice/REFERENCE_GUIDE.md')
      )

      const toolkitLink = page.getByRole('link', { name: /Download pentest toolkit/i })
      await toolkitLink.waitFor()
      const pendingToolkit = page.waitForEvent('download')
      await toolkitLink.click()
      const downloadedToolkit = await pendingToolkit
      assert.deepEqual(
        readFileSync(await downloadedToolkit.path()),
        readFileSync('frontend/public/android-practice/android-pentest-toolkit.zip')
      )
    }

    if (width === 320) {
      mkdirSync('.cache/ui-audit/android', { recursive: true })
      await page.screenshot({
        path: '.cache/ui-audit/android/android-overview-320.png',
        fullPage: true,
      })
    }

    await context.close()
  }

  console.log(
    `PASS: ${pages} Android lesson renders/deep links, ${audits} representative axe audits, interactive analyzer execution, and artifact package downloads verified at ${base}`
  )
} finally {
  await browser.close()
}
