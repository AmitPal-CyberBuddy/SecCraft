// Technical data must remain readable immediately; selections never remount controls.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules = process.env.UI_AUDIT_MODULES
const load = name => import(modules ? pathToFileURL(resolve(modules, name)).href : name)
const { chromium } = await load(modules ? 'playwright/index.mjs' : 'playwright')
const AxeBuilder = (await load(modules ? '@axe-core/playwright/dist/index.mjs' : '@axe-core/playwright')).default
const base = process.env.UI_AUDIT_URL || 'http://localhost:3000'
const output = resolve(process.env.UI_AUDIT_OUTPUT || '.cache/ui-audit/technical-motion')
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.UI_AUDIT_EXECUTABLE || undefined, args: ['--no-sandbox'] })
const results = []
const sizes = [[320,740],[390,844],[768,1024],[844,390],[1024,768],[1440,900],[1920,1080]]
try {
  for (const [width,height] of sizes) for (const theme of ['dark','light']) for (const motion of ['no-preference','reduce']) {
    const context = await browser.newContext({ viewport:{width,height}, reducedMotion:motion })
    await context.addInitScript(theme => localStorage.setItem('platform-theme', theme), theme)
    let pendingRoute, deferFilter = false
    await context.route('**/api/**', route => {
      if (deferFilter && new URL(route.request().url()).searchParams.get('filter') === 'eapol') { pendingRoute = route; return }
      return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA unavailable API"}'})
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('dialog', dialog => dialog.accept())
    const check = async name => {
      const violations = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)
      results.push({ name,width,height,theme,motion,overflow,violations,errors:[...errors] })
      fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2))
      if ([320,1440].includes(width) && theme === 'dark' && motion === 'no-preference') await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true})
      assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name} ${width}/${theme}/${motion}`)
      if (overflow) console.error(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right})).slice(0,20)))
      assert.equal(overflow,false,`${name} overflow`)
      assert.deepEqual(errors,[],`${name} runtime`)
    }
    const fixture = name => page.goto(`${base}/tests/fixtures/color-audit.html?fixture=${name}`,{waitUntil:'networkidle'})
    const focusIs = locator => locator.evaluate(el => document.activeElement === el)
    await fixture('network')
    await page.getByRole('button',{name:/Ch1 /}).first().click()
    const input = page.getByRole('textbox',{name:'Packet display filter'})
    await input.waitFor()
    await input.evaluate(el => { window.qaFilterNode = el })
    deferFilter = true
    await input.fill('eapol')
    await input.press('Enter')
    await page.getByText(/Previous results remain visible; inspection is paused/).waitFor()
    assert.equal(await focusIs(input),true)
    assert.equal(await input.evaluate(el=>el===window.qaFilterNode),true)
    assert.equal(await page.locator('.ws-pcap-table[aria-busy="true"]').count(),1)
    await input.fill('eap') // Editing a draft must not relabel an in-flight request.
    await page.getByText(/Updating filter “eapol”/).waitFor()
    await input.fill('eapol')
    await check('filter-pending')
    assert.ok(pendingRoute)
    deferFilter = false
    await pendingRoute.fulfill({status:503,contentType:'application/json',body:'{}'})
    await page.getByText(/applied filter: eapol/).waitFor()
    assert.equal(await focusIs(input),true)
    assert.equal(await input.evaluate(el=>el===window.qaFilterNode),true)
    if (width > 680) {
      const inspect = page.getByRole('button',{name:/Inspect frame/}).first()
      await inspect.focus(); await inspect.press('Enter')
      assert.equal(await focusIs(inspect),true)
      await page.getByRole('button',{name:'Go to selected frame details'}).click()
      assert.equal(await page.locator('.ws-pcap-detail').evaluate(el=>document.activeElement===el),true)
      await page.getByRole('button',{name:'Close frame details'}).click()
      assert.equal(await focusIs(inspect),true)
      await inspect.press('Enter')
    } else {
      await page.locator('.ws-pcap-cards summary').first().click()
      await page.waitForFunction(()=>!!document.querySelector('.ws-pcap-cards details[open]'))
    }
    await check('packet-selected')
    await page.getByRole('button',{name:'Beacons',exact:true}).click()
    await page.getByText(/applied filter: wlan.fc.type_subtype==8/).waitFor()
    assert.equal(await page.locator('.ws-pcap-detail').count(),0)
    assert.equal(await page.locator('.ws-pcap-cards details[open]').count(),0)
    await input.fill('qa.unsupported.filter')
    await input.press('Enter')
    await page.getByText(/applied filter: All/).waitFor()
    await page.getByText(/only evaluated by the local parser API/).waitFor()
    assert.equal(await page.getByRole('button',{name:'All',exact:true}).getAttribute('aria-pressed'),'true')

    await fixture('tools')
    const detail = page.getByRole('region',{name:'Handshake step details'})
    await detail.evaluate(el => { window.qaStepNode = el })
    const second = page.locator('.sc-technical-choice').nth(1)
    await second.focus(); await second.press('Enter')
    assert.equal(await second.getAttribute('aria-pressed'),'true')
    assert.equal(await focusIs(second),true)
    assert.equal(await detail.evaluate(el=>el===window.qaStepNode),true)
    assert.deepEqual(await detail.evaluate(el=>({opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform})),{opacity:'1',transform:'none'})
    const marker = detail.locator('.sc-evidence-change-marker')
    if (motion==='reduce' || width<=680 || height<=500) assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'none')
    else assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'sc-evidence-rule')
    await page.evaluate(()=>document.documentElement.classList.add('reduce-motion'))
    assert.equal(await marker.evaluate(el=>getComputedStyle(el).animationName),'none')
    await page.evaluate(()=>document.documentElement.classList.remove('reduce-motion'))
    const config = page.locator('pre[aria-label="Current configuration"]')
    await config.evaluate(el=>{window.qaConfigNode=el})
    await page.getByRole('button',{name:'Show Example Suggestions'}).click()
    assert.equal(await page.locator('pre[aria-label="Illustrative suggested configuration"]').evaluate(el=>el===window.qaConfigNode),true)
    assert.equal(await page.getByRole('button',{name:'Show Original'}).getAttribute('aria-pressed'),'true')
    const prompt = page.getByRole('button',{name:'Reveal prompt 1',exact:true})
    assert.equal(await prompt.getAttribute('aria-expanded'),'false')
    await prompt.click()
    assert.equal(await prompt.getAttribute('aria-expanded'),'true')
    assert.equal(await focusIs(prompt),true)
    await check('technical-selection')

    await fixture('workflow')
    await page.locator('.ws-capture-upload input[type="file"]').setInputFiles({name:'qa-hash-only.pcap',mimeType:'application/octet-stream',buffer:Buffer.from('synthetic bytes for hashing, not parsed frames')})
    await page.getByRole('button',{name:'Remove qa-hash-only.pcap'}).click()
    assert.equal(await focusIs(page.getByRole('button',{name:'Select capture files'})),true)
    const label = page.getByRole('textbox',{name:'Artifact label (required)'})
    const claim = page.getByRole('textbox',{name:'Claim supported (required)'})
    for (const name of ['QA first record','QA second record']) {
      await label.fill(name); await claim.fill('Synthetic QA observation; not a verified finding.')
      await page.getByRole('button',{name:'Add artefact record'}).click()
    }
    await page.getByRole('button',{name:'Delete QA second record'}).click()
    assert.equal(await focusIs(page.getByRole('button',{name:'Delete QA first record'})),true)
    await page.getByRole('button',{name:'Delete QA first record'}).click()
    assert.equal(await focusIs(page.getByRole('region',{name:'Evidence records'})),true)
    const title = page.getByRole('textbox',{name:'Title',exact:true})
    await title.fill('QA unverified finding')
    const description = page.getByRole('textbox',{name:'Description',exact:true})
    await description.fill('Synthetic draft.\n\n```\n'+ 'stationary-code-'.repeat(40)+'\n```\n\n| Observation | Value |\n| --- | --- |\n| QA only | Local |')
    await description.evaluate(el=>{window.qaEditorNode=el;el.setSelectionRange(3,8)})
    await page.getByRole('group',{name:'Finding view'}).getByRole('button',{name:'Preview',exact:true}).click()
    assert.equal(await description.isVisible(),false)
    await check('report-preview')
    await page.getByRole('group',{name:'Finding view'}).getByRole('button',{name:'Edit',exact:true}).click()
    assert.equal(await description.evaluate(el=>el===window.qaEditorNode && el.selectionStart===3 && el.selectionEnd===8),true)
    await page.getByRole('button',{name:'Save',exact:true}).click()
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('platform-report-draft')).title),'QA unverified finding')

    await fixture('authoring')
    const template = page.getByRole('button',{name:/^Executive Summary/})
    await template.focus(); await template.press('Enter')
    assert.equal(await template.getAttribute('aria-pressed'),'true')
    assert.equal(await focusIs(template),true)
    const preview = page.getByRole('button',{name:'Preview',exact:true}).last()
    await preview.click()
    await page.getByRole('button',{name:'Close template preview'}).click()
    assert.equal(await focusIs(preview),true)
    await check('template-selected')
    await context.close()
  }
  console.log(`PASS: ${results.length} technical-state checks across ${sizes.length*4} viewport/theme/motion combinations.`)
} finally { await browser.close() }
