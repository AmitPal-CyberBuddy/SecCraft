import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
const modules=process.env.UI_AUDIT_MODULES || resolve('tools/browser-qa/node_modules')
const {chromium}=await import(pathToFileURL(resolve(modules,'playwright/index.mjs')).href)
const AxeBuilder=(await import(pathToFileURL(resolve(modules,'@axe-core/playwright/dist/index.mjs')).href)).default
const base=(process.env.UI_AUDIT_URL || 'http://localhost:3000').replace(/\/$/,'')
const production=process.env.UI_AUDIT_PRODUCTION==='1'
const sizes=production?[[320,740],[1440,900]]:[[320,740],[768,1024],[844,390],[1440,900]]
const output=resolve('.cache/ui-audit/wireless-phase6');mkdirSync(output,{recursive:true})
const lessons=[['18-corporate-attacks','03-boundary-map-and-test-scope'],['18-corporate-attacks','04-policy-order-and-evidence-controls'],['18-corporate-attacks','05-retest-and-supported-impact']]
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE,args:['--no-sandbox']})
let checks=0
try{
 for(const [width,height] of sizes) for(const theme of ['dark','light']) for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width,height},reducedMotion,acceptDownloads:true})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  const check=async name=>{
   assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
   assert.deepEqual(errors,[],name);checks++
  }
  await page.goto(base+'/paths/wireless-pentesting',{waitUntil:'networkidle'})
  assert.equal(await page.locator('.sc-map-phase').count(),7)
  assert.equal(await page.locator('.sc-map-phase ol > li').count(),15)
  await page.getByRole('link',{name:'Open boundary evidence case'}).waitFor()
  await check('seven-phase map')
  for(const [mid,lid] of lessons){
   await page.goto(`${base}/paths/wireless-pentesting/modules/${mid}?tab=theory&lesson=${lid}`,{waitUntil:'networkidle'})
   await page.locator('#lesson-markdown-content h1').waitFor()
   const delivery=page.locator('.sc-practice-availability')
   assert.match(await delivery.locator('summary').innerText(),/Offline practice available.*Hosted live labs unavailable/s)
   await delivery.locator('summary').focus();await delivery.locator('summary').press('Enter')
   assert.equal(await delivery.getAttribute('open'),'')
   assert.match(await delivery.innerText(),/not a shell or VM/)

   assert.match(await page.locator('#lesson-markdown-content').innerText(),/WF-BOUND-06/)
   const hrefs=await page.locator('#lesson-markdown-content a[href*="wireless-practice"]').evaluateAll(els=>els.map(el=>({href:el.href,download:el.hasAttribute('download')})))
   assert.ok(hrefs.length>=2)
   for(const item of hrefs){
    assert.ok(item.href.startsWith(base+'/wireless-practice/'),item.href)
    assert.equal(item.download,true)
    const res=await context.request.get(item.href);assert.equal(res.status(),200,item.href)
    const relative=new URL(item.href).pathname.split('/wireless-practice/')[1]
    assert.deepEqual(await res.body(),readFileSync(resolve('frontend/public/wireless-practice',relative)),item.href+' exact file bytes')
   }
   await check(lid)
  }
  const zip=page.getByRole('link',{name:'WF-BOUND-06 ZIP'})
  await zip.focus();const downloaded=page.waitForEvent('download');await zip.press('Enter');const file=await downloaded
  const hash=data=>createHash('sha256').update(data).digest('hex')
  assert.equal(hash(readFileSync(await file.path())),hash(readFileSync('frontend/public/wireless-practice/WF-BOUND-06.zip')),'keyboard download bytes')
  await page.getByRole('button',{name:'Mark complete · practice XP',exact:true}).click()
  await page.getByRole('button',{name:'Completed · practice XP',exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('platform-progress')).state.completedLessons.filter(l=>l.lessonId==='05-retest-and-supported-impact').length),1)
  if(width===320 && theme==='dark' && reducedMotion==='reduce')await page.screenshot({path:`${output}/${production?'pages':'root'}-case-320.png`,fullPage:true})
  if(production && width===1440 && theme==='dark' && reducedMotion==='reduce'){
   await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
   const asset=base+'/wireless-practice/WF-BOUND-06/hardened-observations.json'
   await page.evaluate(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('case cache warm failed');await r.json()},asset)
   await context.setOffline(true)
   await page.goto(asset,{waitUntil:'load'})
   const body=await page.locator('body').innerText()
   assert.match(body,/model_rule_decision/);assert.doesNotMatch(body,/Choose your learning path|id="root"/)
   await context.setOffline(false)
   checks++
  }
  await context.close()
 }
 console.log(`PASS: ${checks} Wireless boundary evidence page/state checks at ${base}; delivery labels, phase map, three lessons, exact download bytes, keyboard, local participation, axe/reflow${production?', production subpath and service-worker offline file navigation':''}.`)
}finally{await browser.close()}
