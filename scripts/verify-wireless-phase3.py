#!/usr/bin/env python3
"""Independent known answers, bounded execution, case links and policy contracts."""
import hashlib, hmac, importlib.util, json, re, struct, subprocess, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-AUTH-03'
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-auth.py'),'--check'],check=True)
checks=0
def check(value, name):
    global checks
    assert value,name
    checks+=1
spec=importlib.util.spec_from_file_location('auth_audit',CASE/'audit.py');audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
# Published WPA PBKDF2 known answer and RFC 2202 HMAC-SHA1 test case 1.
check(hashlib.pbkdf2_hmac('sha1',b'password',b'IEEE',4096,32).hex()=='f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e','PBKDF2 known answer')
check(hmac.new(bytes([11])*20,b'Hi There',hashlib.sha1).hexdigest()=='b617318655057264e28bc0b6fb378c8ef146be00','RFC HMAC known answer')
expected={'G1':[2],'I1':[3],'I2':[]}
for mode in ['guided','independent']:
    rows=json.loads(subprocess.check_output([sys.executable,str(CASE/'audit.py'),mode]))
    for row in rows:
        check(row['matching_candidate_lines']==expected[row['id']],row['id']+' candidate result')
        check(row['candidates_tested']==3 and row['live_association']=='NOT TESTED','bounded result')
    records=json.loads((CASE/(mode+'.json')).read_text())['records']
    for r in records:
        credential={'G1':'SummerLab2026!','I1':'WinterLab2026!','I2':'case-only-outside-list-04!'}[r['id']]
        check(audit.verify(credential,r),'known fixture password')
        check(not audit.verify(credential,{**r,'ssid':r['ssid']+'-other'}),'wrong SSID negative control')
        check(not audit.verify(credential,{**r,'pmkid':'00'*16}),'bad verifier negative control')
        check(not audit.verify(credential,{**r,'ap':'02:00:00:30:10:ff'}),'wrong AP negative control')
        if '--openssl' in sys.argv:
            key=subprocess.check_output(['openssl','kdf','-keylen','32','-kdfopt','digest:SHA1','-kdfopt','pass:'+credential,'-kdfopt','salt:'+r['ssid'],'-kdfopt','iter:4096','PBKDF2']).decode().strip().replace(':','')
            msg=b'PMK Name'+bytes.fromhex(r['ap'].replace(':',''))+bytes.fromhex(r['station'].replace(':',''))
            mac=subprocess.check_output(['openssl','dgst','-sha1','-mac','HMAC','-macopt','hexkey:'+key,'-binary'],input=msg)
            check(mac[:16].hex()==r['pmkid'],'OpenSSL external cross-check')
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==16,'complete archive')
    for name in [*manifest,'SHA256SUMS']:
        raw=(CASE/name).read_bytes();check(archive.read('WF-AUTH-03/'+name)==raw,'archived '+name)
        if name in manifest:check(hashlib.sha256(raw).hexdigest()==manifest[name],'hashed '+name)
for name,akm,caps in [('wpa3-only',[8],192),('wpa3-transition',[2,8],128)]:
    row=json.loads((CASE/(name+'.json')).read_text())['frames'][0]['rsn'];check(row['akm']==akm and row['caps']==caps,'policy '+name)
wps=json.loads((CASE/'wps-beacon.json').read_text())['frames']
check([r['wps_attrs']['setup_locked'] for r in wps[:2]]==[False,True],'explicit WPS lock states')
check([r['wps_attrs']['version'] for r in wps[:2]]==['10','10'],'one-byte WPS version, not attribute ID')
# Independently inspect every generated WPS IE: the attribute ID is 0x104a, value is 0x10.
from wififorge_labkit import ie_wps
for locked in [False,True]:
    blob=ie_wps(setup_locked=locked,selected_registrar=not locked);check(blob[:6]==bytes.fromhex('dd')+bytes([len(blob)-2])+bytes.fromhex('0050f204'),'vendor header')
    attrs={};offset=6
    while offset<len(blob):
        key,length=struct.unpack_from('!HH',blob,offset);offset+=4;attrs[key]=blob[offset:offset+length];offset+=length
    check(attrs[0x104a]==b'\x10' and attrs[0x1057]==bytes([locked]) and attrs[0x1041]==bytes([not locked]),'literal WSC TLV fields')
w2=json.loads((CASE/'wps-observations.json').read_text());check(w2['maximum_attempts']==3 and w2['assumed_cooldown_seconds_for_planning_only']>w2['authorized_window_seconds']-80,'stop budget and cooldown')
modules=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wireless=[m for m in modules if m['learningPathId']=='wireless-pentesting']
check(len(wireless)==15 and sum(len(m['lessons']) for m in wireless)==53,'current catalogue')
check([m['id'][:2] for m in wireless if m['phase']<=2]==['01','02','03','04','05','06'],'Preview not expanded')
for mid,lid in [('08-wpa-wpa2','04-bounded-candidate-audit'),('10-wps','02-applicability-lockout-and-budget'),('11-wpa3','02-policy-negotiation-and-negative-controls')]:
    check(any(l['id']==lid for m in modules if m['id']==mid for l in m['lessons']),'new lesson registration')
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text();check('NOT TESTED' in text,'execution boundary')
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'case link '+url)
print(f'PASS: {checks} Phase 3 crypto, negative-control, bounded execution, WPS, archive, policy, link and compatibility checks')
