#!/usr/bin/env python3
"""Boundary model contracts and mutations; not a live firewall/segmentation test."""
import ast, copy, hashlib, importlib.util, json, re, subprocess, sys, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CASE=ROOT/'frontend/public/wireless-practice/WF-BOUND-06'
checks=0
def check(value,name):
    global checks
    assert value,name
    checks+=1
subprocess.run([sys.executable,str(ROOT/'scripts/package-wireless-boundaries.py'),'--check'],check=True)
spec=importlib.util.spec_from_file_location('boundary_model',CASE/'review-policy.py');model=importlib.util.module_from_spec(spec);spec.loader.exec_module(model)
expected=model.read('reference-results.json');topology=model.read('topology.json');auth=model.read('authorization.json');flows=model.read('flows.json')['flows']
for phase in ['baseline','hardened']:
    output=subprocess.check_output([sys.executable,str(CASE/'review-policy.py'),phase]);actual=json.loads(output)
    check(output==subprocess.check_output([sys.executable,str(CASE/'review-policy.py'),phase]),phase+' deterministic repeat')
    check(actual['live_network']=='NOT TESTED',phase+' no live outcome')
    check({r['flow']:r['classification'] for r in actual['results']}==expected[phase],phase+' reference outcomes')
    for r in actual['results']:
        check(r['classification'] in {'MODEL_CONSISTENT','MODEL_DEVIATION','INCONCLUSIVE','STOP_SCOPE'},phase+' bounded classifications')
    check([r['rule'] for r in actual['results'] if r['flow'] in ['F4','F5']]==(['guest-any','guest-any'] if phase=='baseline' else ['default','default']),phase+' matching rules')
hard=model.read('hardened-policy.json');base=model.read('baseline-policy.json');observed=model.read('hardened-observations.json')['observations'][0]
for key,bad in [('source','corp-B'),('destination','internal-api'),('protocol','udp'),('port',8443),('direction','service-to-client'),('id','other')]:
    changed={**flows[0],key:bad};check(model.decision(changed,topology,hard,auth)==('STOP_SCOPE',None),'scope mutation '+key)
shadow=copy.deepcopy(hard);shadow['rules'].insert(0,base['rules'][0])
for f in flows[3:5]:check(model.decision(f,topology,shadow,auth)==('allow','guest-any'),'shadowed deny '+f['id'])
for key in ['model_route_verified','model_target_healthy','model_rule_decision','model_application_reached','model_enforcement_recorded']:
    unknown={**observed,key:None};check(model.classify(flows[0],'allow',unknown)=='INCONCLUSIVE','missing evidence '+key)
check(model.classify(flows[0],'allow',{**observed,'model_rule_decision':'deny'})=='MODEL_INCONSISTENT','rule/log disagreement')
check(model.classify(flows[0],'allow',{**observed,'model_application_reached':False})=='MODEL_INCONSISTENT','rule/application disagreement')
check(model.classify(flows[0],'allow',None)=='INCONCLUSIVE','no observation')
check(model.classify(flows[0],'STOP_SCOPE',observed)=='STOP_SCOPE','scope precedes observations')
bad=copy.deepcopy(hard);bad['default']='typo'
try:model.decision(flows[0],topology,bad,auth)
except ValueError:check(True,'invalid policy is not silently accepted')
else:check(False,'invalid policy accepted')
imports=set()
for node in ast.walk(ast.parse((CASE/'review-policy.py').read_text())):
    if isinstance(node,ast.Import):imports.update(x.name for x in node.names)
    elif isinstance(node,ast.ImportFrom):imports.add(node.module)
check(imports=={'argparse','json','pathlib'},'calculator has only local model dependencies')
manifest={line.split('  ')[1]:line.split('  ')[0] for line in (CASE/'SHA256SUMS').read_text().splitlines()}
with zipfile.ZipFile(CASE.with_suffix('.zip')) as archive:
    check(len(archive.namelist())==15,'complete archive')
    for name in [*manifest,'SHA256SUMS']:
        data=(CASE/name).read_bytes();check(archive.read('WF-BOUND-06/'+name)==data,'archive '+name)
        if name in manifest:check(hashlib.sha256(data).hexdigest()==manifest[name],'digest '+name)
frames=model.read('corporate-attacks.json')['frames'];check(len(frames)==19,'separate packet scene')
check([r['protocol'] for r in frames[17:19]]==['ICMP','ICMP'],'cited pair is ICMP, not an application test')
check(frames[17]['ip_src']==frames[18]['ip_dst'] and frames[17]['ip_dst']==frames[18]['ip_src'],'packet pair direction')
check(len(topology['clients'])==2 and topology['runtime']=='NOT TESTED','two clients, no runtime')
check(topology['clients']['guest-A']['vlan']==20 and topology['clients']['corp-B']['vlan']==100 and topology['management_vlan']==10,'owner asserted zones')
for phase in ['baseline','hardened']:check(model.read(phase+'-observations.json')['runtime']=='NOT TESTED','authored observations '+phase)
modules=json.loads((ROOT/'frontend/src/content/modules.json').read_text());wm=[m for m in modules if m['learningPathId']=='wireless-pentesting']
check(len(wm)==15 and sum(len(m['lessons']) for m in wm)==53,'current catalogue')
check([m['id'][:2] for m in wm if m['phase']<=2]==['01','02','03','04','05','06'],'Preview boundary')
mid='18-corporate-attacks'
for lid in ['03-boundary-map-and-test-scope','04-policy-order-and-evidence-controls','05-retest-and-supported-impact']:
    check(any(l['id']==lid for m in modules if m['id']==mid for l in m['lessons']),'registered '+lid)
    text=(ROOT/f'frontend/src/content/lessons/{mid}/{lid}.md').read_text();check('NOT TESTED' in text,'execution limit')
    for url in re.findall(r'\]\((/wireless-practice/[^)]+)\)',text):check((ROOT/'frontend/public'/url[1:]).is_file(),'case link '+url)
print(f'PASS: {checks} Phase 6 model, scope/mutation, evidence, archive, packet, lesson and compatibility checks')
