import assert from 'node:assert/strict'
import {readFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const modules=process.env.UI_AUDIT_MODULES||resolve('tools/browser-qa/node_modules')
const {chromium}=await import(pathToFileURL(resolve(modules,'playwright/index.mjs')).href)
const AxeBuilder=(await import(pathToFileURL(resolve(modules,'@axe-core/playwright/dist/index.mjs')).href)).default
const base=(process.env.UI_AUDIT_URL||'http://localhost:3000').replace(/\/$/,'')
const catalogue=JSON.parse(readFileSync('frontend/src/content/modules.json')).filter(m=>m.learningPathId==='wireless-pentesting')
const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE,args:['--no-sandbox']})
let pages=0,audits=0
const selected=new Set(['01-rsn-key-hierarchy','03-capability-troubleshooting','02-coverage-and-inventory','01-methods-and-credential-exposure','03-enterprise-decision-clinic','03-boundary-map-and-test-scope','02-lookalike-decision-clinic','03-handshake-decision-clinic'])
try {
 for(const [width,theme,motion] of [[320,'dark','reduce'],[1440,'light','no-preference']]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:motion,acceptDownloads:true})
  await context.addInitScript(theme=>localStorage.setItem('platform-theme',theme),theme)
  await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  for(const m of catalogue)for(const lesson of m.lessons){
   if(width===1440 && !selected.has(lesson.id))continue
   await page.goto(`${base}/paths/wireless-pentesting/modules/${m.id}?tab=theory&lesson=${lesson.id}`,{waitUntil:'networkidle'})
   const expected=readFileSync(`frontend/src/content/lessons/${m.id}/${lesson.id}.md`,'utf8').split('\n')[0].slice(2)
   await page.locator('#lesson-markdown-content h1').waitFor()
   assert.equal((await page.locator('#lesson-markdown-content h1').innerText()).replace(/\n#$/,''),expected)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${m.id}/${lesson.id} overflow`)
   assert.deepEqual(errors,[])
   if(selected.has(lesson.id)){
    assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[])
    audits++
   }
   if(lesson.id==='03-capability-troubleshooting'){
    const link=page.getByRole('link',{name:'curated reading and coverage guide'})
    assert.equal(await link.getAttribute('href'),base.replace(new URL(base).origin,'')+'/wireless-practice/REFERENCE_GUIDE.md')
    await link.focus();const pending=page.waitForEvent('download');await link.press('Enter');const download=await pending
    assert.deepEqual(readFileSync(await download.path()),readFileSync('frontend/public/wireless-practice/REFERENCE_GUIDE.md'))
   }
   if(lesson.id==='03-handshake-decision-clinic'){
    await page.getByRole('link',{name:'Reading the 4-way handshake',exact:true}).click()
    await page.waitForURL(/lesson=02-four-way-handshake-lab/)
    assert.ok(page.url().startsWith(base+'/paths/'),'internal lesson link retains deployment base')
    await page.getByRole('heading',{level:1,name:'Reading the 4-Way Handshake (Lab)'}).waitFor()
   }
   pages++
  }
  if(width===320){mkdirSync('.cache/ui-audit/curriculum',{recursive:true});await page.screenshot({path:'.cache/ui-audit/curriculum/'+(base.includes('4173')?'pages':'root')+'-320.png',fullPage:true})}
  await context.close()
 }
 console.log(`PASS: ${pages} lesson renders/deep links, ${audits} representative axe audits, reflow, runtime errors, consolidation link and keyboard reference download at ${base}`)
}finally{await browser.close()}
