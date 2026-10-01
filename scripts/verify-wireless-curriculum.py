#!/usr/bin/env python3
"""Cross-phase content contracts. Optional --tshark executes ONLY allowlisted file reads.
Static checks do not certify teaching quality, standards compliance or field competence.
"""
import argparse, json, re, shlex, shutil, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'frontend/public'
parser=argparse.ArgumentParser();mode=parser.add_mutually_exclusive_group();mode.add_argument('--tshark',action='store_true');mode.add_argument('--commands-json',action='store_true',help='Export validated file-read arguments for independent decoder QA');args=parser.parse_args()
mods=[m for m in json.loads((ROOT/'frontend/src/content/modules.json').read_text()) if m['learningPathId']=='wireless-pentesting']
lessons={(m['id'],l['id']):ROOT/f"frontend/src/content/lessons/{m['id']}/{l['id']}.md" for m in mods for l in m['lessons']}
checks=0;commands=[]
def check(value,label):
 global checks
 assert value,label
 checks+=1
check(len(mods)==15 and len(lessons)==53,'stable module/lesson count')
for key,p in lessons.items():
 text=p.read_text();check(text.startswith('# '),str(p)+' title')
 check(len(re.findall(r'^# ',re.sub(r'```.*?```','',text,flags=re.S),re.M))==1,str(p)+' one lesson heading')
 check(len(text.split('```'))%2==1,str(p)+' balanced code fences')
 check(not re.search(r'(?<!rsna_)eapol\.keydes\.(key_info|nonce|key_mic|key_data)',text),str(p)+' no obsolete RSNA fields')
 check('radius.message_authenticator' not in text and "-Y 'bootp'" not in text,str(p)+' current examples')
 for href in re.findall(r'\]\(([^)]+)\)',text):
  url=urlparse(href)
  if href.startswith('/wireless-'):check((PUBLIC/unquote(url.path).lstrip('/')).is_file(),'download '+href)
  elif href.startswith('/paths/'):
   pieces=url.path.strip('/').split('/');lid=parse_qs(url.query).get('lesson',[None])[0]
   check(len(pieces)==4 and (pieces[-1],lid) in lessons,'lesson crosslink '+href)
 for block in re.findall(r'```bash\n(.*?)```',text,re.S):
  result=subprocess.run(['bash','-n'],input=block,text=True,capture_output=True);check(result.returncode==0,str(p)+' shell syntax '+result.stderr)
  for line in block.replace('\\\n',' ').splitlines():
   if not line.strip().startswith('tshark '):continue
   tokens=shlex.split(line,comments=True)
   if tokens==['tshark','--version']:continue
   check('-r' in tokens,'explicit offline file '+str(p))
   # Never run shell text, assignments, pipes, capture interfaces or arbitrary tool options.
   allowed={'-r','-Y','-T','-e'};out=[];i=1
   while i<len(tokens):
    opt=tokens[i]
    if opt=='-V':out.append(opt);i+=1;continue
    check(opt in allowed and i+1<len(tokens),'read-only option '+opt)
    value=tokens[i+1]
    if opt=='-r':
     if value=='$f':value='frontend/public/pcaps/wifi-fundamentals/beacon-only.pcapng'
     target=ROOT/value
     if not target.is_file():
      candidates=list((PUBLIC/'pcaps').rglob(Path(value).name));check(len(candidates)==1,'capture resolves '+value);target=candidates[0]
     check(target.resolve().is_relative_to(PUBLIC.resolve()) and target.suffix=='.pcapng','bounded stored PCAP')
     value=str(target)
    out.extend([opt,value]);i+=2
   commands.append((p,out))
texts={k:p.read_text() for k,p in lessons.items()}
check('RC4(IV ‖ K)' in texts['07-wep-legacy','01-wep-design-failure'],'WEP seed order')
check('WNM/BSS transition (10)' in texts['03-80211-architecture','01-frames-ies-and-association'],'action category')
check('48-byte CCMP-128' in texts['08-wpa-wpa2','01-rsn-key-hierarchy'],'scoped PTK lengths')
check('not an equivalent DNS identity control' in texts['15-enterprise-fundamentals','01-methods-and-credential-exposure'],'subject substring not DNS validation')
check('No actual certificates or managed profiles are shipped' not in '\n'.join(texts.values()),'no stale certificate availability')
for mid,first,second in [('08-wpa-wpa2','02-pmkid-clientless-lab','01-offline-audit-lab'),('15-enterprise-fundamentals','05-certificate-identity-validation','02-cert-validation-and-lab'),('15-enterprise-fundamentals','06-radius-to-applied-policy','02-enterprise-testing-lab')]:
 ids=[l['id'] for m in mods if m['id']==mid for l in m['lessons']];check(ids.index(first)<ids.index(second),'prerequisite-first sequence')
guide=(PUBLIC/'wireless-practice/REFERENCE_GUIDE.md').read_text()
check('hacktricks.wiki' in guide and 'osodracpt.github.io' in guide,'attributed resource comparison')
check('not recommended as a copy-and-run lesson' in guide,'cheat sheet caveat')
check('53' in (ROOT/'docs/WIRELESS_LEARNER_PILOT.md').read_text(),'pilot uses released catalogue')
if args.commands_json:
 print(json.dumps({'checks':checks,'commands':[{'lesson':str(p.relative_to(ROOT)),'argv':argv} for p,argv in commands]}))
 sys.exit(0)
if args.tshark:
 check(shutil.which('tshark'),'--tshark requires installed tool; do not silently skip')
 print(subprocess.check_output(['tshark','--version'],text=True).splitlines()[0])
 for p,argv in commands:
  result=subprocess.run(['tshark',*argv],text=True,capture_output=True,timeout=20)
  check(result.returncode==0,str(p)+' tshark '+result.stderr)
 print(f'Executed {len(commands)} allowlisted offline TShark examples (not live capture or exploit tools)')
else:print(f'NOT EXECUTED: {len(commands)} TShark examples; syntax/path/option checks only (use --tshark with the tool installed)')
print(f'PASS: {checks} cross-phase curriculum structure, links, shell syntax, correction and ordering checks across {len(lessons)} lessons')
