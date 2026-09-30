# Practice Clinic: Follow Enterprise Trust Boundaries

> The `enterprise.pcapng`, `eap.pcapng` and `radius.pcapng` fixtures are **not one coherent session**. Their TLS-like payloads are abbreviated. Do not splice their identifiers/timestamps into a fabricated client→AP→AAA transcript.

## Guided pass: distinguish the three questions

**Client/server trust:** an EAP method label says which protocol was attempted, not whether a real client validated the expected certificate name and trust anchor. `eap.pcapng` contains a deliberately *direct* MS-CHAPv2 teaching exchange, not a decrypted PEAP inner exchange. An effective supplicant profile and logs from a controlled attempt are needed to show a client rejected a wrong-name server.

**Packet integrity:** in `radius.pcapng`, inspect attribute 80 (Message-Authenticator), the response authenticator and the example VLAN attribute. The repository verifier uses a published *lab-only* shared secret to check some packet bytes; the deliberately invalid request fails that check. Neither observation identifies a real rogue NAS or proves how a deployed server handled a request.

**Policy enforcement:** an Access-Accept carrying a VLAN is not proof an AP/switch assigned it or blocked a forbidden route. Only controlled client address/VLAN, switch/controller policy and positive **and** negative reachability tests on approved endpoints support that conclusion.

## Independent attempt (offline)

```bash
# Run from the repository root, or use Wireshark if tshark is not installed.
tshark -r frontend/public/pcaps/enterprise/enterprise.pcapng -Y 'eap' \
  -T fields -e frame.number -e eap.code -e eap.type
tshark -r frontend/public/pcaps/radius/radius.pcapng -Y 'radius' \
  -T fields -e frame.number -e radius.code -e radius.message_authenticator
python3 scripts/verify-lab-artifacts.py
```

Make three rows: `trust boundary | observed bytes and capture hash | what the bytes cannot prove | authorized control test`. For the policy row propose a test that includes an *allowed* and a *disallowed* destination; one unanswered ping does not prove a firewall rule. For certificate identity, design two managed test profiles with the same trusted CA but different expected server names. No actual certificates or managed profiles are shipped: mark that test NOT EXECUTED.

## Self-check and decision

A strong answer never claims PEAP credential exposure or correct VLAN enforcement from these files. It says which fixture shows a direct challenge/response, which shows a RADIUS attribute, and what independent client/AAA/host logs would be needed for a **single** controlled real session. If the logs cannot be joined by scoped client, NAS, request ID and synchronized time, leave the cross-layer conclusion undetermined. Reviewer feedback can improve the reasoning but is not an automatically verified grade.
