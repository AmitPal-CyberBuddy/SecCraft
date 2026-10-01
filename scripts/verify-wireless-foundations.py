#!/usr/bin/env python3
"""Independent literal-byte contract for WF-FND-01; no import of its generator/parser.
Verifies container/timestamps, address roles, IEs, source/exports/claims and lesson links.
"""
from pathlib import Path
import csv
import hashlib
import json
import re
import struct
import subprocess
import sys
import zipfile
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
PACK=ROOT/'frontend/public/wireless-foundations/WF-FND-01'
checks=0

def check(condition,message):
    global checks
    checks+=1
    if not condition: raise AssertionError(message)

def u16(data,offset=0): return int.from_bytes(data[offset:offset+2],'little')
def mac(data): return ':'.join(f'{part:02x}' for part in data)

def parse(data):
    cursor=0; packets=[]; blocks=[]
    while cursor<len(data):
        kind,length=struct.unpack_from('<II',data,cursor)
        check(length>=12 and length%4==0 and cursor+length<=len(data),'bounded aligned PCAPNG block')
        check(struct.unpack_from('<I',data,cursor+length-4)[0]==length,'matching block trailer')
        body=data[cursor+8:cursor+length-4];blocks.append(kind)
        if kind==0x0a0d0d0a: check(body[:4]==b'\x4d\x3c\x2b\x1a','little-endian PCAPNG')
        elif kind==1:
            check(u16(body)==127,'radiotap linktype')
            check(body[8:16]==b'\x09\x00\x01\x00\x06\0\0\0','microsecond timestamp resolution')
        elif kind==6:
            interface,hi,lo,caplen,origlen=struct.unpack_from('<IIIII',body)
            check(interface==0 and caplen==origlen and caplen<=len(body)-20,'full unsliced packet')
            pkt=body[20:20+caplen];rtlen=u16(pkt,2)
            check(rtlen>=8 and rtlen+24<=len(pkt),'radiotap and management header length')
            raw=pkt[rtlen:];sub=raw[0]>>4;payload=raw[24:]
            check((raw[0] & 15)==0 and raw[1]==0,'management-only unprotected synthetic frame')
            row={'frame':len(packets)+1,'timestamp_epoch_us':(hi<<32)|lo,'type':0,'subtype':sub,'destination':mac(raw[4:10]),'source':mac(raw[10:16]),'bssid_field':mac(raw[16:22]),'frequency_mhz':u16(pkt,18),'signal_dbm':struct.unpack_from('<b',pkt,22)[0]}
            starts={8:12,5:12,4:0,0:4,1:6}
            if sub in starts:
                i=starts[sub];seen=set()
                while i<len(payload):
                    check(i+2<=len(payload),'IE header present')
                    tag,size=payload[i:i+2];v=payload[i+2:i+2+size]
                    check(len(v)==size and tag not in seen,'IE length and uniqueness');seen.add(tag);i+=size+2
                    if tag==0:row['ssid']=v.decode()
                    if tag==3:row['advertised_channel']=v[0]
                    if tag==48:
                        check(len(v)==20 and v[:2]==b'\x01\x00','literal RSN shape')
                        check(v[2:6]==bytes.fromhex('000fac04'),'group CCMP type is byte 5, not last OUI byte')
                        check(v[6:18]==bytes.fromhex('0100000fac040100000fac02'),'one CCMP pairwise and one PSK AKM')
                        caps=u16(v,18);check(caps in (0x80,0xc0),'literal IEEE PMF masks')
                        row.update(group_cipher=4,pairwise_cipher=4,akm=2,rsn_capabilities=caps)
            if sub==11: row.update(authentication_algorithm=u16(payload),authentication_sequence=u16(payload,2),status_code=u16(payload,4))
            if sub==1: row['status_code']=u16(payload,2)
            if sub==12: row['reason_code']=u16(payload)
            packets.append(row)
        else: raise AssertionError('unexpected block')
        cursor+=length
    check(blocks[:2]==[0x0a0d0d0a,1] and all(k==6 for k in blocks[2:]),'one section/interface followed by packets')
    return packets

subprocess.run([sys.executable,str(ROOT/'scripts/generate-wireless-foundations.py'),'--check'],check=True)
manifest={}
for line in (PACK/'SHA256SUMS').read_text().splitlines():
    digest,name=line.split('  ',1)
    check('/' not in name and name not in manifest,'safe unique manifest name')
    manifest[name]=digest
    check(hashlib.sha256((PACK/name).read_bytes()).hexdigest()==digest,f'hash: {name}')
check(set(manifest)=={p.name for p in PACK.iterdir() if p.is_file() and p.name!='SHA256SUMS'},'manifest covers all pack files')
with zipfile.ZipFile(PACK.parent/'WF-FND-01.zip') as z:
    check(set(z.namelist())=={'WF-FND-01/'+name for name in [*manifest,'SHA256SUMS']},'archive contains exactly the case and manifest')
    for name in [*manifest,'SHA256SUMS']:check(z.read('WF-FND-01/'+name)==(PACK/name).read_bytes(),'archive bytes match published files')
base=parse((PACK/'baseline.pcapng').read_bytes());follow=parse((PACK/'follow-up.pcapng').read_bytes())
check([p['subtype'] for p in base]==[8,8,8,8,4,5,11,11,0,1,4,8,12],'baseline teaching sequence')
check([p['subtype'] for p in follow]==[8,8,8],'follow-up only advertises; no fabricated client retest')
start=int(datetime(2026,9,1,9,tzinfo=timezone.utc).timestamp())*1000000
for name,rows,offset in [('baseline',base,0),('follow-up',follow,60000000)]:
    check([p['timestamp_epoch_us'] for p in rows]==[start+offset+i*2000 for i in range(1,len(rows)+1)],'absolute timestamp and monotonic 2ms interval')
    check(json.loads((PACK/(name+'-frames.json')).read_text())['frames']==rows,'derived export matches independent decode')
check(base[0]['ssid']=='' and base[5]['ssid']=='Aster-Lab' and base[8]['ssid']=='Aster-Lab','hidden-name evidence is linked')
check(base[0]['bssid_field']==base[5]['bssid_field']==base[8]['bssid_field'],'same hidden BSS')
check(base[1]['rsn_capabilities']==0xc0 and base[0]['rsn_capabilities']==0x80,'distinct PMF advertisements')
check(base[6]['authentication_sequence']==1 and base[7]['authentication_sequence']==2 and base[9]['status_code']==0,'MAC auth and association status')
check(base[10]['ssid']=='' and int(base[10]['source'][:2],16)&2,'wildcard locally administered observation')
check(base[12]['reason_code']==7,'deauthentication observation')
check(follow[0]['ssid']=='Aster-Lab' and follow[0]['rsn_capabilities']==base[0]['rsn_capabilities'],'only visibility changed on AP-A')
for i in range(3):check(base[i]['bssid_field']==follow[i]['bssid_field'],'follow-up source correlation')
inv=list(csv.DictReader((PACK/'authorized-inventory.csv').open()))
check([row['address'] for row in inv[:2]]==[base[0]['source'],base[1]['source']],'listed multi-BSSID ESS')
check(base[2]['source'] not in {row['address'] for row in inv},'unlisted look-alike retained')
check(base[4]['source']==inv[2]['address']==base[8]['source']==base[9]['destination'],'training station roles')
modules=json.loads((ROOT/'frontend/src/content/modules.json').read_text());paths=json.loads((ROOT/'frontend/src/content/learning-paths.json').read_text())
w=next(p for p in paths if p['id']=='wireless-pentesting');wm=[m for m in modules if m['learningPathId']==w['id']]
check(len(wm)==15 and sum(len(m['lessons']) for m in wm)==53,'released modules/lessons, not proposed twenty')
check([p['id'] for p in w['phases']]==list(range(1,8)),'seven phases')
check([mid for p in w['phases'] for mid in p['modules']]==w['modules'],'phase ordering covers each module once')
check([m['id'] for m in wm if m['phase']<=2]==w['modules'][:6],'same six Preview modules')
for phase in w['phases']:
    for mid in phase['modules']:
        m=next(m for m in wm if m['id']==mid);check(m['phase']==phase['id'] and m['phaseName']==phase['name'],'module/path grouping agrees')
for mid,lid in [('01-intro-wireless','02-scope-and-assessment-decisions'),('02-wifi-fundamentals','02-rf-and-client-observation'),('03-80211-architecture','03-foundations-independent-case')]:
    m=next(m for m in wm if m['id']==mid);check(lid in [l['id'] for l in m['lessons']],'new lesson registered')
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text()
    for href in re.findall(r'\]\((/wireless-foundations/[^)]+)\)',text):check((ROOT/'frontend/public'/href.lstrip('/')).is_file(),'lesson asset exists')
    check('self-review' in text.lower() or 'local participation' in text,'honest practice contract')
print(f'PASS: {checks} foundations artifact, timestamp, semantic, export, phase, preview and link checks')
