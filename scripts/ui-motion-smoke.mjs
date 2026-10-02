// Motion-on validation complements the existing reduced-motion accessibility matrix.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules=process.env.UI_AUDIT_MODULES
const load=name=>import(modules?pathToFileURL(resolve(modules,name)).href:name)
const { chromium }=await load(modules?'playwright/index.mjs':'playwright')
const AxeBuilder=(await load(modules?'@axe-core/playwright/dist/index.mjs':'@axe-core/playwright')).default
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE||undefined,args:['--no-sandbox']})
const base=process.env.UI_AUDIT_URL||'http://localhost:3000'
const sizes=[{width:320,height:740,touch:true},{width:390,height:844,touch:true},{width:768,height:1024,touch:true},{width:844,height:390,touch:true},{width:1024,height:768,touch:false},{width:1440,height:900,touch:false},{width:1920,height:1080,touch:false}]
let checks=0
try {
 for(const theme of ['dark','light']) for(const size of sizes) {
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch,reducedMotion:'no-preference'})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Motion QA offline fixture"}'}))
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/app',{waitUntil:'networkidle'})
  assert.equal(await page.locator('html').getAttribute('data-motion'),'full')
  const primary=page.locator('.ws-action:not(.ws-action-secondary)').first()
  if(await primary.count()) {
    await primary.hover()
    const translate=await primary.evaluate(el=>getComputedStyle(el).translate)
    if(size.touch)assert.ok(translate==='none'||translate==='0px',translate)
  }
  if(size.width>940) {
    await page.getByRole('navigation',{name:'Main destinations'}).getByRole('link',{name:'Modules',exact:true}).click()
    // Rapid second navigation interrupts the marker transition, not route behavior.
    await page.getByRole('navigation',{name:'Main destinations'}).getByRole('link',{name:'Paths',exact:true}).click()
    await page.waitForTimeout(240)
    const marker=page.locator('.sc-destination-marker')
    assert.equal(await marker.count(),1)
    assert.equal(await marker.locator('..').getAttribute('aria-current'),'page')
    assert.match(await marker.locator('..').textContent(),/Paths/)
  }
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click()
  await page.waitForTimeout(260)
  const drawer=page.getByRole('dialog',{name:'All workspace destinations'})
  const box=await drawer.boundingBox();assert.ok(box.x>=-1 && box.x+box.width<=size.width+1)
  await page.keyboard.press('Escape')
  // Focus returns to the toggle on the next animation frame; wait for it, then assert (and report) the real active element.
  await page.waitForFunction(()=>document.activeElement?.id==='mobile-navigation-toggle',undefined,{timeout:5000}).catch(()=>{})
  assert.equal(await page.evaluate(()=>document.activeElement.id),'mobile-navigation-toggle')
  await page.getByRole('button',{name:'Search SecCraft',exact:true}).click()
  await page.locator('#global-search-input').fill('wpa')
  await page.waitForTimeout(260)
  await page.locator('#global-search-input').press('ArrowDown')
  assert.equal(await page.locator('[role="option"][aria-selected="true"]').count(),1)
  assert.ok(await page.locator('[role="option"]').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).opacity==='1')))
  assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[])
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(),0)
  // Live OS preference is honored without reloading, including when local preference is off.
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced')
  await page.getByRole('button',{name:'Activity and notifications',exact:true}).click()
  assert.equal(await page.locator('#activity-panel').evaluate(el=>getComputedStyle(el).transform),'none')
  await page.keyboard.press('Escape')
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='full')
  // Local preference independently disables CSS and JS motion.
  await page.evaluate(()=>document.documentElement.classList.add('reduce-motion'))
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduced')
  await page.getByRole('button',{name:'Search SecCraft',exact:true}).click()
  assert.equal(await page.locator('.search-dialog').evaluate(el=>getComputedStyle(el).transform),'none')
  await page.keyboard.press('Escape')
  await page.evaluate(()=>document.documentElement.classList.remove('reduce-motion'))
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='full')
  // Resizing with an open drawer must not strand content or focus.
  await page.getByRole('button',{name:'Activity and notifications',exact:true}).click()
  await page.setViewportSize({width:size.height,height:size.width})
  await page.waitForTimeout(260)
  const activity=await page.locator('#activity-panel').boundingBox()
  assert.ok(activity.x>=-1 && activity.x+activity.width<=size.height+1)
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))
  await page.setViewportSize({width:size.width,height:size.height})
  await page.goto(base+'/reports',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Preview',exact:true}).click()
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  const edit=page.getByRole('button',{name:'Edit',exact:true})
  assert.equal(await edit.getAttribute('aria-pressed'),'true')
  await page.waitForTimeout(200)
  assert.equal(await edit.evaluate(el=>getComputedStyle(el,'::after').transform),'matrix(1, 0, 0, 1, 0, 0)')
  // Exercise completion feedback without depending on the browser's clipboard permission UI.
  await page.goto(base+'/tests/fixtures/color-audit.html?fixture=tools',{waitUntil:'networkidle'})
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}))
  await page.getByRole('button',{name:'Copy output',exact:true}).click()
  const feedback=page.locator('[data-copy-state="copied"]')
  await feedback.waitFor()
  assert.equal(await feedback.locator('[role="status"]').textContent(),'Copied')
  assert.equal(await feedback.locator('.sc-copy-feedback-mark svg').count(),1)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2))
  assert.deepEqual(errors,[])
  await context.close();checks++
 }
 console.log(`PASS: ${checks} theme/viewport cases with motion enabled, fine/coarse input, rapid navigation, dialog focus, live OS/local reduction, open-panel resize, wrapped view indicators and copy feedback.`)
} finally { await browser.close() }
