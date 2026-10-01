// Dev-only populated fixtures + non-default interaction states in both themes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES
const load=name=>import(modules?pathToFileURL(resolve(modules,name)).href:name)
const {chromium}=await load(modules?'playwright/index.mjs':'playwright')
const AxeBuilder=(await load(modules?'@axe-core/playwright/dist/index.mjs':'@axe-core/playwright')).default
const output=resolve(process.env.UI_AUDIT_OUTPUT||'.cache/ui-audit/color-components')
fs.mkdirSync(output,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE||undefined,args:['--no-sandbox']})
const base=process.env.UI_AUDIT_URL||'http://localhost:3000'
const results=[]
try {
 for(const theme of ['dark','light']) for(const width of [320,1440]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA unavailable API"}'}))
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const check=async name=>{
   await page.waitForTimeout(750)
   const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
   results.push({name,theme,width,violations,overflow,errors:[...errors]})
   fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2))
   await page.screenshot({path:`${output}/${name}-${width}-${theme}.png`,fullPage:true})
   assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name}/${theme}/${width}`)
   assert.equal(overflow,false,name); assert.deepEqual(errors,[],name)
  }
  const fixture=async name=>{await page.goto(`${base}/tests/fixtures/color-audit.html?fixture=${name}`,{waitUntil:'networkidle'});await check(name)}
  await fixture('network')
  // Assert actual bundled data rendered; an empty/loading screenshot isn't population coverage.
  assert.ok(await page.getByRole('combobox',{name:'Filter network name'}).locator('option').count()>1)
  await page.getByRole('button',{name:/Ch1 /}).first().click()
  await page.getByRole('button',{name:'EAPOL',exact:true}).click()
  await check('network-selected')
  await fixture('tools')
  await page.getByRole('button',{name:'Show Example Suggestions'}).click()
  await page.getByRole('button',{name:'Show PMKID',exact:true}).click()
  await page.getByRole('button',{name:'Reveal prompt 1',exact:true}).click()
  await page.getByLabel('Simulated command',{exact:true}).fill('qa-unknown-command')
  await page.getByRole('button',{name:'Run',exact:true}).click()
  await page.getByText('bash: qa-unknown-command: command not found',{exact:false}).waitFor()
  await check('tools-revealed')
  await fixture('learning')
  await page.getByRole('button',{name:'Flip to answer',exact:true}).click()
  await page.getByRole('button',{name:'Correct — Easy',exact:true}).waitFor()
  await check('learning-answer')
  await page.getByRole('button',{name:'Wrong — Again',exact:true}).click()
  await fixture('authoring')
  await page.getByRole('button',{name:'Add Lesson',exact:true}).click()
  await page.getByTitle('Physical',{exact:true}).click()
  assert.equal(await page.getByTitle('Physical',{exact:true}).getAttribute('aria-pressed'),'true')
  await check('authoring-selected')
  await fixture('search')
  await page.locator('#global-search-input').fill('wpa')
  await page.getByRole('option').first().waitFor()
  await page.locator('#global-search-input').press('ArrowDown')
  await check('search-results')
  await fixture('activity')
  await page.getByRole('button',{name:'Mark all read',exact:true}).click()
  await check('activity-read')
  await page.goto(base+'/modules/08-wpa-wpa2?tab=quiz',{waitUntil:'networkidle'})
  const radios=page.getByRole('radio');assert.ok(await radios.count()>0)
  const names=await radios.evaluateAll(xs=>[...new Set(xs.map(x=>x.name))])
  for(const name of names)await page.locator(`input[type="radio"][name="${name}"]`).first().check()
  await page.getByRole('button',{name:'Submit Quiz',exact:true}).click()
  await page.getByText(/Wrong — Correct:|Correct/).first().waitFor()
  await check('quiz-submitted')
  await context.close()
 }
 console.log(`PASS: ${results.length} component/state combinations with axe, reflow and runtime checks.`)
} finally { await browser.close() }
