# Public self-review guide

F1/F2 are the guest's intended portal and public-demo paths; F3 is the corporate client's approved internal API. Their modeled positive controls should survive hardening. F4/F5 are guest-to-internal-API and guest-to-management paths, denied by intended policy. The baseline guest-any rule precedes and shadows its narrower denials, so those model paths are wrongly allowed. F6 is corp-B to management and should remain denied: corporate membership is not blanket administrative permission.

The hardened model replaces broad guest permission with exact permitted guest services and keeps default deny. F4/F5 become denied while F1–F3 remain allowed. Merely appending a deny below an already-matching allow does not fix a first-match policy. This evaluator's ordering rules are explicit; real devices can have different state, zones, chains, platform precedence and cached sessions.

F7 is corp-B to internal-reports. Intended/model policy permits it, but the observation has no verified route/target health and no response. It remains INCONCLUSIVE in both phases. An allow rule does not prove reachability; a silent service does not prove a deny. F8 substitutes UDP/53 for the approved TCP/443 service and is STOP_SCOPE in both phases. No actual probes are issued in any case.

Within complete authored records, F1/F2/F3/F6 are consistent in baseline; F4/F5 are MODEL_DEVIATION. All six are consistent under the hardened model. These classifications are not live pass/fail or vulnerability verdicts. A mismatch between a supplied rule decision and its observation should instead be flagged as MODEL_INCONSISTENT, not quietly turned into a network finding.

The owner topology labels guest VLAN 20, corporate VLAN 100 and management VLAN 10 as fictional administrative facts. Do not infer them from the independent capture's IP subnets. A real test needs effective client/AP/controller/switch assignment and route/ACL evidence at the actual enforcement point. Client isolation is separate from routed segmentation; a service response is separate from its application's permission to perform a sensitive operation.

corporate-attacks frames 18–19 encode an ICMP request/reply between different IP subnets. They do not establish VLAN identity, an ACL gap, TCP/UDP application access, credential reuse or a complete attack chain. The other packet scenes and prior phase models cannot be spliced into missing links.

A sound handoff cites file/hash, flow ID, source/service/direction, scope, intended action, rule ID, observation ID, health/route status, alternative explanations and untested outcomes. For a future retest, preserve good paths, prove intended denials with enforcement/endpoint evidence, bound the scope and confirm cleanup. Re-running the model from unchanged files is model reproducibility, not network reset. Independent instructor and live execution review remain outstanding.
