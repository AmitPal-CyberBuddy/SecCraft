import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES || resolve('tools/browser-qa/node_modules')
const {chromium}=await import(pathToFileURL(resolve(modules,'playwright/index.mjs')).href)
const AxeBuilder=(await import(pathToFileURL(resolve(modules,'@axe-core/playwright/dist/index.mjs')).href)).default
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE,args:['--no-sandbox']})
const base=process.env.UI_AUDIT_URL || 'http://localhost:3000'
let count=0
try {
 for(const [width,height] of [[320,740],[768,1024],[844,390],[1440,900]]) for(const theme of ['dark','light']) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',r=>r.fulfill({status:503,body:'{}',contentType:'application/json'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/tests/fixtures/color-audit.html?fixture=motion',{waitUntil:'networkidle'})
  const compact=width<=680||height<=500,quiet=reducedMotion==='reduce'
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--motion-control').trim()),quiet?'0ms':compact?'100ms':'140ms')
  const progress=page.getByRole('progressbar',{name:'Motion test progress'})
  assert.equal(await progress.getAttribute('aria-valuenow'),'60')
  const fill=progress.locator('span')
  assert.ok(Math.abs(await fill.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a)-.6)<.001,'no zero-to-total entrance')
  await page.evaluate(()=>{
    window.anchorY=document.querySelector('#motion-layout-anchor').getBoundingClientRect().top+scrollY
    const el=document.querySelector('[data-result-transition]');window.resultNode=el;window.transitions=[]
    const animate=el.animate.bind(el);el.animate=(...args)=>{const animation=animate(...args);window.transitions.push({args,animation});return animation}
  })
  const update=page.getByRole('button',{name:'Update progress'});await update.focus();await update.press('Enter')
  await page.waitForFunction(()=>document.querySelector('[aria-label="Motion test progress"]').getAttribute('aria-valuenow')==='85')
  await page.waitForFunction(()=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[aria-label="Motion test progress"] > span')).transform).a-.85)<.001)
  assert.equal(await update.evaluate(el=>el===document.activeElement),true)
  const change=page.getByRole('button',{name:'Change results'});await change.focus();await change.press('Space')
  await page.waitForFunction(()=>document.querySelector('[data-result-transition]').textContent.includes('Selection 1'))
  assert.equal(await change.evaluate(el=>el===document.activeElement),true)
  assert.equal(await page.evaluate(()=>window.resultNode===document.querySelector('[data-result-transition]')),true)
  assert.equal(await page.evaluate(()=>window.transitions.length),compact||quiet?0:1)
  if(!compact&&!quiet){
    assert.equal(await page.evaluate(()=>window.transitions[0].args[1].duration),180)
    await page.evaluate(()=>document.documentElement.classList.add('reduce-motion'))
    await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced')
    assert.equal(await page.evaluate(()=>window.transitions[0].animation.playState),'idle','local reduction cancels active animation')
    await change.press('Enter')
    assert.equal(await page.evaluate(()=>window.transitions.length),1)
    await page.evaluate(()=>document.documentElement.classList.remove('reduce-motion'))
    await page.waitForFunction(()=>document.documentElement.dataset.motion==='full')
    assert.equal(await page.evaluate(()=>window.transitions.length),1,'restoring motion never replays events')
    await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))})
    await page.waitForFunction(()=>document.documentElement.dataset.motionPaused==='true')
    await change.press('Enter')
    assert.equal(await page.evaluate(()=>window.transitions.length),1)
    await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))})
    await page.waitForFunction(()=>document.documentElement.dataset.motionPaused==='false')
  }
  assert.equal(await page.getByLabel('Retained input').inputValue(),'Keep this draft')
  assert.ok(await page.evaluate(()=>Math.abs(window.anchorY-(document.querySelector('#motion-layout-anchor').getBoundingClientRect().top+scrollY))<.5),'motion must not change surrounding layout')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[])
  assert.deepEqual(errors,[])
  count++;await context.close()
 }
 console.log(`PASS: ${count} motion-contract combinations; tokens, progress, keyboard focus, retained DOM/input, cancellation, paused state, layout geometry and axe.`)
}finally{await browser.close()}
