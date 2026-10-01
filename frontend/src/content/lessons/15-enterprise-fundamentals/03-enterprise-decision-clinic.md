# Practice Clinic: Follow Enterprise Trust Boundaries

> The `enterprise.pcapng`, `eap.pcapng` and `radius.pcapng` fixtures are **not one coherent session**. Their TLS-like payloads are abbreviated. Do not splice their identifiers/timestamps into a fabricated client→AP→AAA transcript.

## Prepare, then review across boundaries

The preceding [Enterprise test-plan lesson](/paths/wireless-pentesting/modules/15-enterprise-fundamentals?tab=theory&lesson=02-enterprise-testing-lab) owns the collection/correlation walkthrough. Here, independently decide what each separate fixture supports about **server trust**, **packet integrity** and **applied policy**. Do not repeat the plan as if it were a result. Save your three-row answer before the self-check.

## Independent attempt (offline)

```bash
# Run from the repository root, or use Wireshark if tshark is not installed.
tshark -r frontend/public/pcaps/enterprise/enterprise.pcapng -Y 'eap' \
  -T fields -e frame.number -e eap.code -e eap.type
tshark -r frontend/public/pcaps/radius/radius.pcapng -Y 'radius' -V
python3 scripts/verify-lab-artifacts.py
```

Make three rows: `trust boundary | observed bytes and capture hash | what the bytes cannot prove | authorized control test`. For the policy row propose a test that includes an *allowed* and a *disallowed* destination; one unanswered ping does not prove a firewall rule. For certificate identity, design two managed test profiles with the same trusted CA but different expected server names. WF-ENT-05 now supplies real certificate files and illustrative profiles for offline comparison. Its certificate-file verification is not a supplicant test: mark actual client behavior NOT EXECUTED.

## Self-check and decision

A strong answer never claims PEAP credential exposure or correct VLAN enforcement from these files. It says which fixture shows a direct challenge/response, which shows a RADIUS attribute, and what independent client/AAA/host logs would be needed for a **single** controlled real session. If the logs cannot be joined by scoped client, NAS, request ID and synchronized time, leave the cross-layer conclusion undetermined. Reviewer feedback can improve the reasoning but is not an automatically verified grade.
