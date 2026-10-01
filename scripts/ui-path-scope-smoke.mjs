import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES || resolve('tools/browser-qa/node_modules')
const {chromium}=await import(pathToFileURL(resolve(modules,'playwright/index.mjs')).href)
const AxeBuilder=(await import(pathToFileURL(resolve(modules,'@axe-core/playwright/dist/index.mjs')).href)).default
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE,args:['--no-sandbox']})
const base=process.env.UI_AUDIT_URL || 'http://localhost:3000'
let checks=0
try {
 for(const width of [320,1440]) for(const theme of ['dark','light']) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',route=>route.fulfill({status:503,body:'{}',contentType:'application/json'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  async function check(name){
   const issues=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations
   assert.deepEqual(issues.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
   assert.deepEqual(errors,[],name);checks++
  }
  for(const route of ['app','modules','labs','challenges','reference']){
   await page.goto(`${base}/${route}`,{waitUntil:'networkidle'})
   assert.equal(await page.getByRole('heading',{name:'Choose your learning path',exact:true}).count(),1)
   assert.equal(await page.getByRole('link',{name:'Choose Android'}).count(),1)
   await check('first visit '+route)
  }
  await page.goto(base+'/modules?path=wireless-pentesting',{waitUntil:'networkidle'})
  // Keep DOM and keyboard focus stable; only deliberate filters start the bounded settle.
  await page.evaluate(()=>{window.settles=[];const el=document.querySelector('[data-result-transition]');window.resultsNode=el;const animate=el.animate.bind(el);el.animate=(...args)=>{window.settles.push(args);return animate(...args)}})
  const phase=page.getByLabel('Phase',{exact:true});await phase.focus();await phase.selectOption('1')
  assert.equal(await phase.evaluate(el=>el===document.activeElement),true)
  assert.equal(await page.evaluate(()=>window.resultsNode===document.querySelector('[data-result-transition]')),true)
  assert.equal(await page.evaluate(()=>window.settles.length),width===1440&&reducedMotion==='no-preference'?1:0)
  const before=await page.evaluate(()=>window.settles.length)
  await page.getByRole('searchbox').fill('intro')
  assert.equal(await page.evaluate(()=>window.settles.length),before)
  await page.getByLabel('Learning path',{exact:true}).selectOption('android-pentesting')
  await page.waitForFunction(()=>document.querySelector('.sc-modules-header')?.textContent.includes('Android'))
  assert.equal(new URL(page.url()).search,'?path=android-pentesting')
  assert.equal(await page.getByRole('searchbox').inputValue(),'')
  await page.waitForFunction(()=>document.querySelector('.sc-modules-header')?.textContent.includes('Android'))
  assert.match(await page.locator('.sc-modules-header').textContent(),/Android/)
  await check('Android modules')
  await page.goBack({waitUntil:'networkidle'})
  assert.equal(await page.getByLabel('Learning path',{exact:true}).inputValue(),'wireless-pentesting')
  await page.goto(base+'/paths/android-pentesting/modules?path=wireless-pentesting',{waitUntil:'networkidle'})
  assert.equal(await page.getByLabel('Learning path',{exact:true}).inputValue(),'android-pentesting')
  await page.goto(base+'/reference',{waitUntil:'networkidle'})
  assert.match(await page.locator('main').textContent(),/dedicated command and filter library is not available/)
  assert.equal(await page.getByRole('button',{name:/Terminal sandbox/}).count(),0)
  await check('Android reference')
  await page.goto(base+'/modules?path=missing',{waitUntil:'networkidle'})
  assert.equal(await page.getByRole('heading',{name:'Path not found'}).count(),1)
  assert.equal(await page.locator('.ws-catalog-row').count(),0)
  await check('invalid path')
  await context.close()
 }
 // Migration keeps genuine history but removes the old empty default.
 const modulesContent=await import('../frontend/src/content/modules.json',{with:{type:'json'}})
 for(const history of [false,true]){
  const context=await browser.newContext();const lesson=modulesContent.default[0].lessons[0]
  await context.addInitScript(({history,lesson})=>localStorage.setItem('platform-progress',JSON.stringify({version:6,state:{currentLearningPathId:'wireless-pentesting',currentModule:'01-intro-wireless',completedLessons:history?[{moduleId:'01-intro-wireless',lessonId:lesson.id,completed:true,completedAt:'2026-09-01T00:00:00Z',points:10}]:[]}})),{history,lesson})
  const page=await context.newPage();await page.goto(base+'/modules',{waitUntil:'networkidle'})
  assert.equal(await page.getByRole('heading',{name:'Choose your learning path',exact:true}).count(),history?0:1)
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('platform-progress')).state)
  assert.equal(saved.completedLessons.length,history?1:0);checks++
  await context.close()
 }
 console.log(`${checks} path-scope, state/motion, migration and accessibility checks passed`)
} finally {await browser.close()}
