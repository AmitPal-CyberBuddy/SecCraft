# Phase E — Deauth, Rogue AP, Captive Portals + Challenges + Reporting

## PCAPs Generated (scripts/generate_phase_e_pcaps.py)
- deauth.pcapng 14 frames 781B: 1 beacon LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK PMF disabled (MFPC=0 MFPR=0) + 10 deauth AP→client reason 7 + 2 client→AP reason 7 + 1 disassoc reason 8
- rogue-ap.pcapng 7 frames 578B: legit AA:BB:CC:DD:EE:FF Ch6 vs rogue 11:22:33:44:55:66 Ch11 same SSID Corp-WLAN, probe req 12:34:56:78:9A:BC, probe resp both, assoc req/resp to rogue f6-7
- captive-portal.pcapng 6 frames 696B: beacon Guest-WLAN Open Ch6 BSSID AA:BB:CC:DD:EE:FF, assoc open, data LLC/SNAP/IP/TCP HTTP GET example.com, 302 redirect portal.guest.com/login, POST login over HTTP (weak)

Mirrored to content/pcaps/{deauth,rogue,captive}/ and frontend/public/pcaps/{deauth,rogue,captive}/

Backend /api/pcaps now 11 PCAPs:
beacon-only, recon-lab, traffic-analysis, wpa2-handshake 11f, pmkid, wps-beacon, wpa3-transition, wpa3-only, deauth 14f, rogue-ap 7f, captive-portal 6f

## Backend Parser (backend/app/services/pcap_parser.py)
- Subtype handling: 12 Deauth, 10 Disassoc, 0 Assoc Req, 1 Assoc Resp, 8 Beacon, 4/5 Probe, 11 Auth, Data+EAPOL
- Reason codes: Dot11Deauth.reason, Dot11Disas.reason
- WPS IE detection: ID 221 OUI 00:50:F2:04
- EAPOL robust: haslayer(EAPOL) or SNAP code 0x888e or Raw load starts 02 03 / 01 03 or payload contains 88 8e or AA AA 03 00 00 00 88 8E
- Summary: beacons, probes, eapol, deauth, disassoc, assoc, wps, ssids, bssids, clients, channels
- Mock fallback for Phase E: deauth 12 deauth reason7 +1 disassoc, rogue legit vs rogue, captive open + HTTP

## Frontend PcapInspector
- filterPresets: All, Beacons 8, Probe Req 4, Probe Resp 5, EAPOL, Auth 11, Deauth 12, Disassoc 10, Assoc Req 0, Assoc Resp 1, WPS
- Frame: reason, wps fields
- Summary: deauth/disassoc/wps counts
- Badge colors: Beacon cyan, Probe violet, EAPOL amber, Deauth red, Disassoc orange, Assoc emerald
- Reason R7 etc displayed

## ModuleDetail
- lessonMap 12-14 added
- labMap: lab-12-deauth (deauth), lab-13-rogue (rogue-ap), lab-14-captive (captive-portal)
- quizData: 12-deauth 5q (subtype 12, PMF disabled spoofable, ieee80211w=2 required, WPA3 mandates required, detection many deauth same BSSID), 13-rogue 5q (same SSID diff BSSID ESS vs rogue, Evil Twin auto-connect if stronger/deauthed, Enterprise rogue RADIUS EAP creds, defense WIDS authorized list + 802.1X cert validation, client assoc to rogue f6-7), 14-captive 5q (open, traffic sniffable, MAC spoof bypass, ap_isolate=1, OWE/WPA2-PSK guest)
- ConfigViewer: 12-deauth PMF disabled vs required, 13-rogue authorized list + rogue hostapd.conf, 14-captive open + ap_isolate
- AttackDefenseRetest for 12-14: Deauth flood DoS + handshake capture → PMF required + WIDS, Rogue Evil Twin → WIDS authorized + 802.1X cert validation, Captive bypass MAC spoof + HTTP sniff → HTTPS + isolation + OWE
- Tasks: deauth count reason codes PMF, rogue BSSIDs legit vs rogue client assoc, captive open redirect HTTPS MAC bypass

## Labs Page
- 12 labs, 11 PCAPs, Phase D+E types, search includes deauth rogue captive PMF WPS

## Challenges
- challenges.json 9 challenges:
  chal-01-beacon guided 100pts recon 5 APs hidden HIDDEN-LAB f10 flag WIFIFORGE{RECON_5_APS_HIDDEN_REVEALED}
  chal-02-handshake semi-guided 200pts handshake 4 EAPOL complete flag WIFIFORGE{HANDSHAKE_4_EAPOL_COMPLETE}
  chal-03-pmkid 200pts clientless single frame flag WIFIFORGE{PMKID_CLIENTLESS_SINGLE_FRAME}
  chal-04-wps guided 150pts WPS 11k PIN flaw flag WIFIFORGE{WPS_11K_PIN_FLAW}
  chal-05-wpa3-transition advanced 250pts AKM PSK+SAE PMF optional downgrade flag WIFIFORGE{WPA3_TRANSITION_PMF_OPTIONAL_DOWNGRADE}
  chal-06-deauth guided 150pts deauth 12 reason7 PMF disabled flag WIFIFORGE{DEAUTH_12_PMF_DISABLED}
  chal-07-rogue advanced 300pts rogue Evil Twin detected flag WIFIFORGE{ROGUE_AP_EVIL_TWIN_DETECTED}
  chal-08-captive semi-guided 250pts MAC spoof bypass flag WIFIFORGE{CAPTIVE_PORTAL_MAC_SPOOF_BYPASS}
  chal-09-final-recon assessment 500pts final assessment flag WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}
  Fields: id/title/module/difficulty/type/level/estimated_time/points/status/description/objectives/artifacts/tasks/flag/skills

- ChallengeCard.tsx: levelColors guided cyan-500/10, semi-guided violet, assessment amber, difficultyColors Beginner emerald Intermediate amber Advanced red Professional violet, typeIcons pcap_analysis FlaskConical config_analysis FileText investigation Search terminal Terminal knowledge_check Shield, points/time/status

- Challenges.tsx: filters level/difficulty, total points, 3 level cards guided/semi-guided/assessment

- ChallengeDetail.tsx: objectives, artifacts PcapInspector ConfigViewer, tasks with hint toggle answer validation, flag submit correct/incorrect, info sidebar skills level difficulty time points, reporting note

## Reports
- Reports.tsx uses ReportEditor
- ReportEditor.tsx: Finding fields Title/Severity/Description/TechnicalDetails/AffectedComponent/Evidence/Impact/Recommendation/References/Retest, default finding insecure Wi-Fi WPS+PMF, markdown generation, preview toggle, export MD, save draft localStorage, professional VAPT template Title Severity Description Technical Affected Evidence Impact Recommendation References Retest

## App Routes
- /challenges/:id added

## Build
- 2404 modules, 223kB gz, success
- Backend verified: deauth 14f deauth 12 disassoc 1, rogue 7f legit vs rogue Ch6 vs Ch11, captive 6f open HTTP redirect, handshake 4 EAPOL, wps 1 WPS, wpa3-transition 2f

## Next Phase F (remaining)
- Modules 15-20: Enterprise WPA2-EAP, Client attacks, WIDS/WIPS evasion, Advanced MITM, Reporting final, Hardware labs integration
- Backend progress DB, SQLite findings
- Frontend Modules page completion tracking, Dashboard stats
- Final assessment chain challenge with all artifacts
