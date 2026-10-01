# Wireless execution feasibility — Phase 2

2026-10-01. **Preflight/architecture review only. No successful AP/client execution spike or hosted environment is claimed.** This decision preserves useful offline learning while keeping live-execution requirements visible.

## Observed in this checkout/environment

- The legacy backend lab router has no routes. There is no worker provisioner, session lifecycle, restricted execution API or trusted wireless grader in the repository.
- Read-only environment checks found no `iw`, `hostapd`, `wpa_supplicant`, `docker` or `podman` executable on PATH. `mac80211_hwsim` was not loaded; no wireless PHY was exposed through `/sys/class/ieee80211`.
- These observations do **not** prove every deployment host is incapable. They mean a working runtime cannot be demonstrated here without additional host capabilities, tools and security decisions. No privilege escalation, kernel-module loading, container setup, provider purchase or radio transmission was attempted.
- Actual file analysis did run: Scapy 2.7.0 decoded all 18 repaired catalogue captures (240 packets), including timestamps and RSN group suites. This is not AP/client execution. Wireshark/TShark, physical adapters and live client behavior were not tested here.

## Delivery decision

| Lane | Current state | Learner meaning |
| --- | --- | --- |
| Supplied captures, decoded JSON, worksheets, public rubric | Available | Complete offline reasoning; download files before going offline |
| Local Wireshark/TShark | Learner-installed option | Real analysis of local files; no hosted shell and no RF claim |
| Browser command simulator | Available, scripted | Learn command/output interpretation; no commands actually execute |
| Owned isolated AP/adapter/client | Optional, learner-provided | Separate authorization, compatibility, regulatory, impact and recovery checks; NOT TESTED if unavailable |
| Hosted virtual AP/client protocol environment | Unavailable | No launch button, hidden prerequisite or promised release date |
| Remote physical RF range/client validation | Unavailable | Cannot be inferred from a software-radio environment or packet fixture |

Existing SIMULATION/HYBRID/RF_REQUIRED metadata is retained for compatibility. Learner-facing badges now describe offline evidence, optional hardware and hardware-dependent RF validation. A shared availability disclosure explains infrastructure separately from evidence modality and separately from self-review/local answer checks. These labels do not award or upgrade competence.

## What a future local execution spike must establish

A software-radio worker may use a compatible Linux kernel with mac80211_hwsim and version-pinned hostapd/wpa_supplicant, and later a dedicated AAA service. Ordinary containers share the host kernel; container packaging alone does not supply compatible modules or safe tenant isolation. Do not expose a privileged worker or arbitrary host shell through the production API.

Start with one allowlisted AP/client protocol scene on a dedicated approved host, with synthetic credentials and no physical interface. Required outputs:

1. Recorded host/kernel/tool versions, topology, isolation boundary and initial/reset state.
2. Positive connection and secure negative-control results from actual client/AP logs, not authored text.
3. Consistent timestamps, a capture, configuration provenance and explicit expected/observed outcomes.
4. Egress restrictions, namespace/session isolation, no production secrets/user data, CPU/memory/time limits and an owner-approved concurrency/cost ceiling.
5. Proven reset, timeout, cancellation, crash recovery, cleanup and residual-process/network checks.
6. Security review of lifecycle authorization, escape paths, upload/command input, telemetry visibility and retention/deletion.

Only after those gates pass should an owner consider a hosted pilot. The client-trust and segmentation vertical slices in the redesign plan remain future work, not runtime capabilities delivered by Phase 2. A public answer key or browser score is never a trusted grader; independently verified performance needs a separate assessment trust boundary.

## Fidelity boundary

A cloud virtual protocol lab can be valuable without physical radios. It can test supported AP/supplicant states and policy decisions under a particular implementation/version. It cannot validate real antenna placement, range, interference, adapter/firmware behavior, local regulatory conditions or a fleet's physical client outcomes. Record virtual execution and physical RF validation as distinct modes.

## Outstanding decisions

Owner-approved host/provider and budget; tested isolation mechanism; supported kernel/client/tool matrix; session quotas; incident response; data lifecycle; independently reviewed grading; instructor/learner pilot. No delivery date or “zero-cost cloud lab” promise is made. The offline path is the current supported route, not a placeholder that blocks learning.
