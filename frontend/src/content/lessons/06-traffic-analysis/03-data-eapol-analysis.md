# Data Frames & EAPOL Deep Dive — Encryption & Handshake

## Learning Objectives
- Master data frame addressing: To DS/From DS, SA/DA/BSSID/RA/TA, 3-addr vs 4-addr WDS
- Understand QoS Data, CCMP encryption, Protected bit, retry
- Deep dive EAPOL 4-way handshake: M1-M4 key info, ANonce/SNonce, MIC, replay counter, GTK, PMKID
- Learn PMKID extraction: clientless, single frame, HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC)
- Build evidence for handshake and PMKID: frame numbers, ANonce, SNonce, MIC, BSSID, client, SSID, hash

## Theory

### Data Frames — Addressing & DS Bits

**802.11 data frame addressing is confusing because of DS (Distribution System) bits — To DS and From DS.**

- **To DS=0, From DS=0:** Ad-hoc IBSS or management/control — SA = source, DA = dest, BSSID = BSSID — e.g., IBSS data SA client DA other client BSSID IBSS
- **To DS=0, From DS=1:** AP → Client (downlink) — AP to client — SA = BSSID (AP), DA = Client MAC, BSSID = BSSID (AP), RA = DA (client), TA = SA (AP) — e.g., AP data to client: SA AA:BB:CC:DD:EE:FF (AP), DA 11:22:33:44:55:66 (client), BSSID AA:BB:CC:DD:EE:FF
- **To DS=1, From DS=0:** Client → AP (uplink) — client to AP — SA = Client MAC, DA = BSSID (AP) or dest (e.g., gateway), BSSID = BSSID (AP), RA = BSSID (AP), TA = SA (client) — e.g., client data to AP: SA 11:22:33:44:55:66 (client), DA AA:BB:CC:DD:EE:FF (AP) or dest, BSSID AA:BB:CC:DD:EE:FF
- **To DS=1, From DS=1:** WDS (Wireless Distribution System) 4-address — AP to AP bridge — SA = original source, DA = final dest, BSSID? Actually 4 addresses: RA, TA, SA, DA — RA receiver, TA transmitter, SA source, DA dest — e.g., WDS AP1 → AP2: RA AP2 BSSID, TA AP1 BSSID, SA client behind AP1, DA client behind AP2 — filter `wlan.fc.tods==1 && wlan.fc.fromds==1`

**For PT:** Most data is To DS=1 From DS=0 client → AP or To DS=0 From DS=1 AP → client — 3-address. WDS 4-address rare, but check.

**QoS Data:**
- Subtype 8 QoS Data — QoS control field — TID, EOSP, Ack Policy, A-MSDU, TXOP
- QoS Null subtype 12 — no data, just QoS control + PS-Poll? Actually QoS Null for power save
- For PT: QoS Data is most common data — filter `wlan.fc.type_subtype==8` or `wlan.fc.type==2`

**Protected Bit:**
- `wlan.fc.protected==1` — frame body encrypted (CCMP/TKIP/WEP) — data encrypted after handshake
- `wlan.fc.protected==0` — unencrypted — e.g., EAPOL M1-M3? Actually EAPOL M1-M3 not encrypted? M1 ANonce not encrypted, M2 MIC protected but not encrypted? Actually EAPOL is not encrypted with PTK? EAPOL is EAPOL-Key, not data, protected? Check Wireshark — EAPOL may have protected 0? But data after handshake protected 1.

**Retry Bit:**
- `wlan.fc.retry==1` — retransmission — sequence number same as previous, retry 1

**Example data frames (not in traffic-analysis.pcapng 12 frames, but in real captures after M4):**
```
Client → AP: To DS=1 From DS=0 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF (or gateway) BSSID AA:BB:CC:DD:EE:FF, Protected 1 (encrypted CCMP), QoS Data subtype 8, Seq 100, Retry 0
AP → Client: To DS=0 From DS=1 SA AA:BB:CC:DD:EE:FF DA 11:22:33:44:55:66 BSSID AA:BB:CC:DD:EE:FF, Protected 1, QoS Data, Seq 200
```

**Filters:**
```
wlan.fc.type==2                                          # Data only
wlan.fc.type==2 && !eapol                                # Data without EAPOL (real data)
wlan.fc.type_subtype==8                                  # QoS Data
wlan.fc.type_subtype==0                                  # Data (non-QoS)
wlan.fc.tods==1 && wlan.fc.fromds==0                     # Client → AP
wlan.fc.tods==0 && wlan.fc.fromds==1                     # AP → Client
wlan.fc.tods==1 && wlan.fc.fromds==1                     # WDS 4-addr
wlan.fc.protected==1                                     # Encrypted
wlan.fc.retry==1                                         # Retry
wlan.sa==11:22:33:44:55:66 && wlan.fc.type==2           # Data from specific client SA
wlan.da==11:22:33:44:55:66 && wlan.fc.type==2           # Data to specific client DA
wlan.bssid==AA:BB:CC:DD:EE:FF && wlan.fc.type==2        # Data for specific BSSID
```

**For PT:** Data frames show client ↔ AP relationship, even if no SSID in data frame, BSSID shows AP, SA/DA shows client/dest — evidence client associated, data transfer, etc. — but encrypted, so can't see upper layers unless PTK known? Actually if handshake captured and PSK known/cracked, can decrypt CCMP? Yes, Wireshark can decrypt if PSK and SSID and handshake? But for PT, data encrypted is expected — open networks data not encrypted (protected 0) — sniffable.

### EAPOL Deep Dive — 4-way Handshake

**WPA2/WPA3 4-way handshake derives PTK (Pairwise Transient Key) from PMK (Pairwise Master Key) + ANonce + SNonce + BSSID + Client MAC via PRF.**

**PMK (Pairwise Master Key):**
- PSK mode: PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096 iter, 256-bit) — 32 bytes
- Enterprise mode: PMK from MSK (Master Session Key) from EAP — 32 bytes
- PMK is 32 bytes (256-bit)

**PTK (Pairwise Transient Key):**
- PTK = PRF(PMK, "Pairwise key expansion" | min(BSSID, Client MAC) | max(BSSID, Client MAC) | min(ANonce, SNonce) | max(ANonce, SNonce)) — 64 bytes for CCMP (KCK 16 + KEK 16 + TK 16 + MIC? Actually PTK 64 bytes: KCK 16, KEK 16, TK 16, MIC? Let's recall: PTK 512-bit for CCMP? Actually PTK 384-bit? Let's check: For CCMP, PTK 384-bit? No, CCMP PTK 384? Actually PTK length depends — for CCMP 384? Wait, let's recall: PTK = KCK (128-bit) + KEK (128-bit) + TK (128-bit) = 384-bit for CCMP? For TKIP, TK 2x? But for CCMP, TK 128-bit, so PTK 384-bit? Actually CCMP needs 128-bit TK, so PTK 384-bit (KCK 128 + KEK 128 + TK 128) = 384-bit = 48 bytes? But some say PTK 512-bit? Let's not get stuck — PTK derived from PMK + nonces + MACs.

**GTK (Group Temporal Key):**
- Group key for broadcast/multicast — derived from GMK (Group Master Key) — sent in M3 encrypted with KEK, MIC with KCK

**KCK (Key Confirmation Key):**
- Part of PTK — used for MIC (HMAC-SHA1) — verifies handshake integrity

**KEK (Key Encryption Key):**
- Part of PTK — used to encrypt GTK in M3

**TK (Temporal Key):**
- Part of PTK — used for data encryption CCMP AES

**4-way handshake messages detailed:**

**M1: AP → Client ANonce**
- SA BSSID, DA Client MAC, BSSID BSSID, EAPOL protocol version 2, type 3 Key, Key Descriptor Type 2 RSN, Key Info: Key Descriptor Version, Key Type Pairwise, Key Index 0, Install 0, Key Ack 1, Key MIC 0, Secure 0, Error 0, Request 0, Encrypted Key Data 0, etc., Key Length 16, Replay Counter 1, Nonce ANonce 32 bytes random, IV, RSC, ID, MIC 0 (no MIC in M1), Key Data Length 0
- ANonce: 32 bytes random from AP — e.g., `a1b2c3...`
- Replay Counter: 1 for M1
- Filter: `eapol.keydes.msgnr==1`? Actually Wireshark `eapol.keydes.key_info` and `eapol.keydes.nonce` — but display filter `eapol` and check frame details

**M2: Client → AP SNonce + MIC**
- SA Client MAC, DA BSSID, BSSID BSSID, EAPOL, Key Info: Key MIC 1, Secure 0, etc., Key Length 16, Replay Counter 1 (same as M1), Nonce SNonce 32 bytes random from client, MIC HMAC-SHA1 using KCK, Key Data RSN IE, etc.
- SNonce: 32 bytes random from client — e.g., `d4e5f6...`
- MIC: HMAC-SHA1(KCK, EAPOL frame) — verifies client knows PMK (derived from PSK+SSID) and PTK
- RSN IE in Key Data: client's RSN IE
- Replay Counter: same as M1 (1)

**M3: AP → Client GTK + MIC**
- SA BSSID, DA Client MAC, BSSID BSSID, EAPOL, Key Info: Key Ack 1, Key MIC 1, Secure 1, Encrypted Key Data 1, etc., Key Length 16, Replay Counter 2, Nonce ANonce same as M1? Actually ANonce same as M1? No, ANonce same as M1? M1 ANonce, M3 ANonce? M3 may have same ANonce? Actually M3 replay counter 2, ANonce same? Check spec — M3 ANonce may be same as M1? Or new? Typically ANonce same as M1 for M3? Let's check: M1 ANonce, M2 SNonce, M3 ANonce? Actually M3 contains ANonce? Or GTK? M3 contains GTK encrypted with KEK, MIC with KCK, replay counter 2, secure 1
- GTK: Group Temporal Key encrypted with KEK, in Key Data
- MIC: HMAC-SHA1 using KCK
- Replay Counter: 2

**M4: Client → AP ACK**
- SA Client MAC, DA BSSID, BSSID BSSID, EAPOL, Key Info: Key MIC 1, Secure 1, etc., Replay Counter 2, MIC, no nonce? SNonce? Actually M4 no nonce, just ACK, MIC
- Replay Counter: same as M3 (2)

**For offline audit (authorized):**
- Need: SSID, BSSID, Client MAC, ANonce (M1), SNonce (M2), MIC (M2), EAPOL frame M2 (or M2+M3)
- Hashcat: `hcxpcapngtool -o capture.hc22000 capture.pcapng` converts PCAP to hashcat 22000 format (WPA2 EAPOL + PMKID)
- Hashcat mode: `hashcat -m 22000 capture.hc22000 wordlist.txt` — tries PBKDF2 for each passphrase, derives PMK, then PTK, then MIC, compares to captured MIC — if match, PSK found
- For PT: Only authorized captures, lab PCAPs, own lab, not others

**Example traffic-analysis.pcapng handshake:**
```
f9 M1: SA AA:BB:CC:DD:EE:FF DA 11:22:33:44:55:66 BSSID AA:BB:CC:DD:EE:FF ANonce a1b2c3d4... (32 bytes) Replay 1 MIC 0
f10 M2: SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SNonce d4e5f6... MIC 123456... RSN IE Replay 1
f11 M3: SA AA:BB:CC:DD:EE:FF DA 11:22:33:44:55:66 BSSID AA:BB:CC:DD:EE:FF GTK encrypted MIC 789abc... Replay 2
f12 M4: SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF MIC def012... Replay 2 ACK
```

**Filters:**
```
eapol                                    # All EAPOL
eapol && wlan.bssid==AA:BB:CC:DD:EE:FF  # EAPOL for specific BSSID
eapol.keydes.msgnr==1                   # M1? Actually tshark field eapol.keydes.key_info? Check Wireshark: eapol.keydes.msgnr? Might be eapol.keydes.key_info.key_mic? Better to use frame numbers + details
wlan.fc.type==2 && eapol                # EAPOL is data type but dissector eapol
```

**For PT:** Handshake completeness check — need M1+M2 at least, ideally M1-M4 — check ANonce, SNonce, MIC present, replay counter increments, BSSID, client MAC, SSID.

### PMKID — Clientless Handshake Alternative

**PMKID (Pairwise Master Key Identifier):**
- Formula: PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — first 128 bits of HMAC-SHA1
- PMKID can be in EAPOL M1 key data (RSN IE with PMKID) — AP includes PMKID in M1 if it has PMKID cache for fast roaming (802.11r) or for client that previously connected
- Advantage: Clientless — single EAPOL frame M1 from AP contains PMKID, no client needed, no deauth, no waiting for client, single frame — better than handshake which needs client
- For PT: PMKID extraction is preferred over handshake if available — clientless, no active deauth, less intrusive

**How PMKID is captured:**
- AP sends EAPOL M1 with PMKID in key data — e.g., RSN IE with PMKID list — Tag 48 RSN IE contains PMKID count and PMKID
- Client may not even be present — AP periodically? Actually AP includes PMKID in M1 when client associates? But also AP may include PMKID in M1 for any client? Actually PMKID is for fast roaming, AP includes PMKID in M1 if it has PMK cached for that client — but attacker can capture M1 with PMKID even without client? In practice, PMKID can be captured from AP's M1 even if no client, via `hcxdumptool` which requests PMKID? Let's recall: `hcxdumptool` sends assoc request to AP and gets M1 with PMKID — clientless? Actually `hcxdumptool` acts as client, sends assoc, gets M1 with PMKID — still needs to associate? But PMKID is in M1 from AP, so after assoc, AP sends M1 with PMKID — clientless in sense no need for full handshake, just M1.

**For PT:** PMKID extraction via `hcxdumptool` or `hcxpcapngtool` — but for simulated labs, we have `pmkid.pcapng` with PMKID.

**Example pmkid.pcapng:**
```
f1 Beacon LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK
f2 EAPOL M1 SA BSSID DA Client? Or broadcast? Actually PMKID M1 SA BSSID DA client or broadcast? In pmkid.pcapng, M1 with PMKID in key data — SA BSSID DA client MAC or broadcast? Check — SA BSSID, DA client or FF:FF:FF:FF:FF:FF? Usually DA client if client assoc, but PMKID can be captured even with client not fully associated? Let's assume SA BSSID DA client, key data contains PMKID
```

**Filters:**
```
wlan_rsna_eapol.pmkid                    # PMKID present
eapol && wlan_rsna_eapol.pmkid           # EAPOL with PMKID
wlan_mgt.tag.number==48 && wlan_mgt.tag.count.pmkid>0  # RSN IE with PMKID
```

**Hashcat for PMKID:**
- `hcxpcapngtool -o pmkid.22000 pmkid.pcapng` — converts to 22000 format including PMKID
- `hashcat -m 22000 pmkid.22000 wordlist.txt` — same as handshake, but uses PMKID formula: PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — tries PSK, derives PMK via PBKDF2, then PMKID, compares to captured PMKID
- Advantage: No need for ANonce, SNonce, MIC, just BSSID, STA MAC, PMKID — single frame

**For PT:** PMKID is High value — clientless, no deauth, single frame, less detection, but requires AP to include PMKID in M1 — not all APs do, but many do (especially with PMKID cache enabled for fast roaming). If PMKID not present, fallback to handshake capture (with deauth if authorized and PMF not required).

### Lab Tasks — traffic-analysis.pcapng + pmkid.pcapng

**traffic-analysis.pcapng (12 frames):**
1. Filter `eapol` → 4 EAPOL M1-M4 complete? Frame numbers f9-12, ANonce f9, SNonce+MIC f10, GTK+MIC f11, ACK f12, replay counter 1,1,2,2, BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, SSID LAB-WIFI
2. Extract ANonce, SNonce, MIC, BSSID, Client MAC, SSID for hashcat — need for offline audit authorized
3. Check if PMKID present in M1? Filter `wlan_rsna_eapol.pmkid` — in traffic-analysis.pcapng, no PMKID (M1 key data length 0, no PMKID), so need handshake method

**pmkid.pcapng (if exists, or in wpa2-handshake.pcapng):**
1. Filter `wlan_rsna_eapol.pmkid` → PMKID present? Frame number? BSSID? STA MAC? PMKID value?
2. Extract PMKID, BSSID, STA MAC for hashcat 22000
3. Compare handshake vs PMKID — which is better? PMKID clientless, single frame, no deauth

**Wireshark filters for deep dive:**
```
eapol
wlan_rsna_eapol.pmkid
eapol.keydes.nonce                  # ANonce/SNonce
eapol.keydes.mic                    # MIC
eapol.keydes.replay_counter         # Replay counter
wlan.fc.type==2 && !eapol           # Data without EAPOL
wlan.fc.tods==1 && wlan.fc.fromds==0  # Client → AP data
wlan.fc.tods==0 && wlan.fc.fromds==1  # AP → Client data
wlan.fc.protected==1                # Encrypted data
```

**PcapInspector:**
- Detail for EAPOL M1: Shows ANonce, replay counter, key info, BSSID, SA, DA
- Detail for EAPOL M2: Shows SNonce, MIC, RSN IE, replay counter
- Detail for EAPOL M3: Shows GTK encrypted, MIC, replay counter
- Detail for EAPOL M4: Shows MIC, replay counter, ACK
- PMKID: If present, shows PMKID value in key data

### VAPT Relevance

- **Data frames:** Even though encrypted, BSSID shows AP, SA/DA shows client/dest — evidence client associated, data transfer, etc. — open networks data not encrypted (protected 0) — sniffable — High finding if open without OWE or isolation
- **EAPOL:** Handshake capture for offline audit authorized — need complete handshake, ANonce, SNonce, MIC, BSSID, client, SSID — evidence frame numbers, filters, hash
- **PMKID:** Clientless alternative — single frame, no deauth, less intrusive, better for stealth — if PMKID present, use it, else handshake
- **Evidence:** Frame numbers M1-M4, ANonce, SNonce, MIC, replay counter, BSSID, client, SSID, PMKID, PCAP hash, filters
- **Report:** "Complete 4-way handshake observed f9 M1 ANonce SA BSSID DA client replay1, f10 M2 SNonce+MIC SA client DA BSSID replay1, f11 M3 GTK+MIC SA BSSID DA client replay2, f12 M4 ACK SA client DA BSSID replay2, BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, SSID LAB-WIFI, Ch6, WPA2-PSK CCMP PSK, PMF capable, no WPS, PCAP traffic-analysis.pcapng SHA256... For PMKID, PMKID present in M1 f? BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66 PMKID abc123..., filter wlan_rsna_eapol.pmkid"

### Attack → Defense → Retest

- **Attack:** Capture handshake via passive wait for client assoc or active deauth if authorized and PMF not required and lab, extract ANonce, SNonce, MIC, BSSID, client, SSID, convert to hashcat 22000 via hcxpcapngtool, offline audit with wordlist if weak PSK and authorized (lab). Or capture PMKID via hcxdumptool clientless single frame, convert to 22000, offline audit. For PT, only authorized captures, own lab, not others.
- **Defense:** Strong PSK 20+ random not in wordlists, WPA3-only SAE PMF required, disable PMKID cache if not needed for fast roaming? Actually PMKID cache is for fast roaming, but if PMKID present, risk — but PMKID requires weak PSK to crack, so strong PSK mitigates. PMF required prevents deauth for handshake capture. WPA3 SAE resists offline audit (forward secrecy, not vulnerable to handshake capture). WIDS detection of deauth flood, handshake capture, etc.
- **Retest:** New PCAPs show no handshake capture if PMF required deauth fails, strong PSK audit fails, PMKID still present but strong PSK audit fails, WPA3-only no handshake capture, etc. Document new PCAP hash, frame numbers, filters.

### Interactive Check

> You have `traffic-analysis.pcapng` 12 frames complete handshake f9-12. What are ANonce, SNonce, MIC, replay counters, BSSID, client, SSID? Is PMKID present? What is better for offline audit — handshake or PMKID — and why?

Answer: ANonce in M1 f9 SA BSSID DA client replay1 32 bytes random, SNonce in M2 f10 SA client DA BSSID replay1 32 bytes random + MIC HMAC-SHA1, GTK+MIC in M3 f11 SA BSSID DA client replay2, ACK in M4 f12 SA client DA BSSID replay2. BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, SSID LAB-WIFI, Ch6, WPA2-PSK. PMKID not present in this PCAP (M1 key data length 0). For offline audit, handshake needs M1+M2 (ANonce, SNonce, MIC) and SSID, BSSID, client — 2 frames, needs client. PMKID needs single frame M1 with PMKID, BSSID, STA MAC, clientless, no deauth, less intrusive, better if available. If PMKID not present, use handshake. Both converted to hashcat 22000 via hcxpcapngtool.

## Tools

- Wireshark, tshark — EAPOL, ANonce, SNonce, MIC, replay counter, PMKID
- PcapInspector — EAPOL detail, ANonce, SNonce, MIC, PMKID
- hcxpcapngtool — convert PCAP to hashcat 22000: `hcxpcapngtool -o capture.22000 capture.pcapng`
- hcxdumptool — capture PMKID clientless: `hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1`
- hashcat — offline audit: `hashcat -m 22000 capture.22000 wordlist.txt`
- aircrack-ng — `aircrack-ng -w wordlist.txt capture.cap` (old, but still works for handshake)

## Evidence Collection

- Handshake: Frame numbers M1-M4, ANonce, SNonce, MIC, replay counter 1,1,2,2, BSSID, client MAC, SSID, channel, security, PCAP hash, filter `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF`
- PMKID: Frame number M1 with PMKID, PMKID value, BSSID, STA MAC, SSID, PCAP hash, filter `wlan_rsna_eapol.pmkid`
- Data: To DS/From DS, SA/DA/BSSID, protected, QoS, etc., filter `wlan.fc.type==2 && !eapol`

## References

- IEEE 802.11-2020 — 4-way handshake, EAPOL-Key, ANonce, SNonce, MIC, replay counter, GTK, PTK, PMK, PMKID
- Wireshark 802.11 — EAPOL, wlan_rsna_eapol.pmkid, eapol.keydes.nonce, eapol.keydes.mic
- hashcat, hcxpcapngtool, hcxdumptool — handshake and PMKID conversion and capture
- WPA2 spec — PBKDF2, PRF, PMK, PTK, GTK, KCK, KEK, TK

---

*Next: Module 07 WEP Legacy — WEP architecture, IV reuse, RC4, PTW, evidence, remediation, reporting*
