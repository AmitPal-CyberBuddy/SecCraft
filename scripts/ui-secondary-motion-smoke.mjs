// Populated local progress + public navigation + a real native shortcut dialog.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES
const load=name=>import(modules?pathToFileURL(resolve(modules,name)).href:name)
const {chromium}=await load(modules?'playwright/index.mjs':'playwright')
const AxeBuilder=(await load(modules?'@axe-core/playwright/dist/index.mjs':'@axe-core/playwright')).default
const output=resolve(process.env.UI_AUDIT_OUTPUT||'.cache/ui-audit/secondary-motion')
fs.mkdirSync(output,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE||undefined,args:['--no-sandbox']})
const base=process.env.UI_AUDIT_URL||'http://localhost:3000'
const results=[]
const sizes=[[320,740],[390,844],[768,1024],[844,390],[1024,768],[1440,900],[1920,1080]]
try {
 for(const [width,height] of sizes) for(const theme of ['dark','light']) for(const motion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:motion})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA unavailable API"}'}))
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const check=async name=>{
   const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
   results.push({name,width,height,theme,motion,overflow,violations,errors:[...errors]})
   fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2))
   if([320,1440].includes(width)&&theme==='dark'&&motion==='no-preference')await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true})
   assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name}/${width}/${theme}/${motion}`)
   assert.equal(overflow,false,`${name} overflow`);assert.deepEqual(errors,[],`${name} runtime`)
  }
  await page.goto(base+'/tests/fixtures/color-audit.html?fixture=secondary',{waitUntil:'networkidle'})
  assert.equal(await page.locator('.sc-earned-message').count(),0)
  const record=page.getByRole('button',{name:'Record QA lesson',exact:true})
  await record.click()
  await page.getByText('Achievement: First Lesson',{exact:true}).waitFor()
  await page.locator('.sc-earned-toast').evaluate(el=>{window.qaToastNode=el})
  const toast=page.locator('.sc-earned-toast')
  assert.equal(await toast.evaluate(el=>getComputedStyle(el).opacity),'1')
  const close=page.getByRole('button',{name:'Dismiss XP earned notification'})
  await close.focus()
  assert.equal(await page.getByRole('progressbar',{name:'Local progress to next level'}).count(),2)
  const value=Number(await page.getByRole('progressbar',{name:'Local progress to next level'}).first().getAttribute('aria-valuenow'))
  assert.ok(value>0)
  assert.ok(await page.locator('.sc-week-chart [title$="XP"]').count()>0)
  await check('local-progress')
  await close.click()
  assert.equal(await record.evaluate(el=>document.activeElement===el),true)
  await record.click() // No replay or duplicate XP for an already completed local lesson.
  assert.equal(await page.locator('.sc-earned-message').count(),0)
  await page.getByRole('button',{name:'Record next QA lesson'}).click()
  assert.equal(await toast.evaluate(el=>el===window.qaToastNode),true)
  await page.getByRole('button',{name:'Dismiss XP earned notification'}).click()
  await page.reload({waitUntil:'networkidle'})
  assert.equal(await page.locator('.sc-earned-message').count(),0,'hydration must not replay earned feedback')
  const bar=page.getByRole('progressbar',{name:'Local progress to next level'}).first()
  assert.ok(Number(await bar.getAttribute('aria-valuenow'))>=value)

  await page.goto(base+'/',{waitUntil:'networkidle'})
  assert.equal(await page.locator('.public-artifact').evaluate(el=>getComputedStyle(el).opacity),'1')
  await check('public-entry')
  await page.locator('.public-path-option').first().click()
  await page.waitForURL('**/paths/wireless-pentesting')
  await page.goBack({waitUntil:'networkidle'})
  assert.equal(await page.locator('.public-artifact').evaluate(el=>getComputedStyle(el).transform),'none')

  await page.goto(base+'/reports',{waitUntil:'networkidle'})
  const description=page.getByRole('textbox',{name:'Description',exact:true})
  await description.fill('')
  await description.pressSequentially('grading',{delay:25})
  assert.ok(page.url().endsWith('/reports'),'navigation shortcuts must not run inside an editor')
  assert.equal(await description.inputValue(),'grading')
  await page.getByRole('button',{name:'Save',exact:true}).click()
  const trigger=page.getByRole('button',{name:'Keyboard shortcuts ?'})
  await trigger.click()
  const dialog=page.getByRole('dialog',{name:'Keyboard shortcuts',exact:true})
  await dialog.waitFor()
  const dismiss=page.getByRole('button',{name:'Close keyboard shortcuts'})
  assert.equal(await dismiss.evaluate(el=>document.activeElement===el),true)
  // A native modal prevents tabbing into the background editor.
  await page.keyboard.press('Tab')
  assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true)
  await check('shortcut-dialog')
  await page.keyboard.press('Escape')
  assert.equal(await dialog.count(),0)
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true)
  await context.close()
 }
 // A real browser clock exercises long waits without spending minutes asleep.
 const context=await browser.newContext({viewport:{width:1440,height:900}})
 await context.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}))
 const page=await context.newPage()
 await page.clock.install()
 await page.goto(base+'/tests/fixtures/color-audit.html?fixture=secondary',{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'Record QA lesson',exact:true}).click()
 const close=page.getByRole('button',{name:'Dismiss XP earned notification'})
 await close.focus()
 await page.mouse.move(0,0)
 await page.clock.fastForward(9000)
 assert.equal(await close.count(),1,'focused toast must remain available')
 await page.getByRole('button',{name:'Record next QA lesson'}).focus()
 await page.clock.fastForward(8100)
 assert.equal(await close.count(),0,'unattended toast should expire')
 await page.evaluate(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('offline'))})
 await page.clock.fastForward(6100)
 await page.getByText(/Offline — the shell/).waitFor()
 assert.equal(await page.getByText(/service is reachable again/).count(),0)
 await context.close()
 console.log(`PASS: ${results.length} secondary-state checks across ${sizes.length*4} viewport/theme/motion combinations; focus, hydration, duplicate events, expiry and reconnect races.`)
} finally {await browser.close()}
