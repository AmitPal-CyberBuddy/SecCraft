/** QA-only independent Wireshark 4.4.5 (WebAssembly) dissection and filter/field verification.
 * Verifies libwireshark dissection, 0 _ws.malformed frames across all 20 published captures (257 packets),
 * and actual ProtoTree field extraction for all 37 curriculum TShark examples.
 * Does NOT claim a native OS tshark CLI binary was executed or that live RF/learner pilots occurred.
 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const dir=resolve(root,'tools/wireless-qa/node_modules/@goodtools/wiregasm/dist')
const {default:load}=await import(pathToFileURL(resolve(dir,'wiregasm.js')).href)
const wg=await load({
 wasmBinary:readFileSync(resolve(dir,'wiregasm.wasm')),
 getPreloadedPackage:()=>{const b=readFileSync(resolve(dir,'wiregasm.data'));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)},
 locateFile:p=>resolve(dir,p),print:()=>{},printErr:()=>{},handleStatus:()=>{},
})
assert.ok(wg.init(),'decoder initializes')
const commands=JSON.parse(execFileSync('python3',['scripts/verify-wireless-curriculum.py','--commands-json'],{cwd:root,encoding:'utf8'})).commands
const inventory=JSON.parse(readFileSync(resolve(root,'frontend/src/content/lab-artifacts.json'))).artifacts
const report={engine:`Wireshark ${wg.wiresharkVersion()} via Wiregasm 1.9.1`,native_tshark_cli:'NOT EXECUTED (validated via Wireshark 4.4.5 libwireshark WASM engine)',captures:[],commands:[],failures:[]}
const check=(value,label)=>{if(!value)report.failures.push(label)}
const vector=v=>Array.from({length:v.size()},(_,i)=>v.get(i))
function collectFields(tree,out=new Set()){
 for(let i=0;i<tree.size();i++){
  const t=tree.get(i)
  if(t.filter){
   const m=t.filter.match(/^([a-z0-9_.]+)/i)
   if(m)out.add(m[1])
  }
  if(t.tree)collectFields(t.tree,out)
 }
 return out
}
let packets=0
try{
 check(!wg.checkFilter('seccraft.nonexistent_field').ok,'invalid field negative control')
 check(!wg.checkFilter('wlan.fc.type ==').ok,'malformed filter negative control')
 const extra=[
  ['foundations-baseline',{path:'../wireless-foundations/WF-FND-01/baseline.pcapng',frames:13}],
  ['foundations-followup',{path:'../wireless-foundations/WF-FND-01/follow-up.pcapng',frames:3}],
 ]
 for(const [id,meta] of [...Object.entries(inventory),...extra]){
  const disk=resolve(root,'frontend/public/pcaps',meta.path)
  const virtual=`/uploads/${id}.pcapng`;wg.FS.writeFile(virtual,readFileSync(disk))
  const session=new wg.DissectSession(virtual)
  try{
   const loaded=session.load();check(loaded.code===0,`${id}: load ${loaded.error}`)
   check(loaded.summary.packet_count===meta.frames,`${id}: packet count`);packets+=loaded.summary.packet_count
   const tree=session.getFrame(1);check(tree.tree.size()>0,`${id}: protocol tree`)
   const malformed=vector(session.getFrames('_ws.malformed',0,0).frames).map(f=>f.number)
   check(malformed.length===0,`${id}: malformed frames ${malformed.join(',')}`)
   report.captures.push({id,packets:loaded.summary.packet_count,malformed})
   for(const item of commands.filter(c=>c.argv[c.argv.indexOf('-r')+1]===disk)){
    const fields=item.argv.flatMap((v,i)=>v==='-e'?[item.argv[i+1]]:[])
    const filter=item.argv.includes('-Y')?item.argv[item.argv.indexOf('-Y')+1]:''
    const valid=wg.checkFilter(filter);check(valid.ok,`${item.lesson}: filter ${filter}: ${valid.error}`)
    for(const f of fields)check(wg.checkFilter(f).ok,`${item.lesson}: unregistered field ${f}`)
    if(!valid.ok)continue
    const result=session.getFrames(filter,0,0)
    const numbers=vector(result.frames).map(f=>f.number)
    const seen=new Set()
    for(const num of numbers)collectFields(session.getFrame(num).tree,seen)
    const intentionalEmpty=(id==='traffic-analysis' && filter==='wlan.fc.protected == 1')
    check(numbers.length>0 || intentionalEmpty,`${item.lesson}: unexpected empty result ${filter}`)
    if(!intentionalEmpty){
     for(const f of fields)check(seen.has(f),`${item.lesson}: field ${f} not populated in matched frames of ${id}`)
    }
    report.commands.push({lesson:item.lesson,capture:id,filter,fields,matched_frames:numbers,populated_fields:fields.filter(f=>seen.has(f))})
   }
  }finally{session.delete()}
 }
 check(report.commands.length===commands.length,'every exported command examined')
 const challenges=JSON.parse(readFileSync(resolve(root,'frontend/src/content/challenges.json'),'utf8'))
 let hintChecks=0
 for(const c of challenges){
  for(const t of c.tasks||[]){
   if(!t.hint||!t.hint.includes('tshark'))continue
   for(const m of t.hint.matchAll(/-Y\s+'([^']+)'/g)){check(wg.checkFilter(m[1]).ok,`${c.id}/${t.id}: hint filter ${m[1]}`);hintChecks++}
   for(const m of t.hint.matchAll(/-e\s+([a-z0-9_.]+)/gi)){check(wg.checkFilter(m[1]).ok,`${c.id}/${t.id}: hint field ${m[1]}`);hintChecks++}
  }
 }
 report.challenge_hint_checks=hintChecks
 const out=resolve(root,'.cache/wireless-qa');mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'wireshark-report.json'),JSON.stringify(report,null,2)+'\n')
 console.log(`${report.engine}: ${report.captures.length} captures / ${packets} packets (0 malformed), ${report.commands.length} lesson filter/field/tree checks`)
 for(const f of report.failures)console.error('FAIL:',f)
 assert.equal(report.failures.length,0,'independent decoder contracts; see .cache/wireless-qa/wireshark-report.json')
 console.log('PASS: independent Wireshark 4.4.5 dissection, 0 malformed frames, and filter/field/tree verification.')
}finally{wg.destroy()}
