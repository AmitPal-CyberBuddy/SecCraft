#!/usr/bin/env python3
"""Local public-certificate checks only. Requires OpenSSL 3; no network or EAP session."""
import argparse, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent
CASES=['server-good.pem','server-wrong-name.pem','server-untrusted.pem','server-expired.pem','client-only.pem']
def run(policy):
    if policy not in ('ca-only','strict'):raise ValueError('unknown teaching policy')
    results=[]
    for name in CASES:
        args=['openssl','verify','-no-CApath','-no-CAstore','-CAfile',str(ROOT/'trusted-root.pem'),'-purpose','sslserver','-attime','1790812800']
        if policy=='strict':args+=['-verify_hostname','aaa.lab.example']
        args.append(str(ROOT/name))
        result=subprocess.run(args,capture_output=True,text=True,timeout=10)
        if result.returncode not in (0,2):raise RuntimeError('OpenSSL could not perform verification: '+result.stderr)
        results.append({'certificate':name,'accepted_by_local_verifier':result.returncode==0,'detail':(result.stdout+result.stderr).strip()})
    return {'method':'Executed local OpenSSL certificate-file checks, not an EAP client','policy':policy,'reference_time_utc':'2026-10-01T00:00:00Z','live_EAP':'NOT TESTED','results':results}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('policy',choices=['ca-only','strict']);args=parser.parse_args()
    try:print(json.dumps(run(args.policy),indent=2))
    except (FileNotFoundError,RuntimeError,subprocess.TimeoutExpired) as error:parser.exit(1,str(error)+'\nUse supplied reference results and label them as review, not execution.\n')
