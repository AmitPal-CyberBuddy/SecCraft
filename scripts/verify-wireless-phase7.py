#!/usr/bin/env python3
"""Check the public review dossier; never grade a learner or certify execution."""
import hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-REVIEW-07';checks=0
def check(value,name):
    global checks
    assert value,name
    checks+=1
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-review.py'),'--check'],check=True)
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==11,'complete dossier')
    for name in [*manifest,'SHA256SUMS']:
        data=(CASE/name).read_bytes();check(archive.read('WF-REVIEW-07/'+name)==data,'archive bytes '+name)
        if name in manifest:check(hashlib.sha256(data).hexdigest()==manifest[name],'hash '+name)
def read(name):return json.loads((CASE/name).read_text())
b=read('capstone-baseline.json')['frames'];a=read('capstone-retest.json')['frames'];ref=read('reference-review.json')
check(len(b)==11 and len(a)==3,'frame counts')
for frames in [b,a]:
    check(len({x['bssid'] for x in frames})==3,'three BSSIDs')
    check([f['subtype_name'] for f in frames[:3]]==['Beacon']*3,'inventory beacons')
check(b[0]['bssid']==a[0]['bssid']=='02:aa:10:00:00:01','same owned BSSID')
check(b[0]['rsn']['akm']==[2] and b[0]['rsn']['mfpc'] and not b[0]['rsn']['mfpr'],'baseline offered policy')
check(a[0]['rsn']['akm']==[8] and a[0]['rsn']['mfpc'] and a[0]['rsn']['mfpr'],'staged offered policy')
for frames in [b,a]:
    check(frames[1]['bssid']=='02:aa:10:00:00:02' and frames[1]['rsn']['akm']==[1] and frames[1]['rsn']['mfpr'],'narrow CORP non-finding')
    check(frames[2]['bssid']=='02:aa:10:00:00:09' and frames[2]['ssid']==frames[0]['ssid'] and frames[2]['rsn']['akm']==[2],'unresolved same-name BSS')
check(all(f['subtype_name']=='Beacon' for f in a),'no post-change client evidence')
check(ref['live_runtime']=='NOT TESTED','no runtime claim')
check([c['status'] for c in ref['claims']]==['SUPPORTED','INSUFFICIENT_EVIDENCE','SUPPORTED','NOT_TESTED'],'bounded reference statuses')
for claim in ref['claims']:
    check(bool(claim['missing']),'missing evidence explicit')
    for source in claim['sources']:
        frames=read(source['file'])['frames'];check(any(f['number']==source['frame'] for f in frames),'citation exists')
check([(s['file'],s['frame']) for s in ref['claims'][0]['sources']]==[('capstone-baseline.json',1),('capstone-retest.json',1)],'comparison citations')
check([s['frame'] for s in ref['claims'][1]['sources']]==[3,3],'ownership citations')
check([s['frame'] for s in ref['claims'][2]['sources']]==[2,2],'non-finding citations')
check(not ref['claims'][3]['sources'],'no invented live evidence')
modules=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wm=[m for m in modules if m['learningPathId']=='wireless-pentesting']
check(len(wm)==15 and sum(len(m['lessons']) for m in wm)==53,'current catalogue')
check([m['id'][:2] for m in wm if m['phase']<=2]==['01','02','03','04','05','06'],'Preview unchanged')
m=next(m for m in wm if m['id']=='20-final-assessment');check(len(m['lessons'])==5,'stable module plus three lessons')
for lesson in m['lessons'][2:]:
    text=(ROOT/f"frontend/src/content/lessons/{m['id']}/{lesson['id']}.md").read_text()
    check('NOT TESTED' in text and 'WF-REVIEW-07' in text,'availability and case')
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'download '+url)
check('Open professional review case' in (ROOT/'frontend/src/pages/PathDetail.tsx').read_text(),'phase map entry')
check('SELF-REVIEW' in (CASE/'review-guide.md').read_text(),'review identity honest')
check('Northwind' in (CASE/'scope.md').read_text() and 'planning-only' in (CASE/'scope.md').read_text(),'separate planning brief')
print(f'PASS: {checks} Phase 7 dossier, citation, non-finding, limit, catalogue and download checks')
