#!/usr/bin/env python3
"""Deterministic Phase 3 case. New verifier records are not capture extracts."""
import argparse, hashlib, hmac, io, json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'frontend/public/wireless-practice/WF-AUTH-03'

def record(id, ssid, suffix, password):
    ap='02:00:00:30:10:'+suffix;sta='02:00:00:30:20:'+suffix
    pmk=hashlib.pbkdf2_hmac('sha1',password.encode(),ssid.encode(),4096,32)
    message=b'PMK Name'+bytes.fromhex(ap.replace(':',''))+bytes.fromhex(sta.replace(':',''))
    return dict(id=id,ssid=ssid,ap=ap,station=sta,pmkid=hmac.new(pmk,message,hashlib.sha1).digest()[:16].hex())

def files():
    result={name:(DEST/name).read_bytes() for name in ['audit.py','candidates.txt','scope.md','wps-observations.json','worksheet.md','review-guide.md']}
    sets={'guided':[record('G1','Aster-Guided','01','SummerLab2026!')], 'independent':[record('I1','Aster-Independent','02','WinterLab2026!'),record('I2','Aster-No-Match','03','case-only-outside-list-04!')]}
    for name,rows in sets.items():result[name+'.json']=(json.dumps({'provenance':'Generated teaching PMKID records, not collected packets','records':rows},indent=2)+'\n').encode()
    reference={'provenance':'Supplied expected outcomes, not a benchmark or learner execution record','G1':[2],'I1':[3],'I2':[],'live_execution':'NOT TESTED'}
    result['reference-results.json']=(json.dumps(reference,indent=2)+'\n').encode()
    inventory=json.loads((ROOT/'frontend/src/content/lab-artifacts.json').read_text())['artifacts']
    for name in ['wps-beacon','wpa3-only','wpa3-transition']:
        result[name+'.pcapng']=(ROOT/'frontend/public/pcaps'/inventory[name]['path']).read_bytes()
        result[name+'.json']=(ROOT/'frontend/public/lab-data'/f'{name}.json').read_bytes()
    result['SHA256SUMS']=''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name,data in sorted(result.items())).encode()
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    content=files();buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w') as archive:
        for name,data in sorted(content.items()):
            info=zipfile.ZipInfo('WF-AUTH-03/'+name,(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;archive.writestr(info,data)
    outputs={DEST/name:data for name,data in content.items()};outputs[DEST.with_suffix('.zip')]=buffer.getvalue()
    for path,data in outputs.items():
        if args.check:assert path.is_file() and path.read_bytes()==data,f'stale {path}'
        else:path.write_bytes(data)
    print(f'PASS: WF-AUTH-03 {len(content)} files / deterministic ZIP '+('match' if args.check else 'packaged'))
if __name__=='__main__':main()
