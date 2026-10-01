#!/usr/bin/env python3
"""Package authored WF-OPS-02 sidecars with exact regenerated teaching captures.
--check verifies files, manifest and deterministic ZIP without writing anything.
"""
from pathlib import Path
import argparse, hashlib, io, json, zipfile
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'frontend/public/wireless-practice/WF-OPS-02'
AUTHORED=['README.md','scope.md','capability-cases.json','clock-note.md','client-log.csv','worksheet.md','review-guide.md']
def files():
    result={name:(DEST/name).read_bytes() for name in AUTHORED}
    inventory=json.loads((ROOT/'frontend/src/content/lab-artifacts.json').read_text())['artifacts']
    for name in ('recon-lab','traffic-analysis'):
        result[name+'.pcapng']=(ROOT/'frontend/public/pcaps'/inventory[name]['path']).read_bytes()
        result[name+'.json']=(ROOT/'frontend/public/lab-data'/f'{name}.json').read_bytes()
    result['SHA256SUMS']=''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name,data in sorted(result.items())).encode()
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    content=files();out=io.BytesIO()
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(content.items()):
            info=zipfile.ZipInfo('WF-OPS-02/'+name,(2026,10,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,data)
    outputs={DEST/name:data for name,data in content.items()};outputs[DEST.with_suffix('.zip')]=out.getvalue()
    for path,data in outputs.items():
        if args.check:assert path.exists() and path.read_bytes()==data,f'stale or missing: {path}'
        else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    print(f'PASS: WF-OPS-02 {len(content)} files and deterministic ZIP '+('match' if args.check else 'packaged'))
if __name__=='__main__':main()
