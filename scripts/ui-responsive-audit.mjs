// Optional browser QA; installs stay outside the application dependency tree.
// See docs/ui-ux-phase5-validation.md for setup, coverage and limitations.
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const modules = process.env.UI_AUDIT_MODULES
const load = name => import(modules ? pathToFileURL(resolve(modules, name)).href : name)
const { chromium } = await load(modules ? 'playwright/index.mjs' : 'playwright')
const AxeBuilder = process.env.UI_AUDIT_AXE ? (await load(modules ? '@axe-core/playwright/dist/index.mjs' : '@axe-core/playwright')).default : null
const baseUrl = process.env.UI_AUDIT_URL || 'http://localhost:3000'
const output = resolve(process.env.UI_AUDIT_OUTPUT || '.cache/ui-audit')
fs.mkdirSync(output, { recursive:true })
const defaultRoutes=['/','/about','/how-it-works','/login','/signup','/reset-password','/update-password','/account','/app','/paths','/paths/wireless-pentesting','/paths/android-pentesting','/modules','/paths/android-pentesting/modules','/modules/08-wpa-wpa2','/modules/08-wpa-wpa2?tab=theory','/modules/08-wpa-wpa2?tab=lab&lab=lab-08-rsn','/labs','/challenges','/reference','/reports','/analytics','/achievements','/daily','/profile','/sync','/settings','/admin','/feedback','/admin/feedback','/nonexistent']
const routes=process.env.UI_AUDIT_ROUTES ? process.env.UI_AUDIT_ROUTES.split(',') : defaultRoutes
const sizes=(process.env.UI_AUDIT_WIDTHS || '320,390,768,1024,1440,1920').split(',').map(Number)
const results=[]
for(const theme of ['dark','light']) for(const width of sizes){
 const browser=await chromium.launch({executablePath:process.env.UI_AUDIT_EXECUTABLE || undefined,args:['--no-sandbox'],headless:true})
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})
 await context.addInitScript(theme=>{try{localStorage.setItem('platform-theme',theme)}catch{}},theme)
 // Explicitly test the offline guest state, not a configured production identity service.
 await context.route('**/api/**', route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"QA offline fixture"}'}))
 for(const route of routes){
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message))
  await page.goto(baseUrl+route,{waitUntil:'networkidle'})
  await page.evaluate(()=>document.fonts.ready)
  await page.waitForTimeout(500)
  const accessibility=process.env.UI_AUDIT_AXE ? (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations : []
  const layout=await page.evaluate(()=>{
   const width=innerWidth
   const outside=[...document.querySelectorAll('main *, .sc-global-header *')].filter(el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el)
    if(r.width<1||r.height<1||s.visibility==='hidden'||el.closest('[hidden]'))return false
    if(r.right<=width+2&&r.left>=-2)return false
    // Ignore intentionally local-scrolling technical regions, not page clipping.
    for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){
     const ps=getComputedStyle(p); if(['auto','scroll'].includes(ps.overflowX)&&p.scrollWidth>p.clientWidth)return false
    }
    return true
   }).slice(0,10).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,150),text:el.textContent?.slice(0,80),right:Math.round(el.getBoundingClientRect().right)}))
   return {pageOverflow:document.documentElement.scrollWidth>width+2,outside}
  })
  results.push({route,width,theme,...layout,errors,accessibility})
  if(layout.outside.length||layout.pageOverflow||errors.length||accessibility.length)console.log(JSON.stringify(results.at(-1)))
  if(process.env.UI_AUDIT_SCREENSHOTS === '1'||layout.outside.length||layout.pageOverflow||errors.length||accessibility.length||([320,1440].includes(width)&&['/app','/login','/settings','/paths','/reports','/analytics','/achievements','/daily','/profile','/','/feedback','/admin/feedback'].includes(route)))await page.screenshot({path:output+'/'+(route.slice(1).replace(/[^a-z0-9-]/gi,'_')||'home')+'-'+width+'-'+theme+'.png',fullPage:true})
  fs.writeFileSync(output+'/audit-results.json',JSON.stringify(results,null,2))
  await page.close()
 }
 await browser.close()
 fs.writeFileSync(output+'/audit-results.json',JSON.stringify(results,null,2))
}
fs.writeFileSync(output+'/audit-results.json',JSON.stringify(results,null,2))
console.log('Checked',results.length,'route/viewports; issues:',results.filter(r=>r.pageOverflow||r.outside.length||r.errors.length||r.accessibility.length).length)

if(results.some(r=>r.pageOverflow||r.outside.length||r.errors.length||r.accessibility.length)) process.exitCode=1
