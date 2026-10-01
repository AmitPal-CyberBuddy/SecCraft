// Phase 2: actual learning interactions, including motion-on and motion-off paths.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES
const load=name=>import(modules?pathToFileURL(resolve(modules,name)).href:name)
const {chromium}=await load(modules?'playwright/index.mjs':'playwright')
const AxeBuilder=(await load(modules?'@axe-core/playwright/dist/index.mjs':'@axe-core/playwright')).default
const base=process.env.UI_AUDIT_URL||'http://localhost:3000'
const out=resolve(process.env.UI_AUDIT_OUTPUT||'.cache/ui-audit/learning-motion')
fs.mkdirSync(out,{recursive:true})
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080}]
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE||undefined,args:['--no-sandbox']})
const results=[]
try {
 for(const theme of ['dark','light']) for(const reducedMotion of ['no-preference','reduce']) for(const viewport of sizes) {
  const context=await browser.newContext({viewport,reducedMotion,hasTouch:viewport.width<=844})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"detail":"Learning QA offline"}'}))
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const check=async name=>{
   await page.waitForTimeout(400)
   const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
   const result={name,theme,reducedMotion,...viewport,overflow,violations,errors:[...errors]}
   results.push(result);fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2))
   if(violations.length||overflow||errors.length||[320,1440].includes(viewport.width))await page.screenshot({path:`${out}/${name}-${theme}-${reducedMotion}-${viewport.width}.png`,fullPage:true})
   assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name}/${theme}/${viewport.width}/${reducedMotion}`)
   assert.equal(overflow,false,name);assert.deepEqual(errors,[],name)
  }
  await page.goto(base+'/tests/fixtures/color-audit.html?fixture=learning',{waitUntil:'networkidle'})
  const flip=page.locator('.sc-flashcard-face'), easy=page.getByRole('button',{name:'Correct — Easy',exact:true})
  assert.equal(await easy.isDisabled(),true)
  const handle=await flip.elementHandle()
  await flip.focus();await flip.press('Space')
  assert.equal(await easy.isEnabled(),true)
  assert.equal(await handle.evaluate(el=>el===document.activeElement && el.isConnected),true,'flip must not replace focused button')
  assert.equal(await flip.getAttribute('data-face'),'answer')
  assert.equal(await flip.evaluate(el=>getComputedStyle(el).opacity),'1')
  // Local reduction applies even when the OS permits motion; text never rotates.
  await page.evaluate(()=>document.documentElement.classList.add('reduce-motion'))
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced')
  await flip.press('Enter');await flip.press('Enter')
  assert.equal(await flip.evaluate(el=>getComputedStyle(el).transform),'none')
  await easy.click()
  assert.equal(await handle.evaluate(el=>el===document.activeElement && el.isConnected),true,'rating returns focus to next question')
  // A second queued activation cannot grade the unrevealed next card.
  await easy.evaluate(el=>el.click())
  assert.match(await page.locator('.sc-learning-feedback').textContent(),/Card 2 of 8/)
  assert.equal(await page.getByRole('progressbar',{name:'Position in flashcard deck'}).getAttribute('aria-valuenow'),'25')
  await page.evaluate(()=>document.documentElement.classList.remove('reduce-motion'))
  // Larger reading text must grow instead of overlapping absolutely positioned card badges.
  await page.evaluate(()=>document.documentElement.style.fontSize='22px')
  await flip.press('Enter')
  await check('flashcard-answer-large-text')
  await page.goto(base+'/modules/08-wpa-wpa2?tab=theory',{waitUntil:'networkidle'})
  await page.locator('#lesson-markdown-content h1').first().waitFor()
  const complete=page.getByRole('button',{name:'Mark complete · practice XP',exact:true})
  await complete.click()
  const completed=page.getByRole('button',{name:'Completed · practice XP',exact:true})
  assert.equal(await completed.getAttribute('data-completion'),'new')
  const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('platform-progress')).state.completedLessons.length)
  const count=await records()
  await completed.click()
  assert.equal(await records(),count)
  assert.equal(await completed.getAttribute('data-completion'),null)
  assert.match(await page.locator('.sc-learning-feedback').textContent(),/no additional/)
  assert.equal(await page.locator('.sc-learning-content').evaluate(el=>getComputedStyle(el).opacity),'1')
  await check('lesson-completed')
  const choose=page.getByRole('button',{name:/Choose a lesson/})
  const compactChooser=await choose.isVisible()
  if(compactChooser)await choose.click()
  const lessonButtons=page.locator('#lesson-options > button')
  if(await lessonButtons.count()>1) {
   await lessonButtons.nth(1).click()
   assert.ok(new URL(page.url()).searchParams.has('lesson'))
   await page.waitForFunction(()=>document.querySelectorAll('#lesson-options > button')[1]?.getAttribute('aria-current')==='step')
   if(compactChooser)assert.equal(await page.evaluate(()=>document.activeElement.id),'lesson-content-area')
   await page.goBack({waitUntil:'networkidle'})
   assert.equal(await page.getByRole('button',{name:'Completed · practice XP',exact:true}).getAttribute('data-completion'),null)
  }
  // Check width changes don't replace reading text with an animated outgoing panel.
  await page.getByRole('button',{name:'Focus reading',exact:true}).click()
  assert.equal(await page.locator('.ws-lesson-nav').isVisible(),false)
  await page.getByRole('button',{name:'Exit focus reading',exact:true}).click()
  await page.goto(base+'/modules/08-wpa-wpa2?tab=quiz',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Submit Quiz',exact:true}).click()
  await page.getByRole('alert').filter({hasText:'Answer every question'}).waitFor()
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('name')),'q0')
  const names=await page.getByRole('radio').evaluateAll(xs=>[...new Set(xs.map(x=>x.name))])
  assert.ok(names.length>0)
  for(const name of names)await page.locator(`input[name="${name}"]`).first().check()
  await page.getByRole('button',{name:'Submit Quiz',exact:true}).click()
  const summary=page.locator('.sc-quiz-summary')
  await summary.waitFor()
  assert.equal(await summary.evaluate(el=>el===document.activeElement),true)
  assert.match(await summary.textContent(),/not a verified assessment/)
  assert.equal(await page.getByRole('radio').first().isDisabled(),true)
  await check('quiz-submitted')
  const summaryBox=await summary.boundingBox(), headerBox=await page.locator('.sc-global-header').boundingBox()
  assert.ok(summaryBox.y>=headerBox.y+headerBox.height, 'focused result must not be hidden by sticky header')
  assert.equal(await page.getByRole('heading',{name:'Reading experience',exact:true}).count(),0)
  const retry=page.getByRole('button',{name:/Retry|Retake to improve/})
  if(await retry.count()) {
   await retry.click();assert.equal(await summary.count(),0)
   assert.equal(await page.locator('input[type="radio"]:checked').count(),0)
   assert.equal(await page.getByRole('radio').first().isEnabled(),true)
  }
  await context.close()
 }
 console.log(`PASS: ${results.length} learning state checks across 28 theme/viewport/motion cases; keyboard focus, local reduction, large text, duplicate activation, completion and quiz feedback.`)
} finally {await browser.close()}
