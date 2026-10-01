#!/usr/bin/env python3
"""Release contract for the offline tester workflow. No radio/tool execution implied."""
from pathlib import Path
import csv, hashlib, io, json, re, subprocess, sys, zipfile
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-OPS-02'
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-practice.py'),'--check'],check=True)
checks=0
def check(value,description):
    global checks
    assert value,description
    checks+=1
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
check(len(manifest)==11,'manifest covers all evidence and authored sidecars')
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==12,'complete archive')
    for name in [*manifest,'SHA256SUMS']:
        raw=(CASE/name).read_bytes();check(archive.read('WF-OPS-02/'+name)==raw,name+' archive bytes')
        if name in manifest:check(hashlib.sha256(raw).hexdigest()==manifest[name],name+' hash')
recon=json.loads((CASE/'recon-lab.json').read_text())['frames'];traffic=json.loads((CASE/'traffic-analysis.json').read_text())['frames']
check(len(recon)==17 and len(traffic)==21,'authored frame counts')
check(len({r['bssid'] for r in recon if r['subtype']==8})==6,'six observed BSSs')
check([recon[n-1]['ssid'] for n in (1,2,3,13)]==['LAB-WIFI','LAB-WIFI','','HIDDEN-LAB'],'inventory and hidden response')
for n in (1,2,3,13):
    rsn=recon[n-1]['rsn'];check(rsn['group']==4 and rsn['pairwise']==[4] and rsn['akm']==[2] and rsn['caps']==128,'in-scope advertised policy')
check(not any(r.get('eapol') for r in recon),'no key exchange in recon scene')
check([r['subtype'] for r in recon[13:17]]==[11,11,0,1],'CLIENT-A authentication/association citations')
check(traffic[6]['subtype']==1 and traffic[6]['capture_timestamp_us']==1700000000014000,'association response time')
check(all(r.get('eapol') for r in traffic[7:11]),'four EAPOL citations')
check(all(not r['protected'] for r in traffic[11:]),'intentionally unprotected fixture, not CCMP data')
check(traffic[11]['protocol']=='DHCP' and traffic[11]['relative_time_ms']==22,'frame12 and relative epoch')
log=list(csv.DictReader(io.StringIO((CASE/'client-log.csv').read_text())))
time=datetime.fromisoformat(log[1]['client_clock_utc'].replace('Z','+00:00'))
# Integer arithmetic, independent of the PCAP writer/decoder.
us=int((time-datetime(1970,1,1,tzinfo=timezone.utc)).total_seconds()*1000000)-1500000
check(us==1700000000030000,'offset direction and L2 normalization')
check([r['number'] for r in traffic if us-5000<=r['capture_timestamp_us']<=us+5000]==[13,14,15,16,17],'uncertain event ordering')
check(len(json.loads((CASE/'capability-cases.json').read_text())['profiles'])==3,'three diagnostic cases')
ms=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wireless=[m for m in ms if m['learningPathId']=='wireless-pentesting']
check(len(wireless)==15 and sum(len(m['lessons']) for m in wireless)==53,'released catalogue is not proposed twenty-module runtime')
check([m['id'][:2] for m in wireless if m['phase']<=2]==['01','02','03','04','05','06'],'Preview boundary preserved')
for mid,lid in [('04-kali-wireless-setup','03-capability-troubleshooting'),('05-wireless-recon','02-coverage-and-inventory'),('06-traffic-analysis','02-timeline-and-evidence-handoff')]:
    m=next(m for m in ms if m['id']==mid);check(any(l['id']==lid for l in m['lessons']),mid+' stable new lesson')
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text()
    check('NOT TESTED' in text or 'not executed' in text,'execution boundaries '+mid)
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'file link '+url)
for name in ('PathDetail','ModuleDetail','Labs','Challenges','ChallengeDetail'):
    check('<PracticeAvailability' in (ROOT/f'frontend/src/pages/{name}.tsx').read_text(),name+' visible delivery contract')
check('wireless-practice/' in (ROOT/'frontend/public/sw.js').read_text(),'case files bypass SPA navigation')
print(f'PASS: {checks} tester-workflow pack, semantic, clock, link, Preview and availability contracts')
