# Explain a Rule Decision Without Calling It Network Access

> **Available now: local JSON model calculation and evidence review.** Python runs on your computer and does not open sockets, issue probes or change firewall rules. This is not network emulation, hosted execution or an applied security control.

## Predict before calculating

Use the [WF-BOUND-06 ZIP](/wireless-practice/WF-BOUND-06.zip), [scope](/wireless-practice/WF-BOUND-06/scope.md), [baseline policy](/wireless-practice/WF-BOUND-06/baseline-policy.json) and [baseline model observations](/wireless-practice/WF-BOUND-06/baseline-observations.json).

The teaching evaluator uses explicit **first-match** rules. It checks authorization before evaluating any rule, then matches the source zone and destination service. The approved protocol/port belongs to the named service. If no rule matches, the configured default applies. This is a deliberately narrow, stateless model—not vendor syntax and not a simulation of NAT, connection tracking or return traffic.

For each flow, predict the matching rule and expected classification. Does a narrow deny below a broad matching allow take effect? Would moving that same broad rule to the top of a repaired list reintroduce the problem?

## Run the bounded calculation

Extract the ZIP, verify its manifest and run locally with Python 3:

```bash
python3 --version
python3 review-policy.py baseline
python3 review-policy.py hardened
```

The script reads only the bundled topology, scope, flows, policies and observations. It has no network targets, command-execution facility or deployment function. It prints a calculated action, rule ID, observation ID and model classification. Re-running unchanged files is reproducible computation, not a tested router reset.

No interpreter available? Use [reference results](/wireless-practice/WF-BOUND-06/reference-results.json) and label your method **supplied-result review; not independently calculated**. The browser command simulator cannot run Python. Neither route proves live enforcement.

## Understand the classifications

| Label | Meaning in this exercise |
| --- | --- |
| MODEL_CONSISTENT | complete authored records agree with the calculation and intended policy for that flow |
| MODEL_DEVIATION | complete authored records agree with the calculation but contradict intended policy |
| MODEL_INCONSISTENT | the rule calculation conflicts with the authored rule/application observations; reconcile the evidence rather than inventing a finding |
| INCONCLUSIVE | route, health, enforcement or application evidence is missing; an allow or deny calculation cannot fill that gap |
| STOP_SCOPE | the proposed flow is outside the exact permitted tuple; do not proceed |

All live network outcomes remain **NOT TESTED**. A green model result is not a network pass, and a policy deviation is not automatically a production vulnerability or a severity rating.

## Keep health and path controls independent

A silent service could be down, misrouted, blocked at the endpoint or denied by a different device. A configured allow does not establish successful forwarding. A rule-counter increase or a deny log needs the correct source, tuple, request/time window and enforcement point; it cannot certify all paths.

F7 deliberately lacks confirmed route and target health. Do not mark the firewall successful just because the application did not respond. F8 fails authorization before any policy decision. F1–F3 are positive controls: hardening must not simply break every service and call that a fix.

Compare the modeled application outcome with the modeled rule action as well. If they conflict, a later rule or a missing device/path may explain the discrepancy in a real case; here, flag inconsistent source records rather than silently choosing the preferred story.

## Independent review

Without changing originals, describe an offline copy where the broad guest rule is first in the hardened policy. Predict F4/F5 and explain why appending another deny is insufficient under this model. Then vary the source or port in your reasoning: authorization must be reviewed again, not inherited from a similar flow.

Record predictions, actual local calculation or supplied-result review, missing evidence and explicit limitations in the [worksheet](/wireless-practice/WF-BOUND-06/worksheet.md). Compare the [public guide](/wireless-practice/WF-BOUND-06/review-guide.md) only after drafting. Local completion is participation, not independent grading or permission to deploy rules.
