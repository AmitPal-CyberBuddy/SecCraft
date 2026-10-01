#!/usr/bin/env python3
"""Enterprise case: actual local X.509 checks, raw AAA integrity and bounded content."""
import hashlib, importlib.util, json, re, subprocess, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-ENT-05'
checks=0
def check(value,name):
    global checks
    assert value,name
    checks+=1
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-enterprise.py'),'--check'],check=True)
from wififorge_labkit import mschapv2_credentials
for user in ['User', 'DOMAIN\\User']:
    response,_,challenge=mschapv2_credentials('clientPass',bytes.fromhex('5B5D7C7D7B3F2F3E3C2C602132262628'),bytes.fromhex('21402324255E262A28295F2B3A337C7E'),user)
    check(challenge.hex()=='d02e4386bce91226' and response.hex()=='82309ecd8d708b5ea08faa3981cd83544233114a3d85d6df','RFC 2759 domain-qualified known answer')
expected=json.loads((CASE/'reference-results.json').read_text())
for policy in ['ca-only','strict']:
    actual=json.loads(subprocess.check_output([sys.executable,str(CASE/'check-certificates.py'),policy]))
    check(actual['live_EAP']=='NOT TESTED' and actual['reference_time_utc']==expected['reference_time_utc'],'explicit test mode/time')
    for row in actual['results']:
        check(row['accepted_by_local_verifier']==expected[policy][row['certificate']],policy+' '+row['certificate'])
        if row['certificate']=='server-wrong-name.pem' and policy=='strict':check('hostname mismatch' in row['detail'],'wrong-name rejection reason')
        if row['certificate']=='server-expired.pem':check('expired' in row['detail'],'expiry rejection reason')
        if row['certificate']=='client-only.pem':check('unsuitable certificate purpose' in row['detail'],'purpose rejection reason')
        if row['certificate']=='server-untrusted.pem':check('unable to get local issuer certificate' in row['detail'],'untrusted-issuer reason')
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==21,'archive count')
    for name in [*manifest,'SHA256SUMS']:
        data=(CASE/name).read_bytes();check(archive.read('WF-ENT-05/'+name)==data,'archive '+name)
        if name in manifest:check(hashlib.sha256(data).hexdigest()==manifest[name],'hash '+name)
        check(b'PRIVATE KEY-----' not in data,'no private key '+name)
wire=load('radius_wire',ROOT/'scripts/verify-radius-wire.py');items=list(wire.packets());check(wire.verify(items)==4,'raw AAA verification')
for label,index,offset in [('reply ID',1,1),('reply authenticator',1,4),('accounting code',6,0)]:
    modified=list(items);flow,packet=modified[index];raw=bytearray(packet);raw[offset]^=64;modified[index]=(flow,bytes(raw))
    try:wire.verify(modified)
    except AssertionError:check(True,'reject mutated '+label)
    else:check(False,'accepted mutated '+label)
# Recompute outer response MD5 after corrupting its Message-Authenticator, so
# the HMAC check itself must catch the corruption (not merely the outer digest).
modified=list(items);flow,packet=modified[1];raw=bytearray(packet);off=next(off for typ,off,v in wire.attributes(packet) if typ==80);raw[off]^=1
raw[4:20]=hashlib.md5(raw[:4]+items[0][1][4:20]+raw[20:]+b'testing123').digest();modified[1]=(flow,bytes(raw))
try:wire.verify(modified)
except AssertionError:check(True,'response HMAC independently checked')
else:check(False,'invalid response HMAC accepted')
model=json.loads((CASE/'policy-model.json').read_text());check(model['runtime']=='NOT TESTED','model not executed')
check([x['id'] for x in model['cases']]==['S1','S2','S3','S4'],'four model branches')
check(model['cases'][3]['model_AP'] is None and model['cases'][3]['model_switch'] is None,'missing enforcement evidence retained')
for name,count in [('enterprise',11),('eap',12),('radius',10)]:
    frames=json.loads((CASE/(name+'.json')).read_text())['frames'];check(len(frames)==count,'packet count '+name)
radius=json.loads((CASE/'radius.json').read_text())['frames']
check(radius[6]['radius_code']==2 and radius[6]['eap_type'] is None,'EAP Success has no Type')
check(radius[7]['radius_code']==4,'Accounting Request is code 4')
ms=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wm=[m for m in ms if m['learningPathId']=='wireless-pentesting']
check(len(wm)==15 and sum(len(m['lessons']) for m in wm)==53,'current modules and lessons')
check([m['id'][:2] for m in wm if m['phase']<=2]==['01','02','03','04','05','06'],'Preview unchanged')
mid='15-enterprise-fundamentals'
for lid in ['04-method-selection-and-trust-boundaries','05-certificate-identity-validation','06-radius-to-applied-policy']:
    check(any(l['id']==lid for m in ms if m['id']==mid for l in m['lessons']),'registered '+lid)
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text();check('NOT TESTED' in text,'execution boundary')
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'link '+url)
if '--cert-generator' in sys.argv:
    subprocess.run([sys.executable,str(ROOT/'scripts/generate-enterprise-certificates.py'),'--check'],check=True)
    check(True,'certificate byte reproducibility')
if '--scapy' in sys.argv:
    from scapy.all import rdpcap, UDP
    raw=[bytes(p[UDP].payload) for p in rdpcap(str(CASE/'radius.pcapng')) if p.haslayer(UDP)]
    check(raw==[p for flow,p in items],'external UDP/RADIUS payload decode')
print(f'PASS: {checks} Phase 5 certificate, AAA integrity/mutation, archive, model, link and compatibility checks')
