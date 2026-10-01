#!/usr/bin/env python3
"""Calculate the bundled stateless policy MODEL. No sockets, probes or device changes."""
import argparse
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
FIELDS=('id','source','destination','protocol','port','direction')
def read(name):return json.loads((ROOT/name).read_text())
def decision(flow, topology, policy, authorization):
    if not any(all(flow.get(k)==allowed.get(k) for k in FIELDS) for allowed in authorization['allowed_flows']):
        return 'STOP_SCOPE',None
    if policy['default'] not in ('allow','deny') or any(r['action'] not in ('allow','deny') for r in policy['rules']):
        raise ValueError('policy actions must be allow or deny')
    service=topology['services'].get(flow['destination']);client=topology['clients'].get(flow['source'])
    if not service or not client or (flow['protocol'],flow['port'])!=(service['protocol'],service['port']):
        return 'STOP_SCOPE',None
    for rule in policy['rules']:
        if rule['source_zone']==client['zone'] and ('*' in rule['destinations'] or flow['destination'] in rule['destinations']):
            return rule['action'],rule['id']
    return policy['default'],'default'
def classify(flow, action, observed):
    if action=='STOP_SCOPE':return 'STOP_SCOPE'
    if not observed or observed.get('model_route_verified') is not True or observed.get('model_target_healthy') is not True or observed.get('model_rule_decision') is None or observed.get('model_application_reached') is None or observed.get('model_enforcement_recorded') is not True:
        return 'INCONCLUSIVE'
    if observed['model_rule_decision']!=action or observed['model_application_reached'] != (action=='allow'):return 'MODEL_INCONSISTENT'
    return 'MODEL_CONSISTENT' if action==flow['intended'] else 'MODEL_DEVIATION'
def run(phase):
    if phase not in ('baseline','hardened'):raise ValueError('unknown bundled model phase')
    topology=read('topology.json');authorization=read('authorization.json');policy=read(phase+'-policy.json')
    observations={r['flow']:r for r in read(phase+'-observations.json')['observations']}
    results=[]
    for flow in read('flows.json')['flows']:
        action,rule=decision(flow,topology,policy,authorization);observed=observations.get(flow['id'])
        results.append(dict(flow=flow['id'],calculated_action=action,rule=rule,observation=observed['id'] if observed else None,classification=classify(flow,action,observed)))
    return dict(method='Executed local JSON model calculation only',phase=phase,live_network='NOT TESTED',results=results)
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('phase',choices=['baseline','hardened'])
    print(json.dumps(run(parser.parse_args().phase),indent=2))
