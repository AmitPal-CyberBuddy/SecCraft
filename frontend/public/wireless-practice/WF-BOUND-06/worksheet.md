# Boundary assessment worksheet

Record file hashes, method and scope. Keep packet observations, owner assertions, intended policy, calculated rule decisions, authored model outcomes and actual execution status separate.

## A. Scope and boundary map
For every flow: source client/zone | destination service/zone | direction | protocol/port | intended action | scope authority. Mark F8 STOP before considering a test. Which owner record identifies a VLAN? What cannot be inferred from an address or ping? Explain why association, portal authorization, peer isolation, routed access and application authorization are different boundaries.

## B. Baseline policy reasoning
Predict the first matching rule for each in-scope flow before running the calculator. Which broad rule shadows more specific denials? State which intended paths are affected without claiming real access. Compare the modeled application/route/health records with rule decisions. Why is F7 inconclusive even if the policy calculation returns allow?

## C. Proposed repair and comparison
Run the hardened calculation or review its supplied results. Which legitimate services still work in the model? Which disallowed paths have modeled denial evidence? Which case is still inconclusive? Verify all source/service/direction/protocol/port dimensions rather than repeating an unrelated ping. What would invalidate a real before/after comparison (changed client, expired session, unhealthy target, different route, clock gaps)?

## D. Independent mutation
Without changing originals, explain what would happen if the baseline guest-any rule were placed first in the hardened list. Does a deny lower down necessarily win? Then consider a changed port or source identity: why does the existing authorization not follow the changed request? Keep all mutations offline; the supplied calculator is not a firewall deployment tool.

## E. Evidence and reporting
From corporate-attacks frames 18–19, write one supported packet observation and reject a claim of general internal access. From the model, write one policy deviation, one consistent control result and one inconclusive result with flow/rule/observation IDs. Include intended policy and source identity. Do not infer business severity or administrative privileges from an HTTP status, ICMP reply or address alone.

Propose a real bounded retest: known-good service-health checks, exact allowed/denied cases, effective route/AP/switch/firewall policy, client/server observations, clock uncertainty, request/time limits, impact stops and restoration. Include cleanup of temporary sessions/accounts/captures and owner acceptance criteria. Record actual live outcomes NOT TESTED.
