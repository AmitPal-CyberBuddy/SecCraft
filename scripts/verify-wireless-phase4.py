#!/usr/bin/env python3
"""Phase 4 fixture, address-role, policy-reasoning and compatibility contracts."""
import csv, hashlib, json, re, struct, subprocess, sys, zipfile
from pathlib import Path
from wififorge_labkit import decode, radiotap
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-TRUST-04'
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-trust.py'),'--check'],check=True)
checks=0
def check(value,name):
    global checks
    assert value,name
    checks+=1
# Literal three/four-address 802.11 headers, not the generator's frame builder.
addresses=['02:00:00:00:00:'+x for x in ['01','02','03','04']]
for flags,expected in [(0,(2,1,0)),(1,(0,1,2)),(2,(1,2,0)),(3,(None,3,2))]:
    body=struct.pack('<HH',8|(flags<<8),0)+b''.join(bytes.fromhex(a.replace(':','')) for a in addresses[:3])+b'\0\0'
    if flags==3:body+=bytes.fromhex(addresses[3].replace(':',''))
    row=decode(radiotap(2437,-40)+body)
    for field,index in zip(['bssid','sa','da'],expected):check(row[field]==(addresses[index] if index is not None else None),f'DS {flags} {field}')
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
check(len(manifest)==14,'case manifest')
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==15,'archive count')
    for name in [*manifest,'SHA256SUMS']:
        data=(CASE/name).read_bytes();check(archive.read('WF-TRUST-04/'+name)==data,'archive '+name)
        if name in manifest:check(hashlib.sha256(data).hexdigest()==manifest[name],'digest '+name)
rows={n:json.loads((CASE/(n+'.json')).read_text())['frames'] for n in ['deauth','rogue-ap','captive-portal']}
check([len(x) for x in rows.values()]==[22,20,17],'source frame counts')
d=rows['deauth'];check([r['rsn']['caps'] for r in d[:2]]==[128,192],'advertised PMF')
check([r['reason'] for r in d[14:18]]==[7,7,8,15],'cited management reasons')
check(all(r['action_category']==8 and not r['protected'] for r in d[20:22]),'SA Query shaped, unprotected examples')
r=rows['rogue-ap'];check(r[0]['ssid']==r[1]['ssid'] and [x['rsn']['akm'] for x in r[:2]]==[[1],[2]],'same-name policy difference')
check([x['subtype'] for x in r[6:10]]==[11,11,0,1] and all(x.get('eapol') for x in r[10:14]),'constructed association/key sequence')
check(all(not x['protected'] for x in r[14:]),'post-key plaintext is explicitly a simplification')
owner=list(csv.DictReader((CASE/'owner-inventory.csv').read_text().splitlines()));check([x['bssid'] for x in owner]==[x['bssid'] for x in r[:2]],'owner rows identify observation not authenticate transmitter')
p=rows['captive-portal'];ap='de:ad:be:ef:00:02';a='12:34:56:78:9a:bc';b='02:66:77:88:99:aa';broadcast='ff:ff:ff:ff:ff:ff'
expected=[(ap,a,broadcast,True,False,a,broadcast),(b,ap,a,False,True,a,b),(ap,b,a,True,False,b,a),(a,ap,b,False,True,b,a)]
for row,expect in zip(p[13:],expected):
    check(tuple(row[k] for k in ['addr1','addr2','addr3','to_ds','from_ds','sa','da'])==expect,'portal hop '+str(row['number']))
    check(row['bssid']==ap and row['protocol']=='ARP','stable AP identity per DS role')
    check(int(row['addr2'][:2],16)&1==0,'unicast transmitter')
check([x.get('http_method') or x.get('http_status') for x in p[9:13]]==['GET','302','POST','200'],'HTTP packet citations')
policy=json.loads((CASE/'portal-policy.json').read_text());obs=json.loads((CASE/'portal-observations.json').read_text());rules={x['id']:x for x in policy['rules']}
result={x['id']:('inconclusive' if x['model_decision'] is None else 'consistent' if x['model_decision']==rules[x['rule']]['expected'] else 'contradicts') for x in obs['observations']}
check(result==dict(R1='consistent',R2='consistent',R3='consistent',R4='consistent',R5='contradicts',R6='inconclusive',R7='contradicts'),'policy model includes secure, contradicted and inconclusive branches')
for name in ['client-cases','management-outcomes','portal-policy','portal-observations']:
    data=json.loads((CASE/(name+'.json')).read_text());check(data['runtime']=='NOT TESTED' and data['provenance'],'explicit model provenance '+name)
models=json.loads((CASE/'management-outcomes.json').read_text())['cases'];check(models[0]['client_state'] is None and models[1]['client_state_before']==models[1]['client_state_after'] and models[2]['clock_uncertainty_ms']==500,'effect, secure-control and causal limits')
ms=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wireless=[m for m in ms if m['learningPathId']=='wireless-pentesting']
check(len(wireless)==15 and sum(len(m['lessons']) for m in wireless)==53,'current release count')
check([m['id'][:2] for m in wireless if m['phase']<=2]==['01','02','03','04','05','06'],'Preview preserved')
for mid,lid in [('12-deauth-disassoc','03-management-effects-and-controls'),('12-deauth-disassoc','04-client-trust-and-attribution'),('14-captive-portals','02-session-and-boundary-evidence')]:
    check(any(l['id']==lid for m in ms if m['id']==mid for l in m['lessons']),'lesson registered')
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text();check('NOT TESTED' in text,'execution boundary')
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'case link '+url)
if '--scapy' in sys.argv:
    from scapy.all import rdpcap, Dot11, ARP
    packets=rdpcap(str(CASE/'captive-portal.pcapng'))
    for packet,row,expect in zip(packets[13:],p[13:],expected):
        dot=packet[Dot11];check((dot.addr1,dot.addr2,dot.addr3)==expect[:3],'external address decode')
        check((int(dot.FCfield)&3)==(1 if row['to_ds'] else 2),'external DS bits')
        arp=packet[ARP];check(arp.hwsrc==row['sa'] and int(arp.op)==(1 if row['number']<=15 else 2),'external ARP source/op')
    check(bytes(packets[13][ARP])==bytes(packets[14][ARP]) and bytes(packets[15][ARP])==bytes(packets[16][ARP]),'forwarded ARP payloads identical')
print(f'PASS: {checks} Phase 4 archive, literal address-role, packet, policy/model, lesson and compatibility checks')
