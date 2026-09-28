> **Historical note (superseded).** This file records what an earlier phase did, including the
> former `mock_frames` fallback and the endpoints that returned placeholder data. Those paths were
> removed: decoding now uses tshark → scapy → the verified offline datasets in
> `frontend/public/lab-data/`, and the API returns explicit errors instead of invented values. See
> `docs/REVIEW_AND_DECISIONS.md` §6 and `SECURITY.md`.

# Phase F — Enterprise, EAP, RADIUS, Corporate Attacks, Methodology, Final Assessment — 20 Modules Complete

## Modules 15-20 Completed

### 15-enterprise-fundamentals
- Lessons: 01-enterprise-architecture (WPA2-EAP vs PSK, 802.1X supplicant/authenticator/RADIUS, roles, flow, hostapd config, wpa_supplicant, benefits, misconfig PEAP without cert validation, RADIUS weak secret, PMF, logs), 02-enterprise-testing (recon, config audit, client config audit bad vs good ca_cert+subject_match, PCAP analysis enterprise.pcapng tasks, rogue RADIUS simulation, reporting template, retest)
- PCAP: enterprise.pcapng 13f Corp-Enterprise WPA2-EAP Ch6 AA:BB:CC:DD:EE:FF assoc open EAPOL Start Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello MSCHAPv2 Challenge/Response Success 4-way M1-M4
- Config: hostapd.conf Enterprise ieee8021x=1 wpa_key_mgmt=WPA-EAP auth_server testing123 weak, wpa_supplicant.conf no ca_cert vulnerable, good with ca_cert+subject_match
- Quiz: 5q Enterprise AKM WPA-EAP roles supplicant/authenticator/RADIUS PEAP no ca_cert risk RADIUS secret 22+ benefit per-user

### 16-eap
- Lessons: 01-eap-protocols (EAP types TLS mutual most secure, PEAP outer TLS inner MSCHAPv2 flow weakness if no cert validation rogue RADIUS captures challenge/response hashcat -m 5500, EAP-TTLS PAP, cert validation critical ca_cert+subject_match, testing methodology, defense, reporting), 02-eap-testing (eap.pcapng 13f tasks)
- PCAP: eap.pcapng 13f same as enterprise but focus MSCHAPv2 Challenge/Response
- Config: bad PEAP no ca_cert, good PEAP with ca_cert+subject_match, good EAP-TLS mutual
- Quiz: 5q most secure EAP-TLS, PEAP without validation captures challenge/response hashcat 5500, client validation via ca_cert+subject_match, EAP-TLS requires client+server cert, defense layers

### 17-radius
- Lessons: 01-radius-architecture (RADIUS ports 1812/1813 UDP shared secret MD5 obfuscation should be 22+ random not testing123, AAA, FreeRADIUS architecture clients.conf users eap.conf radiusd.conf sites-enabled certs, logs auth accounting, misconfig weak secret no RadSec weak user passwords no accounting clients.conf 0.0.0.0/0, testing methodology config audit PCAP radius.pcapng, defense strong secret RadSec isolated VLAN strong passwords lockout monitoring), 02-radius-testing (radius.pcapng 13f tasks)
- PCAP: radius.pcapng 13f beacon Enterprise assoc EAP Identity RADIUS Access-Request user@corp.com NAS 192.168.1.1 secret testing123 weak Access-Challenge MSCHAPv2 Challenge Access-Request MSCHAPv2 Response Access-Accept MSK VLAN 100 4-way Accounting Start
- Config: clients.conf testing123 weak 0.0.0.0/0 any IP, good strong 22+ chars per NAS, users WeakPass VLAN 100, eap.conf certs
- Quiz: 5q ports 1812/1813, secret 22+ per NAS, RadSec TLS encryption, users strong passwords VLAN lockout, clients.conf restrict AP IPs

### 18-corporate-attacks
- Lessons: 01-corporate-attack-surface (corporate attack surface multiple SSIDs Enterprise/Guest/IoT VLANs segmentation Guest isolated but misconfig allows bypass client isolation, attack chains rogue+credential capture+segmentation bypass+VLAN hopping+client isolation bypass+captive rogue+WPA3 downgrade, defense layers WIDS authorized list 802.1X cert validation PMF strong secret RadSec VLAN ACL ap_isolate monitoring training audits, PCAP corporate-attacks.pcapng 14f 3 SSIDs + rogue + deauth + segmentation + isolation), 02-corporate-testing (corporate-attacks.pcapng tasks)
- PCAP: corporate-attacks.pcapng 14f beacons Enterprise Ch6 AA:BB:CC:DD:EE:FF Guest Open Ch11 BB:CC:DD:EE:FF:00 IoT PSK WPS Ch1 CC:DD:EE:FF:00:11 rogue 11:22:33:44:55:66 clones Enterprise Ch11 deauth 2 client assoc to rogue EAP Identity user@corp.com MSCHAPv2 Challenge/Response ARP isolation disabled ICMP Corp VLAN 100→Guest 200 success ACL misconfig
- Config: hostapd 3 SSIDs VLAN ACL BAD allows Corp→Guest should DROP WIDS missing rogue wpa_supplicant no ca_cert RADIUS testing123
- Quiz: 5q corporate chain recon→rogue→deauth→client without cert→MSCHAPv2→VLAN access, segmentation bypass Corp→Guest ping ACL misconfig, isolation bypass ap_isolate=0 ARP spoof, defense layers, rogue detection WIDS

### 19-methodology
- Lessons: 01-pt-methodology (full wireless PT methodology scope ROE recon passive active Kismet airodump-ng Wireshark enum vuln analysis per SSID WEP Critical WPS High 11k WPA2 weak Medium/High PMF disabled Medium transition downgrade Medium PEAP no cert High RADIUS weak Medium open no isolation Medium captive MAC bypass Medium rogue High segmentation High, exploitation simulated authorized WEP PTW 40k WPA2 handshake offline audit PMKID clientless WPS wash 11k WPA3 downgrade deauth rogue EAP rogue RADIUS MSCHAPv2 hashcat 5500 captive MAC spoof corporate segmentation, post-exploitation scan internal, reporting executive summary findings evidence impact recommendation retest, retest verify fixes, tools simulated, evidence chain custody hash SHA256 frame numbers filters config hash logs screenshots commands reproducible, professional tips), 02-reporting-retest (finding template Title Severity Description Technical Affected Evidence Impact Recommendation References Retest, full report structure executive summary scope methodology findings risk summary recommendation summary retest references appendices, lab tasks methodology.pcapng with all issues, ReportEditor usage, retest)
- PCAP: methodology.pcapng 24f 6 APs +1 rogue 5 clients 1 hidden HIDDEN-LAB revealed via probe response deauth assoc to rogue EAP Identity MSCHAPv2 EAPOL weak PSK HTTP GET 302 portal POST HTTP segmentation bypass isolation bypass
- Config: scope 6 APs +1 rogue etc methodology combined
- Quiz: 5q methodology order scope→recon→enum→vuln→exploitation→post→reporting→retest, evidence chain custody hash frame numbers filters config hash logs screenshots commands reproducible, severity based on impact likelihood business risk, recommendation actionable with config snippets, retest verifies fixes new PCAPs configs logs

### 20-final-assessment
- Lessons: 01-final-scope (scope example 6 APs +1 rogue 5 clients VLANs rogue 11:22:33:44:55:66 time 8h allowed attacks simulated passive recon PCAP analysis config audit no real deauth without PMF check authorization rogue simulation via PCAPs no real credential cracking simulated via challenges reporting via ReportEditor authorization letter, methodology scope→recon→enum→vuln→exploitation simulated→post simulated→reporting→retest, PCAPs all previous methodology.pcapng combines all, challenges chal-09-final-recon assessment 500pts, lab simulated vs hardware, reporting full professional, retest), 02-final-reporting (final report structure executive summary scope ROE methodology findings example top 5 WPS High 11k 3 SSIDs WPA2 weak High WeakPass123 IoT and TRANS PEAP no cert High Enterprise client without ca_cert RADIUS weak Medium open Guest without isolation Medium captive MAC bypass Medium segmentation bypass High Corp→Guest rogue not detected High, risk summary table overall High, recommendation summary prioritized quick wins vs long-term config snippets, retest, references, appendices, lab tasks final assessment no hints, ReportEditor usage, retest, flag WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE})
- PCAP: methodology.pcapng 24f final assessment combined
- Config: final scope all issues combined flag
- Quiz: 5q final assessment 6 APs +1 rogue, top findings WPS High WPA2 weak High PEAP no cert High etc, overall risk High, quick wins vs long-term, final flag

## PCAPs Phase F

- enterprise.pcapng 13f (beacon Enterprise WPA2-EAP Ch6, assoc open, EAPOL Start, Request Identity, Response Identity user@corp.com, PEAP TLS ClientHello ServerHello, MSCHAPv2 Challenge/Response, Success, 4-way M1-M4)
- eap.pcapng 13f (similar PEAP MSCHAPv2 focus)
- radius.pcapng 13f (beacon, assoc, EAP Identity, RADIUS Access-Request user@corp.com NAS 192.168.1.1 secret testing123 weak, Access-Challenge MSCHAPv2 Challenge, Access-Request MSCHAPv2 Response, Access-Accept MSK VLAN 100, 4-way, Accounting Start)
- corporate-attacks.pcapng 14f (3 SSIDs Enterprise/Guest/IoT + rogue clones Enterprise Ch11, deauth 2, assoc to rogue, EAP Identity user@corp.com, MSCHAPv2 Challenge/Response, ARP isolation disabled, ICMP Corp VLAN 100→Guest 200 success ACL misconfig segmentation bypass)
- methodology.pcapng 24f (6 APs +1 rogue, 5 clients, hidden HIDDEN-LAB revealed via probe response, deauth, assoc to rogue, EAP Identity, MSCHAPv2, EAPOL weak PSK, HTTP GET 302 portal POST HTTP, segmentation bypass, isolation bypass — final assessment combined)

Mirrored to content/pcaps/{enterprise,eap,radius,corporate,methodology}/ and frontend/public/pcaps/{enterprise,eap,radius,corporate,methodology}/

Backend /api/pcaps 16 PCAPs:
beacon-only 5f, recon-lab 13f, traffic-analysis 12f, wpa2-handshake 11f 4 EAPOL, pmkid 1f, wps-beacon 2f WPS, wpa3-transition 2f, wpa3-only 1f, deauth 14f 12 deauth 1 disassoc, rogue-ap 7f, captive-portal 6f, enterprise 13f 5 EAPOL, eap 13f, radius 13f VLAN 100, corporate-attacks 14f 4 beacons 2 deauth 1 WPS, methodology 24f 7 beacons 2 probes 4 EAPOL 1 deauth 3 WPS

## Backend Parser Phase F

- mock_frames extended for enterprise/eap (Beacon Enterprise, Assoc Req/Resp, EAPOL Start, EAP Request Identity, Response Identity user@corp.com, PEAP TLS, MSCHAPv2 Challenge/Response, Success, EAPOL M1-M4), radius (Beacon, EAP Identity, RADIUS Access-Request secret testing123 weak, Access-Challenge, Access-Request MSCHAPv2 Response, Access-Accept MSK VLAN 100, EAPOL, Accounting), corporate (3 SSIDs Enterprise/Guest/IoT + rogue, deauth, assoc to rogue, EAP Identity, MSCHAPv2, ARP isolation disabled, ICMP Corp→Guest success segmentation bypass), methodology/final (6 APs +1 rogue, hidden, WPS, weak PSK, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, rogue, segmentation)
- EAPOL robust detection via LLC/SNAP Raw 02 03 + 88 8e
- Summary includes beacons/probes/eapol/deauth/disassoc/assoc/wps

## Frontend

- PcapInspector: filter presets EAP, RADIUS added
- ModuleDetail: lessonMap 15-20, labMap 15-20, quizData 15-20 5q each, ConfigViewer for enterprise bad wpa_supplicant no ca_cert RADIUS testing123, eap PEAP vs EAP-TLS, radius clients.conf testing123 0.0.0.0/0 weak users, corporate 3 SSIDs VLAN ACL allow Corp→Guest rogue not in authorized, methodology full scope, final all issues combined, AttackDefenseRetest for enterprise rogue RADIUS credential capture→cert validation+EAP-TLS+strong secret+RadSec+PMF+WIDS, radius weak secret→strong secret+RadSec+monitoring, corporate rogue+segmentation+isolation→WIDS+cert+EAP-TLS+strong secret+RadSec+PMF+VLAN ACL deny+isolation+monitoring, final all combined, tasks for 15-20, VAPT context for 15-20
- Labs: 18 labs 16 PCAPs 20 modules complete
- Challenges: 15 challenges (added 5 new Phase F + legacy final): chal-09-enterprise 300pts PEAP no cert flag WIFIFORGE{ENTERPRISE_PEAP_NO_CERT_VALIDATION}, chal-10-eap 300pts MSCHAPv2 capture flag WIFIFORGE{EAP_PEAP_MSCHAPV2_CAPTURE}, chal-11-radius 200pts weak secret flag WIFIFORGE{RADIUS_WEAK_SECRET_NO_RADSEC}, chal-12-corporate 400pts rogue+segmentation+isolation flag WIFIFORGE{CORPORATE_ROGUE_SEGMENTATION_ISOLATION_BYPASS}, chal-13-methodology 400pts full assessment prep flag WIFIFORGE{METHODOLOGY_FULL_ASSESSMENT_PREP}, chal-14-final 500pts final no hints flag WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}, plus legacy chal-09-final-recon
- Build 812kB 233kB gz success, 2404→2450+ modules

## Verification

- Backend parser: enterprise 13f 5 EAPOL, eap 13f, radius 13f VLAN 100, corporate 14f 4 beacons 2 deauth 1 WPS, methodology 24f 7 beacons 2 probes 4 EAPOL 1 deauth 3 WPS
- Backend /api/pcaps 16 PCAPs listed
- Frontend build success

## 20 Modules Complete

1. 01-intro-wireless (hardware intro)
2. 02-wifi-fundamentals (simulated beacon, config)
3. 03-80211-architecture (frames)
4. 04-kali-wireless-setup (hardware)
5. 05-wireless-recon (recon-lab 13f hidden)
6. 06-traffic-analysis (traffic-analysis 12f association flow)
7. 07-wep-legacy (WEP Critical)
8. 08-wpa-wpa2 (WPA2 architecture)
9. 09-wpa2-practical (wpa2-handshake 11f 4 EAPOL, pmkid 1f)
10. 10-wps (wps-beacon 2f WPS 11k)
11. 11-wpa3 (wpa3-transition 2f, wpa3-only 1f)
12. 12-deauth-disassoc (deauth 14f 12 deauth)
13. 13-rogue-ap (rogue-ap 7f Evil Twin)
14. 14-captive-portals (captive-portal 6f MAC bypass)
15. 15-enterprise-fundamentals (enterprise 13f PEAP no cert)
16. 16-eap (eap 13f MSCHAPv2)
17. 17-radius (radius 13f weak secret VLAN 100)
18. 18-corporate-attacks (corporate-attacks 14f segmentation bypass)
19. 19-methodology (methodology 24f full)
20. 20-final-assessment (methodology 24f final flag)

Zero-cost, local-first, simulated + hardware, VAPT methodology, 16 PCAPs, 15 challenges, ReportEditor, PcapInspector, ConfigViewer, AttackDefenseRetest, professional reporting.

Next: Polish, README, deployment, hardware labs integration docs, final README with architecture, stack, repo structure, MVP, reference module, roadmap.
