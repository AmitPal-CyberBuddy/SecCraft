import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES
const load=name=>import(modules?pathToFileURL(resolve(modules,name)).href:name)
const {chromium}=await load(modules?'playwright/index.mjs':'playwright')
const AxeBuilder=(await load(modules?'@axe-core/playwright/dist/index.mjs':'@axe-core/playwright')).default
const base=process.env.UI_AUDIT_URL||'http://localhost:3000'
const out=resolve('.cache/ui-audit/product-polish');fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE||undefined,args:['--no-sandbox']})
const results=[]
try {
 for(const [width,height] of [[320,740],[768,1024],[844,390],[1440,900]]) for(const theme of ['dark','light']) for(const motion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:motion})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  const check=async name=>{
   const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
   results.push({name,width,height,theme,motion,violations,overflow,errors:[...errors]})
   fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2))
   if([320,1440].includes(width)&&motion==='no-preference')await page.screenshot({path:`${out}/${name}-${width}-${theme}.png`,fullPage:true})
   assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name}/${width}/${theme}/${motion}`)
   assert.equal(overflow,false,`${name} overflow`);assert.deepEqual(errors,[])
  }
  await page.goto(base+'/signup',{waitUntil:'networkidle'})
  const email=page.locator('input[autocomplete="email"]')
  const password=page.locator('input[autocomplete="new-password"]').first()
  await email.click()
  const bounds=await email.locator('..').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,y:r.top+scrollY}})
  assert.equal(await email.locator('..').evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  await page.keyboard.press('Tab')
  assert.equal(await password.evaluate(el=>el===document.activeElement),true)
  assert.equal(await password.locator('..').evaluate(el=>getComputedStyle(el).outlineWidth),'2px')
  await password.click()
  assert.equal(await password.evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  assert.equal(await password.locator('..').evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  assert.deepEqual(await email.locator('..').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,y:r.top+scrollY}}),bounds,'focusing a field must not alter its geometry')
  await password.fill('Password123!Password123!')
  await page.getByRole('status').filter({hasText:'Password strength: Weak'}).waitFor()
  await password.fill('river lantern copper orbit')
  await page.getByRole('status').filter({hasText:'Password strength: Strong'}).waitFor()
  await page.getByRole('button',{name:'Suggest a strong password'}).click()
  assert.equal((await password.inputValue()).length,20)
  await page.getByRole('status').filter({hasText:'Password strength: Strong'}).waitFor()
  assert.equal(await page.getByText(/Supabase may apply/).count(),0)
  await check('password-form')

  await page.goto(base+'/',{waitUntil:'networkidle'})
  assert.equal(await page.locator('.public-path-option').count(),2)
  await page.getByRole('link',{name:/Android Application/}).first().waitFor()
  await check('platform-home')

  await page.goto(base+'/modules/08-wpa-wpa2?tab=theory',{waitUntil:'networkidle'})
  const reading=page.locator('#lesson-markdown-content');await reading.waitFor()
  await reading.evaluate(el=>{window.qaReadingNode=el})
  assert.equal(await page.getByRole('heading',{name:'Reading experience',exact:true}).count(),0)
  await page.getByRole('button',{name:'Focus reading',exact:true}).click()
  const exit=page.getByRole('button',{name:'Exit focus reading',exact:true})
  assert.equal(await exit.getAttribute('aria-pressed'),'true')
  assert.equal(await reading.evaluate(el=>el===window.qaReadingNode),true)
  assert.equal(await page.locator('.ws-lesson-nav').isVisible(),false)
  await check('focus-reading')
  await exit.click()
  assert.equal(await reading.evaluate(el=>el===window.qaReadingNode),true)
  assert.equal(await page.locator('.ws-lesson-nav').isVisible(),true)

  await page.goto(base+'/settings',{waitUntil:'networkidle'})
  assert.equal(await page.getByRole('heading',{name:'Reading preferences',exact:true}).count(),0)
  const options=page.locator('.sc-text-options')
  assert.equal(await options.getAttribute('open'),null)
  await page.getByRole('button',{name:'Reduce Motion',exact:true}).click()
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced')
  await page.getByText('Text and contrast options',{exact:true}).click()
  await page.getByRole('button',{name:'Increase base text size'}).click()
  await check('settings-options')
  await context.close()
 }
 console.log(`PASS: ${results.length} product-polish checks across 16 viewport/theme/motion combinations.`)
} finally {await browser.close()}
