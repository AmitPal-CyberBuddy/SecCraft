import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useProgressStore } from '@/store/useProgressStore'
import { PcapInspector } from '@/components/lab/PcapInspector'
import { ConfigViewer } from '@/components/lab/ConfigViewer'
import { ReconMap } from '@/components/lab/ReconMap'
import { HandshakeDiagram } from '@/components/lab/HandshakeDiagram'
import { AttackDefenseRetest } from '@/components/lab/AttackDefenseRetest'
import { ReadingProgress, LessonReadingProgress } from '@/components/learning/ReadingProgress'
import { motion, AnimatePresence } from 'framer-motion'
import modules from '@/content/modules.json'
import { ArrowLeft, BookOpen, FlaskConical, CheckCircle, Clock, Shield, FileText, Swords, Radio, AlertTriangle, Wifi, Target, Sparkles, ChevronRight, Layers, Award, Zap, List, Eye, Type, Maximize2 } from 'lucide-react'

const lessonMap: Record<string, string[]> = {
  "01-intro-wireless": ["01-what-is-wireless", "02-wireless-vs-wifi", "03-attack-surface", "04-methodology-ethics"],
  "02-wifi-fundamentals": ["01-ssid-bssid", "02-ap-client", "03-channels-bands", "04-wlan-architecture"],
  "03-80211-architecture": ["01-ieee-80211-standard", "02-frames-management-control-data", "03-beacon-probe-auth-assoc", "04-channels-bands-phy"],
  "04-kali-wireless-setup": ["01-interfaces-iw-ip", "02-managed-vs-monitor", "03-tools-ecosystem", "04-troubleshooting-lab"],
  "05-wireless-recon": ["01-ap-enumeration", "02-client-enumeration", "03-hidden-ssid-vendor", "04-recon-visualizer"],
  "06-traffic-analysis": ["01-wireshark-filters", "02-association-flow", "03-data-eapol-analysis", "04-traffic-visualizer"],
  "07-wep-legacy": ["01-wep-architecture", "02-wep-attacks", "03-remediation-reporting", "04-wep-visualizer"],
  "08-wpa-wpa2": ["01-wpa-wpa2-architecture", "02-handshake-deep-dive", "03-pmf-rsn-analysis", "04-wpa2-visualizer"],
  "09-wpa2-practical": ["01-handshake-analysis", "02-offline-audit", "03-pmkid-wordlist", "04-handshake-visualizer"],
  "10-wps": ["01-wps-architecture", "02-wps-enumeration", "03-exploitation-defense", "04-wps-visualizer"],
  "11-wpa3": ["01-wpa3-architecture", "02-transition-downgrade", "03-wpa3-only-hardening", "04-wpa3-visualizer"],
  "12-deauth-disassoc": ["01-deauth-protocol", "02-pmf-detection", "03-deauth-visualizer", "04-deauth-impact"],
  "13-rogue-ap": ["01-rogue-evil-twin", "02-detection-defense", "03-rogue-visualizer", "04-rogue-enterprise"],
  "14-captive-portals": ["01-captive-architecture", "02-testing-methodology", "03-portal-visualizer", "04-captive-advanced"],
  "15-enterprise-fundamentals": ["01-enterprise-architecture", "02-enterprise-testing", "03-enterprise-visualizer", "04-enterprise-hardening"],
  "16-eap": ["01-eap-protocols", "02-eap-testing", "03-eap-visualizer", "04-eap-advanced"],
  "17-radius": ["01-radius-architecture", "02-radius-testing", "03-radius-visualizer", "04-radius-hardening"],
  "18-corporate-attacks": ["01-corporate-attack-surface", "02-corporate-testing", "03-corporate-visualizer", "04-corporate-advanced"],
  "19-methodology": ["01-pt-methodology", "02-reporting-retest", "03-methodology-visualizer", "04-full-report-example"],
  "20-final-assessment": ["01-final-scope", "02-final-reporting", "03-final-visualizer", "04-final-flags-and-retest"],
}

const labMap: Record<string, { id: string, title: string, pcap: string, type: string, description: string }[]> = {
  "02-wifi-fundamentals": [
    { id: "lab-02-beacon", title: "Beacon Frame Analysis", pcap: "beacon-only", type: "PCAP Analysis", description: "Extract SSID, BSSID, channel, security from beacon-only.pcapng" },
    { id: "lab-02-config", title: "Config Audit", pcap: "", type: "Config Analysis", description: "Identify WPS, PMF, channel width issues" },
  ],
  "05-wireless-recon": [
    { id: "lab-05-recon", title: "Wireless Recon — AP & Client Enumeration", pcap: "recon-lab", type: "Recon Analysis", description: "Map 5 APs, hidden SSID, clients, PNL leakage from recon-lab.pcapng" },
  ],
  "06-traffic-analysis": [
    { id: "lab-06-traffic", title: "Traffic Analysis — Association Flow", pcap: "traffic-analysis", type: "Traffic Analysis", description: "Full flow: Beacon → Probe → Auth → Assoc → EAPOL handshake" },
  ],
  "07-wep-legacy": [
    { id: "lab-07-wep", title: "WEP Config Audit", pcap: "", type: "Config Analysis", description: "Identify WEP as Critical, understand IV reuse, RC4 weaknesses" },
  ],
  "08-wpa-wpa2": [
    { id: "lab-08-rsn", title: "RSN IE Analysis", pcap: "wpa2-handshake", type: "Beacon Analysis", description: "Analyze RSN IE: CCMP, PSK, PMF status from wpa2-handshake.pcapng" },
  ],
  "09-wpa2-practical": [
    { id: "lab-09-handshake", title: "WPA2 Handshake Analysis", pcap: "wpa2-handshake", type: "Handshake Analysis", description: "Identify M1-M4, ANonce, SNonce, MIC, completeness" },
    { id: "lab-09-pmkid", title: "PMKID Extraction", pcap: "pmkid", type: "PMKID Analysis", description: "Extract PMKID from EAPOL M1 key data" },
  ],
  "10-wps": [
    { id: "lab-10-wps", title: "WPS Enumeration", pcap: "wps-beacon", type: "WPS Analysis", description: "Detect WPS IE in beacon and probe response, BSSID, SSID, channel" },
  ],
  "11-wpa3": [
    { id: "lab-11-transition", title: "WPA3 Transition Analysis", pcap: "wpa3-transition", type: "WPA3 Analysis", description: "Identify transition mode: AKMs PSK+SAE, PMF optional, downgrade risk" },
    { id: "lab-11-wpa3-only", title: "WPA3-Only Good Config", pcap: "wpa3-only", type: "WPA3 Analysis", description: "Verify WPA3-only with PMF required — good config" },
  ],
  "12-deauth-disassoc": [
    { id: "lab-12-deauth", title: "Deauth Flood Analysis", pcap: "deauth", type: "Deauth Analysis", description: "Count deauth frames, reason codes, check PMF disabled, DoS impact" },
  ],
  "13-rogue-ap": [
    { id: "lab-13-rogue", title: "Rogue AP Detection", pcap: "rogue-ap", type: "Rogue Analysis", description: "Detect rogue BSSID cloning Corp-WLAN, legit vs rogue, client association to rogue" },
  ],
  "14-captive-portals": [
    { id: "lab-14-captive", title: "Captive Portal Analysis", pcap: "captive-portal", type: "Captive Analysis", description: "Open network, HTTP redirect to portal, login over HTTP, MAC spoof bypass, isolation" },
  ],
  "15-enterprise-fundamentals": [
    { id: "lab-15-enterprise", title: "Enterprise Recon & Config Audit", pcap: "enterprise", type: "Enterprise Analysis", description: "WPA2-EAP, 802.1X roles, supplicant/authenticator/RADIUS, PEAP without ca_cert risk" },
  ],
  "16-eap": [
    { id: "lab-16-eap", title: "EAP PEAP-MSCHAPv2 Analysis", pcap: "eap", type: "EAP Analysis", description: "PEAP TLS tunnel, MSCHAPv2 challenge/response, cert validation missing, hashcat -m 5500" },
  ],
  "17-radius": [
    { id: "lab-17-radius", title: "RADIUS Architecture & Weak Secret", pcap: "radius", type: "RADIUS Analysis", description: "Access-Request/Accept, VLAN 100, secret testing123 weak, users, logs" },
  ],
  "18-corporate-attacks": [
    { id: "lab-18-corporate", title: "Corporate Attack Chain", pcap: "corporate-attacks", type: "Corporate Analysis", description: "3 SSIDs Enterprise/Guest/IoT + rogue + deauth + segmentation bypass Corp→Guest + isolation bypass" },
  ],
  "19-methodology": [
    { id: "lab-19-methodology", title: "Full Methodology Assessment", pcap: "methodology", type: "Final Assessment", description: "6 APs, hidden SSID, WPS, weak PSK, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, rogue, segmentation" },
  ],
  "20-final-assessment": [
    { id: "lab-20-final", title: "Final Wireless PT Assessment", pcap: "methodology", type: "Final Assessment", description: "Independent assessment: scope, recon, enum, vuln, reporting, retest — all previous issues combined" },
  ],
}

const quizData: Record<string, any[]> = {
  "02-wifi-fundamentals": [
    { id: "q1", question: "What does a BSSID identify?", options: ["Wireless network (SSID)", "Specific AP/radio", "VLAN", "Encryption algorithm"], correct: 1, explanation: "BSSID is MAC of AP radio. SSID is human name." },
    { id: "q2", question: "How many non-overlapping channels in 2.4 GHz US?", options: ["1", "3", "6", "11"], correct: 1, explanation: "Only 1,6,11 are non-overlapping." },
    { id: "q3", question: "40 MHz in 2.4 GHz is:", options: ["Best practice", "Bad practice — causes overlap", "Required for WPA3", "Only for 6 GHz"], correct: 1, explanation: "40 MHz in 2.4 overlaps, bad practice." },
    { id: "q4", question: "Beacon frames are sent by:", options: ["Client", "AP", "Both", "RADIUS server"], correct: 1, explanation: "AP beacons every ~100ms." },
    { id: "q5", question: "Probe request can leak:", options: ["AP password", "Preferred networks (PNL)", "RADIUS secret", "Nothing"], correct: 1, explanation: "PNL = list of SSIDs client trusts." },
  ],
  "05-wireless-recon": [
    { id: "q1", question: "Hidden SSID beacon has SSID IE length:", options: ["32", "0", "6", "11"], correct: 1, explanation: "Hidden beacon has empty SSID, len 0, but probe response reveals." },
    { id: "q2", question: "How to reveal hidden SSID?", options: ["Deauth AP", "Probe response or assoc request contains SSID", "Brute force", "Cannot be revealed"], correct: 1, explanation: "Probe Response and Association Request contain real SSID." },
    { id: "q3", question: "PNL stands for:", options: ["Preferred Network List", "Private Network Layer", "Probe Network Log", "Protected Network List"], correct: 0, explanation: "PNL = Preferred Network List — SSIDs client has connected to." },
    { id: "q4", question: "OUI in MAC identifies:", options: ["Channel", "Vendor", "Security", "Signal strength"], correct: 1, explanation: "First 3 bytes = vendor OUI." },
    { id: "q5", question: "Same SSID, different BSSIDs means:", options: ["Different networks", "Same ESS, multiple APs", "Rogue AP", "Hidden SSID"], correct: 1, explanation: "Same SSID, different BSSIDs = ESS, multiple APs for roaming." },
  ],
  "06-traffic-analysis": [
    { id: "q1", question: "Wireshark filter for beacons:", options: ["wlan.fc.type==0", "wlan.fc.type_subtype==8", "eapol", "wlan_mgt.ssid==\"\""], correct: 1, explanation: "Type_subtype 8 = beacon." },
    { id: "q2", question: "4-way handshake frames are:", options: ["Beacons", "EAPOL", "Probe requests", "Deauth"], correct: 1, explanation: "EAPOL = 4-way handshake." },
    { id: "q3", question: "Association flow order:", options: ["Beacon→Probe→Auth→Assoc→EAPOL", "EAPOL→Beacon→Probe", "Auth→Beacon→Assoc", "Probe→EAPOL→Beacon"], correct: 0, explanation: "Correct order: Beacon, Probe, Auth, Assoc, EAPOL, Data." },
    { id: "q4", question: "Filter for specific BSSID:", options: ["wlan.bssid==AA:BB:CC:DD:EE:FF", "ssid==LAB-WIFI", "channel==6", "eapol"], correct: 0, explanation: "wlan.bssid filters AP." },
    { id: "q5", question: "Probe request reveals:", options: ["AP password", "Client PNL", "RADIUS secret", "Nothing"], correct: 1, explanation: "Client PNL leakage." },
  ],
  "07-wep-legacy": [
    { id: "q1", question: "WEP IV size:", options: ["24-bit", "48-bit", "128-bit", "256-bit"], correct: 0, explanation: "24-bit IV too small, repeats fast, leads to reuse." },
    { id: "q2", question: "WEP uses:", options: ["AES", "RC4", "ChaCha20", "DES"], correct: 1, explanation: "RC4 stream cipher with weak scheduling." },
    { id: "q3", question: "PTW attack needs how many frames?", options: ["4M", "500k", "40k", "10"], correct: 2, explanation: "PTW needs ~40k frames, 10 sec." },
    { id: "q4", question: "WEP ICV is:", options: ["HMAC-SHA1", "CRC32", "AES-CMAC", "MD5"], correct: 1, explanation: "CRC32 not cryptographic, malleable." },
    { id: "q5", question: "WEP finding severity:", options: ["Low", "Medium", "High", "Critical"], correct: 3, explanation: "WEP is Critical, key recovery in minutes." },
  ],
  "08-wpa-wpa2": [
    { id: "q1", question: "WPA2 uses:", options: ["RC4 TKIP", "AES CCMP", "DES", "ChaCha20"], correct: 1, explanation: "CCMP = AES-CTR + CBC-MAC." },
    { id: "q2", question: "PMK in PSK mode derived from:", options: ["BSSID only", "Passphrase + SSID via PBKDF2", "Random", "ANonce"], correct: 1, explanation: "PBKDF2-HMAC-SHA1 4096 iter." },
    { id: "q3", question: "PTK derived from:", options: ["PMK only", "PMK + ANonce + SNonce + BSSID + Client MAC", "Password only", "GTK only"], correct: 1, explanation: "PRF with PMK, nonces, MACs." },
    { id: "q4", question: "4-way handshake messages:", options: ["2", "3", "4", "5"], correct: 2, explanation: "M1 ANonce, M2 SNonce+MIC, M3 GTK+MIC, M4 ACK." },
    { id: "q5", question: "PMF protects:", options: ["Data frames", "Management frames (deauth/disassoc)", "Beacons only", "Nothing"], correct: 1, explanation: "802.11w protects management frames." },
  ],
  "09-wpa2-practical": [
    { id: "q1", question: "For offline audit you need:", options: ["SSID, BSSID, Client MAC, ANonce, SNonce, MIC", "Only BSSID", "Only SSID", "Only channel"], correct: 0, explanation: "Need SSID for PBKDF2, BSSID/client for PTK, nonces and MIC for verification." },
    { id: "q2", question: "PMKID is:", options: ["HMAC-SHA1-128(PMK, 'PMK Name' | BSSID | STA MAC)", "Random", "ANonce", "GTK"], correct: 0, explanation: "PMKID formula." },
    { id: "q3", question: "PMKID advantage:", options: ["Needs client", "Clientless, single frame, no deauth", "Needs 4-way", "Needs WPS"], correct: 1, explanation: "PMKID can be captured without client, single EAPOL." },
    { id: "q4", question: "Tool to convert PCAP to hashcat format:", options: ["aircrack-ng", "hcxpcapngtool", "iw", "wireshark"], correct: 1, explanation: "hcxpcapngtool -o capture.hc22000 capture.pcapng" },
    { id: "q5", question: "Hashcat mode for WPA2 22000 format:", options: ["2500", "22000", "16800", "0"], correct: 1, explanation: "22000 = WPA2 EAPOL + PMKID." },
  ],
  "10-wps": [
    { id: "q1", question: "WPS PIN digits:", options: ["4", "6", "8", "10"], correct: 2, explanation: "8 digits, last is checksum." },
    { id: "q2", question: "WPS PIN brute-force max due to halves:", options: ["100M", "11k", "100", "1M"], correct: 1, explanation: "First half 10^4 + second half 10^3 = 11000, not 10^8." },
    { id: "q3", question: "WPS IE OUI:", options: ["00:50:F2:04", "00:11:22:33", "AA:BB:CC:DD", "FF:FF:FF:FF"], correct: 0, explanation: "WPS vendor OUI 00:50:F2 type 4." },
    { id: "q4", question: "WPS enumeration tool:", options: ["wash", "aircrack-ng", "iw", "tshark only"], correct: 0, explanation: "wash -i wlan0 shows WPS APs." },
    { id: "q5", question: "Defense for WPS:", options: ["Enable WPS", "Disable WPS (wps_state=0)", "Use WEP", "Use open"], correct: 1, explanation: "Disable WPS." },
  ],
  "11-wpa3": [
    { id: "q1", question: "WPA3-Personal uses:", options: ["PSK", "SAE Dragonfly", "WEP", "TKIP"], correct: 1, explanation: "SAE = Simultaneous Authentication of Equals." },
    { id: "q2", question: "WPA3 requires:", options: ["PMF disabled", "PMF required (802.11w=2)", "WPS enabled", "TKIP"], correct: 1, explanation: "PMF required for WPA3." },
    { id: "q3", question: "SAE provides:", options: ["No forward secrecy", "Forward secrecy, offline audit not possible", "Same as PSK", "WEP"], correct: 1, explanation: "SAE has forward secrecy, resists offline audit." },
    { id: "q4", question: "Transition mode AKMs:", options: ["PSK only", "SAE only", "PSK+SAE", "WEP"], correct: 2, explanation: "Transition has both PSK(2) and SAE(8)." },
    { id: "q5", question: "Transition mode with PMF optional risk:", options: ["No risk", "Downgrade to WPA2 + deauth possible", "WPS risk", "WEP risk"], correct: 1, explanation: "PMF optional allows deauth, downgrade to WPA2 handshake capture." },
  ],
  "12-deauth-disassoc": [
    { id: "q1", question: "Deauth subtype:", options: ["0", "8", "12", "4"], correct: 2, explanation: "Subtype 12 = deauth, 10 = disassoc." },
    { id: "q2", question: "Without PMF, deauth frames are:", options: ["Encrypted", "Unauthenticated, spoofable", "Protected", "WPA3 only"], correct: 1, explanation: "Without PMF, management frames unauthenticated, spoofable for DoS and handshake capture." },
    { id: "q3", question: "PMF required is:", options: ["ieee80211w=0", "ieee80211w=1", "ieee80211w=2", "wps_state=0"], correct: 2, explanation: "ieee80211w=2 = PMF required, 1 = capable optional, 0 = disabled." },
    { id: "q4", question: "WPA3 mandates PMF:", options: ["Disabled", "Optional", "Required", "No PMF"], correct: 2, explanation: "WPA3 requires PMF required." },
    { id: "q5", question: "Deauth flood detection:", options: ["1 deauth per hour", "Many deauth same BSSID short interval", "Beacon only", "EAPOL only"], correct: 1, explanation: "Many deauth same BSSID reason 7 short interval = likely attack." },
  ],
  "13-rogue-ap": [
    { id: "q1", question: "Rogue AP with same SSID different BSSID is:", options: ["Same network", "ESS or rogue, need authorized list", "Hidden SSID", "WPS"], correct: 1, explanation: "Same SSID different BSSID could be ESS (multiple APs same network) or rogue, check authorized list, channel, vendor." },
    { id: "q2", question: "Evil Twin with same SSID and PSK (if PSK known) will:", options: ["Client will not connect", "Client may auto-connect if stronger or deauthed", "Requires WPS", "Requires PMF disabled only"], correct: 1, explanation: "If PSK known and same, client may connect to Evil Twin if stronger or after deauth." },
    { id: "q3", question: "Enterprise Evil Twin captures:", options: ["PSK", "EAP credentials via rogue RADIUS", "WEP key", "Nothing"], correct: 1, explanation: "Rogue RADIUS can capture EAP credentials like PEAP MSCHAPv2 if cert validation disabled." },
    { id: "q4", question: "Defense for rogue AP:", options: ["Disable WPS", "WIDS authorized AP list + 802.1X cert validation + PMF required + strong PSK + WPA3", "Use WEP", "Use open"], correct: 1, explanation: "Layered defense." },
    { id: "q5", question: "Client association to rogue in rogue-ap.pcapng frame?", options: ["No association", "Yes, 12:34:56:78:9A:BC to rogue 11:22:33:44:55:66 frame 6-7", "Only legit", "Only deauth"], correct: 1, explanation: "Client 12:34:56:78:9A:BC associates to rogue BSSID 11:22:33:44:55:66." },
  ],
  "14-captive-portals": [
    { id: "q1", question: "Captive portal SSID is typically:", options: ["WPA2-PSK", "Open", "WPA3-only", "WEP"], correct: 1, explanation: "Open with portal redirect, no encryption for data (unless OWE)." },
    { id: "q2", question: "Open network risk:", options: ["No risk", "Traffic sniffable, no encryption", "WPS risk", "PMF required"], correct: 1, explanation: "Open = no TK, traffic sniffable unless HTTPS." },
    { id: "q3", question: "MAC-based session bypass:", options: ["Not possible", "Sniff authenticated client MAC (open, no encryption) and spoof to bypass portal", "Requires WPS", "Requires deauth only"], correct: 1, explanation: "Open no encryption, MAC visible, firewall allows MAC after auth, spoof bypass." },
    { id: "q4", question: "Client isolation should be:", options: ["Disabled ap_isolate=0", "Enabled ap_isolate=1", "Not needed", "WEP only"], correct: 1, explanation: "ap_isolate=1 prevents client-to-client attacks on guest." },
    { id: "q5", question: "Better than pure open for guest:", options: ["WEP", "WPA3 OWE or WPA2-PSK with portal + isolation + HTTPS", "Open with no portal", "WPS"], correct: 1, explanation: "OWE gives encryption for open, or WPA2-PSK with portal, plus isolation and HTTPS." },
  ],
  "15-enterprise-fundamentals": [
    { id: "q1", question: "Enterprise vs Personal difference:", options: ["Same PSK for all", "Per-user credentials via 802.1X/RADIUS, PMK from MSK", "No auth", "WEP only"], correct: 1, explanation: "Enterprise uses 802.1X, per-user, PMK from MSK not PBKDF2." },
    { id: "q2", question: "802.1X roles:", options: ["Only AP", "Supplicant (client), Authenticator (AP), Authentication Server (RADIUS)", "Only RADIUS", "Only client"], correct: 1, explanation: "Supplicant → Authenticator → Authentication Server." },
    { id: "q3", question: "PEAP without ca_cert risk:", options: ["No risk", "Evil Twin + rogue RADIUS captures MSCHAPv2 for offline crack", "WPS risk", "WEP risk"], correct: 1, explanation: "Without cert validation, client accepts any cert, sends MSCHAPv2 to attacker." },
    { id: "q4", question: "RADIUS shared secret should be:", options: ["testing123", "Strong 22+ chars random", "password", "secret"], correct: 1, explanation: "Strong 22+ chars, not default." },
    { id: "q5", question: "Enterprise benefit:", options: ["No benefit", "Per-user revocation, VLAN, accounting, no shared PSK", "WPS only", "Open only"], correct: 1, explanation: "Per-user, revocation, VLAN, accounting." },
  ],
  "16-eap": [
    { id: "q1", question: "Most secure EAP:", options: ["PEAP without validation", "EAP-TLS mutual cert auth", "EAP-FAST", "PAP"], correct: 1, explanation: "EAP-TLS mutual cert, requires PKI, most secure." },
    { id: "q2", question: "PEAP-MSCHAPv2 without cert validation allows:", options: ["Nothing", "Rogue RADIUS captures challenge/response for hashcat -m 5500", "WPS", "WEP"], correct: 1, explanation: "MSCHAPv2 challenge/response captured, offline crack." },
    { id: "q3", question: "Client must validate server cert via:", options: ["No validation", "ca_cert + subject_match/altsubject_match/domain_suffix_match", "WPS", "Open"], correct: 1, explanation: "ca_cert + subject_match ensures cert for expected server." },
    { id: "q4", question: "EAP-TLS requires:", options: ["Only password", "Client cert + server cert mutual", "WPS PIN", "No cert"], correct: 1, explanation: "Mutual cert auth." },
    { id: "q5", question: "Defense for PEAP:", options: ["Disable cert validation", "Enforce ca_cert + subject_match via MDM/GPO, prefer EAP-TLS, strong RADIUS secret, PMF, WIDS", "Use WEP", "Use open"], correct: 1, explanation: "Layered defense." },
  ],
  "17-radius": [
    { id: "q1", question: "RADIUS ports:", options: ["80/443", "1812 auth 1813 accounting", "22/23", "53"], correct: 1, explanation: "1812 auth, 1813 accounting (old 1645/1646)." },
    { id: "q2", question: "RADIUS shared secret should be:", options: ["testing123", "Strong 22+ chars random per NAS", "password", "secret"], correct: 1, explanation: "Strong 22+ chars, unique per NAS if possible, not default." },
    { id: "q3", question: "RadSec is:", options: ["RADIUS over UDP no encryption", "RADIUS over TLS for encryption", "WPS", "Open"], correct: 1, explanation: "RadSec = RADIUS over TLS, encrypts traffic, better than UDP with MD5 obfuscation." },
    { id: "q4", question: "RADIUS users file should have:", options: ["Weak passwords", "Strong passwords, VLAN assignment, complexity, lockout", "No passwords", "WPS"], correct: 1, explanation: "Strong passwords, VLAN, lockout, 2FA maybe." },
    { id: "q5", question: "clients.conf should restrict:", options: ["0.0.0.0/0 any IP with weak secret", "Only AP IPs with strong secret", "No restriction", "WEP only"], correct: 1, explanation: "Restrict to AP IPs, not 0.0.0.0/0." },
  ],
  "18-corporate-attacks": [
    { id: "q1", question: "Corporate attack chain rogue AP + Enterprise:", options: ["No attack", "Recon → rogue same SSID → deauth if PMF not required → client without cert validation connects to rogue → capture MSCHAPv2 → offline crack → network access", "WPS only", "Open only"], correct: 1, explanation: "Full chain." },
    { id: "q2", question: "Segmentation bypass means:", options: ["No bypass", "Corp VLAN can ping Guest VLAN when ACL misconfigured, should be isolated", "WPS bypass", "Open bypass"], correct: 1, explanation: "VLAN ACL should deny inter-VLAN, if allows, bypass." },
    { id: "q3", question: "Client isolation bypass if ap_isolate=0:", options: ["No bypass", "Clients on same SSID can ARP spoof, sniff, attack each other", "WPS only", "PMF only"], correct: 1, explanation: "Isolation disabled allows client-to-client attacks." },
    { id: "q4", question: "Defense layers for corporate:", options: ["None", "WIDS authorized list + 802.1X cert validation + EAP-TLS + strong RADIUS secret + RadSec + PMF required + VLAN ACL deny + ap_isolate=1 + monitoring SIEM + training", "WEP", "Open"], correct: 1, explanation: "Layered defense." },
    { id: "q5", question: "Rogue detection via:", options: ["No detection", "WIDS authorized AP list BSSID channel vendor signal, alert, contain", "WPS only", "Open only"], correct: 1, explanation: "WIDS detects rogue same SSID different BSSID/channel not in authorized list." },
  ],
  "19-methodology": [
    { id: "q1", question: "Wireless PT methodology order:", options: ["Exploit first", "Scope → Recon → Enum → Vuln Analysis → Exploitation (authorized) → Post-Exploitation → Reporting → Retest", "Report first", "Retest first"], correct: 1, explanation: "Standard methodology." },
    { id: "q2", question: "Evidence chain of custody includes:", options: ["No evidence", "PCAP hash SHA256, frame numbers, filters, config hash, logs, screenshots, commands, reproducible", "Only screenshots", "Only logs"], correct: 1, explanation: "Evidence must be reproducible with hashes, frame numbers, filters, commands." },
    { id: "q3", question: "Finding severity based on:", options: ["Technical only", "Impact and likelihood, business risk, not just technical", "Only CVSS", "Only WPS"], correct: 1, explanation: "Severity based on impact and likelihood, business risk." },
    { id: "q4", question: "Recommendation should be:", options: ["Fix it", "Actionable with config snippets, not just 'fix it'", "No recommendation", "WEP"], correct: 1, explanation: "Actionable with config snippets." },
    { id: "q5", question: "Retest verifies:", options: ["Nothing", "Fixes via new PCAPs, configs, logs, what should happen vs what actually happened", "Only old PCAPs", "Only screenshots"], correct: 1, explanation: "Retest with new evidence." },
  ],
  "20-final-assessment": [
    { id: "q1", question: "Final assessment includes how many APs in methodology.pcapng?", options: ["1", "3", "6 APs + 1 rogue", "10"], correct: 2, explanation: "6 legit + 1 rogue = 7 total, 6 legit: Enterprise, Guest, IoT, Hidden, WPA3-TRANS, WPS." },
    { id: "q2", question: "Top findings for final should include:", options: ["Only WPS", "WPS High 11k, WPA2-PSK weak High, PEAP no cert High, RADIUS weak secret Medium, open no isolation Medium, captive MAC bypass Medium, rogue High, segmentation bypass High", "Only open", "Only WEP"], correct: 1, explanation: "Multiple High findings." },
    { id: "q3", question: "Overall risk for final with multiple High:", options: ["Low", "Medium", "High", "Critical"], correct: 2, explanation: "Multiple High = High overall, if Critical like WEP or segmentation to sensitive VLAN, Critical." },
    { id: "q4", question: "Quick wins vs long-term:", options: ["No quick wins", "Quick wins: disable WPS, strong PSK 20+, PMF required, ca_cert, strong RADIUS secret, ap_isolate=1, VLAN ACL deny; Long-term: WPA3-only, EAP-TLS, RadSec, WIDS, monitoring, training, audits", "Only long-term", "Only WEP"], correct: 1, explanation: "Prioritized recommendation." },
    { id: "q5", question: "Final flag:", options: ["WIFIFORGE{RECON}", "WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}", "WIFIFORGE{WPS}", "WIFIFORGE{DEAUTH}"], correct: 1, explanation: "Final assessment flag." },
  ],
}

export function ModuleDetail() {
  const { id } = useParams<{ id: string }>()
  const module = modules.find(m => m.id === id)
  const [activeTab, setActiveTab] = useState<'overview' | 'theory' | 'lab' | 'quiz' | 'report'>('overview')
  const [activeLesson, setActiveLesson] = useState(0)
  const [lessonContent, setLessonContent] = useState<string>('')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [labAnswers, setLabAnswers] = useState<Record<string, string>>({})
  const [labCompleted, setLabCompleted] = useState<Record<string, boolean>>({})

  const completeLesson = useProgressStore(s => s.completeLesson)
  const completeLab = useProgressStore(s => s.completeLab)
  const completeQuiz = useProgressStore(s => s.completeQuiz)
  const isLessonCompleted = useProgressStore(s => s.isLessonCompleted)
  const getProgress = useProgressStore(s => s.getModuleProgress)

  const lessons = lessonMap[id || ''] || ["01-overview"]
  const labs = labMap[id || ''] || []
  const quizzes = quizData[id || ''] || []
  const theoryContentRef = useRef<HTMLDivElement>(null)
  const [readingMode, setReadingMode] = useState<'default' | 'focus' | 'wide'>('default')
  const [showToc, setShowToc] = useState(false)

  // Scroll to top whenever module, lesson, or tab changes — fixes UX issue
  useEffect(() => {
    // Scroll window to top instantly for module changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [id])

  useEffect(() => {
    // Scroll theory content to top when lesson changes
    if (activeTab === 'theory') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (theoryContentRef.current) {
        theoryContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
      // Scroll to theory start anchor
      const anchor = document.getElementById('theory-content-start')
      if (anchor) {
        setTimeout(() => {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [activeLesson, activeTab])

  useEffect(() => {
    if (activeTab === 'theory') {
      const lessonId = lessons[activeLesson]
      import(`../content/lessons/${id}/${lessonId}.md?raw`)
        .then(mod => setLessonContent(mod.default))
        .catch(() => setLessonContent(`# ${lessonId}\n\nContent coming soon for Module ${id}.`))
    }
  }, [activeTab, activeLesson, id, lessons])

  // Generate TOC from lessonContent
  const toc = useMemo(() => {
    if (!lessonContent) return []
    const headings: { id: string; text: string; level: number }[] = []
    const lines = lessonContent.split('\n')
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].replace(/[#*`]/g, '').trim()
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        headings.push({ id, text, level })
      }
    })
    return headings.slice(0, 20) // Limit to 20 for readability
  }, [lessonContent])

  if (!module) {
    return (
      <div className="max-w-[800px] mx-auto p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-slate-500" />
        </div>
        <div className="text-slate-400 font-heading text-[16px]">Module not found: {id}</div>
        <Link to="/modules" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-slate-300 hover:bg-[#25354f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to modules
        </Link>
      </div>
    )
  }

  const progress = getProgress(module.id)

  const handleQuizSubmit = () => {
    let score = 0
    quizzes.forEach((_, idx) => {
      if (quizAnswers[`q${idx}`] === quizzes[idx].correct) score++
    })
    completeQuiz(module.id, 'quiz-01', score, quizzes.length)
    setQuizSubmitted(true)
  }

  const handleLabCheck = (labId: string) => {
    if (id === '02-wifi-fundamentals') {
      const bssidCorrect = labAnswers['bssid']?.toUpperCase().includes('AA:BB:CC') || (labAnswers['bssid']?.length || 0) >= 10
      const channelCorrect = labAnswers['channel']?.includes('6')
      if (bssidCorrect && channelCorrect) {
        setLabCompleted({...labCompleted, [labId]: true})
        completeLab(module.id, labId, 100)
      } else {
        alert('Check answers. Hint: BSSID MAC, channel 6')
      }
    } else if (id === '05-wireless-recon') {
      const apCount = labAnswers['apCount']
      const hidden = labAnswers['hidden']?.toLowerCase()
      if (apCount && hidden) {
        setLabCompleted({...labCompleted, [labId]: true})
        completeLab(module.id, labId, 100)
      } else {
        alert('Fill all tasks. Check PcapInspector summary: SSIDs, BSSIDs, hidden reveal.')
      }
    } else {
      setLabCompleted({...labCompleted, [labId]: true})
      completeLab(module.id, labId, 100)
    }
  }

  const phaseColors: Record<number, { bg: string, border: string, text: string, glow: string }> = {
    1: { bg: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-glow-cyan' },
    2: { bg: 'from-violet-500/10 to-violet-600/5', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-glow-violet' },
    3: { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400', glow: '' },
    4: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-glow-emerald' },
    5: { bg: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-500/20', text: 'text-pink-400', glow: '' },
    6: { bg: 'from-slate-500/10 to-slate-600/5', border: 'border-slate-500/20', text: 'text-slate-400', glow: '' },
  }
  const pc = phaseColors[module.phase] || phaseColors[1]

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 overflow-hidden group"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${pc.bg} opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
          <Link to="/modules" className="w-9 h-9 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 backdrop-blur-sm flex items-center justify-center hover:bg-[#1e293b]/80 hover:border-[#334155]/60 transition-all duration-200 group/link shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover/link:text-slate-200 group-hover/link:-translate-x-0.5 transition-all duration-200" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/60 text-slate-500 backdrop-blur-sm">{module.id}</span>
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-medium backdrop-blur-sm tracking-widest ${module.status === 'simulated' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                {module.status === 'simulated' ? '● SIMULATED' : '◐ HARDWARE'}
              </span>
              <span className={`text-[10px] px-2.5 py-1 rounded-full bg-[#020617]/60 border ${pc.border} ${pc.text} font-mono backdrop-blur-sm`}>PHASE {module.phase}</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1e293b]/60 border border-[#334155]/60 text-slate-400 font-mono">{module.difficulty}</span>
            </div>
            <h1 className="font-heading font-bold text-[22px] md:text-[26px] text-slate-100 leading-tight tracking-tight">{module.title}</h1>
            <p className="text-[13px] text-slate-400 mt-2 max-w-[700px] leading-relaxed">{module.description}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Progress</div>
              <div className="text-[28px] font-bold text-slate-100 font-mono leading-none mt-1">{progress}%</div>
              <div className="w-28 h-1.5 bg-[#020617] rounded-full mt-2 border border-[#1e293b]/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
                />
              </div>
            </div>
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155]/60 items-center justify-center">
              <BookOpen className={`w-7 h-7 ${pc.text}`} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm w-fit"
      >
        {[
          { id: 'overview', label: 'Overview', icon: Layers, count: null },
          { id: 'theory', label: 'Theory', icon: BookOpen, count: lessons.length },
          { id: 'lab', label: 'Lab', icon: FlaskConical, count: labs.length },
          { id: 'quiz', label: 'Quiz', icon: Swords, count: quizzes.length },
          { id: 'report', label: 'Report', icon: FileText, count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              activeTab === tab.id 
                ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[10px] px-1.5 py-0 rounded-full font-mono border ${activeTab === tab.id ? 'bg-[#020617] border-[#334155] text-slate-300' : 'bg-[#020617] border-[#1e293b] text-slate-500'}`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-[#1e293b] border border-[#334155] -z-10"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <h3 className="font-heading font-bold text-[16px] text-slate-100 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-cyan-400" />
                      </div>
                      Learning Objectives
                    </h3>
                    <ul className="space-y-2.5">
                      {(id === '02-wifi-fundamentals' ? [
                        'SSID vs BSSID vs ESSID distinction for recon',
                        'AP, client, STA roles and association flow',
                        'Channels, bands, bandwidth misconfigurations'
                      ] : id === '05-wireless-recon' ? [
                        'Enumerate APs via beacons: SSID, BSSID, channel, security, vendor',
                        'Discover clients via probe requests, map PNL leakage',
                        'Hidden SSID detection and reveal via probe response'
                      ] : id === '06-traffic-analysis' ? [
                        'Wireshark display filters for 802.11',
                        'Full association flow: Beacon → Probe → Auth → Assoc → EAPOL',
                        'Analyze traffic, evidence collection, frame numbers'
                      ] : [
                        'Understand module objectives and apply VAPT methodology',
                        'Analyze PCAPs with real-world tools',
                        'Document findings with evidence'
                      ]).map((obj, i) => (
                        <li key={i} className="flex gap-3 text-[13px] text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          </span>
                          <span className="leading-relaxed">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-violet-400" />
                      </div>
                      Attack → Defense → Retest
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-red-500/[0.04] border border-red-500/10 hover:bg-red-500/[0.06] hover:border-red-500/15 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-red-400" />
                          </div>
                          <div className="font-bold text-[11px] tracking-widest text-red-400 uppercase">Attack</div>
                        </div>
                        <div className="text-[12px] text-slate-400 leading-relaxed">{id === '05-wireless-recon' ? 'Map APs, hidden SSID, PNL leak' : id === '06-traffic-analysis' ? 'Observe handshake, association flow' : 'Observe SSID leakage, hidden SSID in probes'}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 hover:bg-emerald-500/[0.06] hover:border-emerald-500/15 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Shield className="w-3 h-3 text-emerald-400" />
                          </div>
                          <div className="font-bold text-[11px] tracking-widest text-emerald-400 uppercase">Defense</div>
                        </div>
                        <div className="text-[12px] text-slate-400 leading-relaxed">{id === '05-wireless-recon' ? 'SSID hiding is not security, focus on WPA2/3' : 'Enable PMF, disable WPS, use WPA3'}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10 hover:bg-cyan-500/[0.06] hover:border-cyan-500/15 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-cyan-400" />
                          </div>
                          <div className="font-bold text-[11px] tracking-widest text-cyan-400 uppercase">Retest</div>
                        </div>
                        <div className="text-[12px] text-slate-400 leading-relaxed">Verify fix, confirm no leak, document evidence</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 hover:border-[#334155]/60 transition-all duration-300">
                  <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                    </div>
                    Lessons
                    <span className="ml-auto text-[11px] font-mono px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500">{lessons.length} lessons</span>
                  </h3>
                  <div className="space-y-2.5">
                    {lessons.map((lesson, idx) => {
                      const completed = isLessonCompleted(module.id, lesson)
                      return (
                        <div key={lesson} className="group flex items-center gap-3 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200 ${completed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-glow-emerald' : 'bg-[#1e293b] text-slate-400 group-hover:bg-[#25354f] group-hover:text-slate-300'}`}>{completed ? '✓' : idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-200 group-hover:text-slate-100 transition-colors truncate">{lesson.replace(/-/g, ' ')}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{lesson}.md</div>
                          </div>
                          {completed && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 hover:border-[#334155]/60 transition-all duration-300">
                  <div className="text-[12px] font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-400" />
                    Module Info
                  </div>
                  <div className="space-y-3 text-[12px]">
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><span className="text-slate-500">Difficulty</span><span className="text-slate-200 font-medium">{module.difficulty}</span></div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><span className="text-slate-500">Est. Time</span><span className="text-slate-200 font-medium font-mono">{module.estimated_hours}h</span></div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><span className="text-slate-500">Lessons</span><span className="text-slate-200 font-medium font-mono">{lessons.length}</span></div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><span className="text-slate-500">Labs</span><span className="text-slate-200 font-medium font-mono">{labs.length}</span></div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40"><span className="text-slate-500">Quiz</span><span className="text-slate-200 font-medium font-mono">{quizzes.length} Qs</span></div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-amber-500/[0.04] to-transparent border border-amber-500/15 p-5 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-amber-400">Simulated Lab</div>
                      <div className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">Uses PCAPs and configs. No hardware needed. Real RF requires ALFA adapter.</div>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('theory')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-[13px] shadow-glow-cyan hover:shadow-glow-violet transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span>Start Learning</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </motion.button>
              </div>
            </div>
          )}

          {/* Theory — Enhanced Readability + Scroll Fix */}
          {activeTab === 'theory' && (
            <>
              <ReadingProgress />
              <div id="theory-content-start" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sticky top-[80px] backdrop-blur-sm">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                      <BookOpen className="w-3 h-3" />
                      Lessons
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] font-mono">{lessons.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {lessons.map((lesson, idx) => {
                        const completed = isLessonCompleted(module.id, lesson)
                        const isActive = activeLesson === idx
                        return (
                          <button 
                            key={lesson} 
                            onClick={() => setActiveLesson(idx)} 
                            className={`group w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 relative overflow-hidden ${isActive ? 'bg-[#1e293b] border border-cyan-500/30 text-slate-100 shadow-soft' : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border border-transparent'}`}
                          >
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-full" />}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-200 ${completed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald' : isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[#020617] text-slate-500 group-hover:bg-[#1e293b] group-hover:text-slate-400'}`}>{completed ? '✓' : idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] font-medium truncate block">{lesson.replace(/-/g, ' ').replace(/^\d+\s/, '')}</span>
                              <span className="text-[10px] font-mono text-slate-500 truncate block">{completed ? 'Completed • +10 XP' : 'Not started'}</span>
                            </div>
                            {completed && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                            {isActive && !completed && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#1e293b]/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-slate-500 font-mono">Progress</div>
                        <div className="text-[11px] text-cyan-400 font-mono font-bold">{lessons.filter(l => isLessonCompleted(module.id, l)).length}/{lessons.length}</div>
                      </div>
                      <div className="w-full h-2 bg-[#020617] rounded-full border border-[#1e293b]/50 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(lessons.filter(l => isLessonCompleted(module.id, l)).length / lessons.length) * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setReadingMode(readingMode === 'focus' ? 'default' : 'focus')} className={`flex-1 px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${readingMode === 'focus' ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-[#020617] border-[#1e293b] text-slate-500 hover:text-slate-300'}`}>
                          <Eye className="w-3.5 h-3.5" /> {readingMode === 'focus' ? 'Focus ON' : 'Focus'}
                        </button>
                        <button onClick={() => setShowToc(!showToc)} className={`flex-1 px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${showToc ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-[#020617] border-[#1e293b] text-slate-500 hover:text-slate-300'}`}>
                          <List className="w-3.5 h-3.5" /> TOC
                        </button>
                      </div>
                    </div>
                  </div>

                  {showToc && toc.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 backdrop-blur-sm">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <List className="w-3 h-3" /> On This Page
                      </div>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                        {toc.map((h, i) => (
                          <a key={i} href={`#${h.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={`block text-[12px] leading-relaxed py-1.5 px-2.5 rounded-lg hover:bg-[#1e293b] hover:text-slate-200 transition-colors ${h.level === 1 ? 'font-semibold text-slate-300' : h.level === 2 ? 'text-slate-400 ml-2 border-l border-[#1e293b] pl-3' : 'text-slate-500 ml-4 text-[11px]'}`}>
                            {h.text}
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className={`transition-all duration-300 ${readingMode === 'focus' ? 'lg:col-span-3 max-w-[800px] mx-auto' : readingMode === 'wide' ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
                  <div ref={theoryContentRef} id="lesson-content-area" className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-8 lg:p-10 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300 ${readingMode === 'focus' ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.5)]' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.015] via-transparent to-transparent pointer-events-none" />
                    <div className="relative">
                      {/* Enhanced Header with Readability Controls */}
                      <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-[#1e293b]/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-[12px] font-mono text-slate-400 flex items-center gap-2">
                                <span>{lessons[activeLesson]}.md</span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="text-emerald-400">+10 XP</span>
                              </div>
                              <div className="mt-1">
                                <LessonReadingProgress content={lessonContent} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[#020617] border border-[#1e293b]">
                              <button onClick={() => setReadingMode('default')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'default' ? 'bg-[#1e293b] text-slate-200 border border-[#334155]' : 'text-slate-500 hover:text-slate-300'}`}><Type className="w-3 h-3 inline mr-1" />Default</button>
                              <button onClick={() => setReadingMode('focus')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'focus' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'text-slate-500 hover:text-slate-300'}`}><Eye className="w-3 h-3 inline mr-1" />Focus</button>
                              <button onClick={() => setReadingMode('wide')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'wide' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}><Maximize2 className="w-3 h-3 inline mr-1" />Wide</button>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => completeLesson(module.id, lessons[activeLesson])}
                              className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all duration-200 flex items-center gap-2 ${isLessonCompleted(module.id, lessons[activeLesson]) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-cyan-500 to-violet-500 border-cyan-500/20 text-white shadow-glow-cyan hover:shadow-glow-violet'}`}
                            >
                              {isLessonCompleted(module.id, lessons[activeLesson]) ? <><CheckCircle className="w-4 h-4" /> Completed • +10 XP</> : <><Award className="w-4 h-4" /> Mark Complete • +10 XP</>}
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Improved Markdown Readability */}
                      <div id="lesson-markdown-content" className={`markdown prose prose-invert max-w-none prose-headings:font-heading prose-headings:tracking-tight ${readingMode === 'focus' ? 'prose-p:text-[15.5px] prose-p:leading-[1.85] prose-p:text-slate-200 prose-li:text-[15px] prose-li:leading-[1.75]' : 'prose-p:text-[14.5px] prose-p:leading-[1.8] prose-p:text-slate-300'} prose-strong:text-slate-100 prose-strong:font-semibold prose-code:text-cyan-300 prose-code:bg-[#020617] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-cyan-500/20 prose-code:text-[13px] prose-pre:bg-[#080d18] prose-pre:border prose-pre:border-[#1e293b] prose-pre:rounded-xl prose-pre:shadow-soft prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300 prose-a:font-medium prose-headings:scroll-mt-24`}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            h1: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h1 id={id} className="group flex items-center gap-3 scroll-mt-24" {...props}>{children} <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-cyan-500/50 hover:text-cyan-400 text-[16px] transition-opacity">#</a></h1>
                            },
                            h2: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h2 id={id} className="group flex items-center gap-3 scroll-mt-24" {...props}>{children} <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-cyan-500/50 hover:text-cyan-400 text-[14px] transition-opacity">#</a></h2>
                            },
                            h3: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h3 id={id} className="scroll-mt-24" {...props}>{children}</h3>
                            },
                          }}
                        >
                          {lessonContent}
                        </ReactMarkdown>
                      </div>

                      {/* Enhanced Navigation with Scroll Fix */}
                      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-3 pt-8 border-t border-[#1e293b]/60">
                        <button 
                          disabled={activeLesson === 0} 
                          onClick={() => {
                            const newLesson = Math.max(0, activeLesson - 1)
                            setActiveLesson(newLesson)
                            // Scroll fix: ensure next module starts at top
                            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
                          }} 
                          className="group px-5 py-3 rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#25354f] hover:text-slate-100 hover:border-[#475569] transition-all duration-200 flex items-center gap-2.5"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          <div className="text-left">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Previous</div>
                            <div className="text-[12px] font-medium">{activeLesson > 0 ? lessons[activeLesson - 1].replace(/-/g, ' ').slice(0, 30) : 'Start'}</div>
                          </div>
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { 
                            completeLesson(module.id, lessons[activeLesson]); 
                            if (activeLesson < lessons.length - 1) {
                              setActiveLesson(activeLesson + 1)
                            } else {
                              setActiveTab('lab')
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                          }}
                          className="group px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white text-[13px] font-semibold shadow-glow-cyan hover:shadow-glow-violet transition-all duration-300 flex items-center gap-3"
                        >
                          <div className="text-left">
                            <div className="text-[10px] font-mono text-white/70 uppercase tracking-wide">{activeLesson < lessons.length - 1 ? 'Next Lesson' : 'Next Section'}</div>
                            <div className="text-[13px] font-semibold">{activeLesson < lessons.length - 1 ? lessons[activeLesson + 1].replace(/-/g, ' ').slice(0, 30) : 'Go to Lab • +25 XP'}</div>
                          </div>
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </motion.button>
                      </div>

                      {/* Consistency: Completion Mark + Points Payoff */}
                      <div className="mt-6 p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${isLessonCompleted(module.id, lessons[activeLesson]) ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-[#1e293b] border-[#334155] text-slate-500'}`}>
                            {isLessonCompleted(module.id, lessons[activeLesson]) ? <CheckCircle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-slate-200">{isLessonCompleted(module.id, lessons[activeLesson]) ? 'Lesson Completed' : 'Mark as complete to earn XP'}</div>
                            <div className="text-[11px] font-mono text-slate-500">{isLessonCompleted(module.id, lessons[activeLesson]) ? '+10 XP earned • Progress saved' : '10 XP • Contributes to level & certification'}</div>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
                          <span className="px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500">{activeLesson + 1}/{lessons.length}</span>
                          <span className="px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{Math.round(((activeLesson + 1)/lessons.length)*100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Lab */}
          {activeTab === 'lab' && (
            <div className="space-y-6">
              {labs.length === 0 && (
                <div className="rounded-2xl bg-[#0f172a]/60 border border-dashed border-[#334155]/60 p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="text-slate-400 font-heading text-[14px]">No labs yet for this module</div>
                  <div className="text-[12px] text-slate-600 mt-1">Coming soon</div>
                </div>
              )}

              {labs.map(lab => (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 space-y-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[16px] text-slate-100 flex items-center gap-2">
                            {lab.title}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">SIMULATED</span>
                          </h3>
                          <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                            <span className="font-mono text-cyan-400">{lab.pcap ? `${lab.pcap}.pcapng` : 'hostapd.conf'}</span>
                            <span className="mx-1.5 text-slate-600">•</span>
                            {lab.type}
                            <span className="mx-1.5 text-slate-600">•</span>
                            {lab.description}
                          </p>
                        </div>
                      </div>
                      {labCompleted[lab.id] && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>

                  {lab.pcap && (
                    <div className="relative space-y-4">
                      <PcapInspector pcapId={lab.pcap} />
                      {(id === '05-wireless-recon' || id === '06-traffic-analysis') && (
                        <ReconMap pcapId={lab.pcap} />
                      )}
                      {(id === '08-wpa-wpa2' || id === '09-wpa2-practical' || id === '11-wpa3') && (
                        <HandshakeDiagram pcapId={lab.pcap} />
                      )}
                    </div>
                  )}

                  {id === '02-wifi-fundamentals' && lab.id === 'lab-02-config' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WIFI (Bad)"
                      config={`# Bad config — LAB-WIFI\ninterface=wlan0\nssid=LAB-WIFI\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=WeakPass123\n# Weaknesses\nwps_state=2\nap_setup_locked=0\nieee80211w=0\nht_capab=[HT40+][HT40-]\n`}
                      issues={[
                        { line: "wps_state=2", severity: "high", message: "WPS enabled — PIN brute-force risk (11k tries), WPS IE in beacon", recommendation: "Disable WPS: wps_state=0" },
                        { line: "ieee80211w=0", severity: "high", message: "PMF disabled — deauth/disassoc spoofing possible, handshake capture via deauth", recommendation: "Enable PMF required: ieee80211w=2" },
                        { line: "ht_capab=[HT40+]", severity: "medium", message: "40MHz in 2.4GHz causes overlap, bad practice", recommendation: "Use 20MHz only in 2.4GHz" },
                        { line: "wpa_passphrase=WeakPass123", severity: "medium", message: "Weak PSK, in wordlists, 11 chars", recommendation: "Strong PSK 20+ chars random" },
                      ]}
                    />
                  )}

                  {id === '07-wep-legacy' && (
                    <ConfigViewer
                      title="hostapd.conf — LEGACY-WIFI (WEP)"
                      config={`# WEP — Critical\ninterface=wlan0\nssid=LEGACY-WIFI\nhw_mode=g\nchannel=6\nwep_default_key=0\nwep_key0=12345\n`}
                      issues={[
                        { line: "wep_key0=12345", severity: "critical", message: "WEP uses 24-bit IV + RC4 weak scheduling, key recovery in minutes (PTW 40k frames), no replay protection, CRC32 ICV", recommendation: "Migrate to WPA3 or WPA2-PSK CCMP, PMF required, strong PSK" },
                      ]}
                    />
                  )}

                  {id === '10-wps' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPS (WPS Enabled)"
                      config={`# WPS enabled — weak\ninterface=wlan0\nssid=LAB-WPS\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=StrongPass123\nwps_state=2\nap_setup_locked=0\neap_server=1\nwps_pin=12345670\n`}
                      issues={[
                        { line: "wps_state=2", severity: "high", message: "WPS PIN 8-digit with flaw: 10^4 + 10^3 = 11k max, not 10^8. Beacon has WPS IE (221 OUI 00:50:F2:04)", recommendation: "Disable WPS: wps_state=0, no PBC via UPnP" },
                        { line: "wps_pin=12345670", severity: "medium", message: "Default PIN or weak PIN, checksum reduces entropy", recommendation: "Disable WPS, use strong PSK" },
                      ]}
                    />
                  )}

                  {id === '11-wpa3' && lab.id === 'lab-11-transition' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPA3-TRANS (Bad Transition)"
                      config={`# Bad transition\ninterface=wlan0\nssid=LAB-WPA3-TRANS\nhw_mode=a\nchannel=36\nwpa=2\nwpa_key_mgmt=WPA-PSK SAE\nrsn_pairwise=CCMP\nwpa_passphrase=WeakPass123\nsae_password=WeakPass123\nieee80211w=0\n`}
                      issues={[
                        { line: "wpa_key_mgmt=WPA-PSK SAE", severity: "medium", message: "Transition mode: same password for WPA2 and WPA3, downgrade risk", recommendation: "Prefer WPA3-only with SAE, PMF required" },
                        { line: "ieee80211w=0", severity: "high", message: "PMF disabled — defeats WPA3 benefit, allows deauth, downgrade to WPA2 handshake capture", recommendation: "PMF required: ieee80211w=2 for WPA3-only, at least 1 for transition" },
                        { line: "WeakPass123", severity: "medium", message: "Weak PSK same for both, if WPA2 handshake captured and weak, WPA3 also compromised", recommendation: "Strong PSK 20+ chars random, not in wordlists" },
                      ]}
                    />
                  )}

                  {id === '11-wpa3' && lab.id === 'lab-11-wpa3-only' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPA3 (Good)"
                      config={`# Good WPA3-only\ninterface=wlan0\nssid=LAB-WPA3\nhw_mode=a\nchannel=36\nwpa=2\nwpa_key_mgmt=SAE\nrsn_pairwise=CCMP\nsae_password=StrongRandomPassphrase123!@#With20+Chars\nieee80211w=2\n`}
                      issues={[]}
                    />
                  )}

                  {id === '12-deauth-disassoc' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-DEAUTH (PMF Disabled vs Required)"
                      config={`# Bad — PMF disabled, deauth possible\ninterface=wlan0\nssid=LAB-DEAUTH\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=StrongPass123\nieee80211w=0\n\n# Good — PMF required\n# ieee80211w=2\n`}
                      issues={[
                        { line: "ieee80211w=0", severity: "high", message: "PMF disabled — management frames unauthenticated, deauth/disassoc spoofing possible, DoS, handshake capture", recommendation: "Enable PMF required: ieee80211w=2, WPA3-only mandates PMF" },
                      ]}
                    />
                  )}

                  {id === '13-rogue-ap' && (
                    <ConfigViewer
                      title="Authorized AP List vs Rogue"
                      config={`# Authorized APs (WIDS)\n# Corp-WLAN legit: AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco\n# Observed rogue: 11:22:33:44:55:66 Ch11 WPA2-PSK same SSID Corp-WLAN different BSSID channel not in authorized list\n# Client 12:34:56:78:9A:BC associated to rogue frame 6-7\n\n# Rogue hostapd.conf (attacker)\ninterface=wlan0\nssid=Corp-WLAN\nbssid=11:22:33:44:55:66\nhw_mode=g\nchannel=11\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=WeakPass123  # If PSK known/cracked\n`}
                      issues={[
                        { line: "Rogue BSSID 11:22:33:44:55:66", severity: "high", message: "Same SSID Corp-WLAN different BSSID different channel not in authorized list, client assoc to rogue", recommendation: "WIDS authorized AP list, detect rogue, 802.1X cert validation, PMF required, strong PSK, WPA3" },
                      ]}
                    />
                  )}

                  {id === '14-captive-portals' && (
                    <ConfigViewer
                      title="hostapd.conf — Guest-WLAN (Open + Portal)"
                      config={`# Open with captive portal — weak\ninterface=wlan0\nssid=Guest-WLAN\nhw_mode=g\nchannel=6\nwpa=0\n# Weaknesses\nap_isolate=0\n# Portal: https://portal.guest.com/login but login POST over HTTP\n# Session: MAC-based firewall allows MAC after auth, no timeout\n\n# Good\n# ap_isolate=1\n# Portal HTTPS, MAC+cookie+timeout, OWE or WPA2-PSK for guest\n`}
                      issues={[
                        { line: "wpa=0", severity: "medium", message: "Open network, no encryption, traffic sniffable (unless HTTPS), no 4-way handshake", recommendation: "Use WPA3 OWE for open with encryption or WPA2-PSK for guest with portal" },
                        { line: "ap_isolate=0", severity: "medium", message: "Client isolation disabled, clients can ARP spoof, sniff, attack each other on same open network", recommendation: "Enable client isolation: ap_isolate=1" },
                        { line: "MAC-based session", severity: "medium", message: "Portal uses MAC-based session, open no encryption, attacker can sniff authenticated client MAC and spoof to bypass portal", recommendation: "Use MAC+cookie+IP+token, timeout, re-auth, HTTPS, isolation" },
                      ]}
                    />
                  )}

                  {id === '15-enterprise-fundamentals' && (
                    <ConfigViewer
                      title="hostapd.conf — Corp-Enterprise (WPA2-EAP) + wpa_supplicant.conf bad"
                      config={`# hostapd.conf Enterprise\ninterface=wlan0\nssid=Corp-Enterprise\nhw_mode=g\nchannel=6\nieee8021x=1\nwpa=2\nwpa_key_mgmt=WPA-EAP\nrsn_pairwise=CCMP\nauth_server_addr=192.168.1.10\nauth_server_port=1812\nauth_server_shared_secret=testing123\n\n# wpa_supplicant.conf BAD — no ca_cert\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  password="StrongPass123"\n  phase2="auth=MSCHAPV2"\n  # NO ca_cert!\n}\n\n# GOOD\n# ca_cert="/etc/certs/ca.pem"\n# subject_match="CN=radius.corp.com"\n# altsubject_match="DNS:radius.corp.com"\n`}
                      issues={[
                        { line: "auth_server_shared_secret=testing123", severity: "medium", message: "RADIUS secret weak default testing123, should be 22+ chars random", recommendation: "Strong secret 22+ chars random per NAS, RadSec TLS" },
                        { line: "NO ca_cert", severity: "high", message: "PEAP without ca_cert, client accepts any cert, Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline crack hashcat -m 5500", recommendation: "Enforce ca_cert + subject_match via MDM/GPO, prefer EAP-TLS mutual cert, strong secret, PMF required, WIDS" },
                      ]}
                    />
                  )}

                  {id === '16-eap' && (
                    <ConfigViewer
                      title="wpa_supplicant.conf — PEAP vs EAP-TLS"
                      config={`# BAD PEAP without validation\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  password="StrongPass123"\n  phase2="auth=MSCHAPV2"\n  # NO ca_cert\n}\n\n# GOOD PEAP with validation\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  ca_cert="/etc/certs/ca.pem"\n  subject_match="CN=radius.corp.com"\n  altsubject_match="DNS:radius.corp.com"\n  phase2="auth=MSCHAPV2"\n}\n\n# GOOD EAP-TLS mutual\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=TLS\n  identity="user@corp.com"\n  ca_cert="/etc/certs/ca.pem"\n  client_cert="/etc/certs/client.pem"\n  private_key="/etc/certs/client.key"\n  private_key_passwd="..."\n  subject_match="CN=radius.corp.com"\n}\n`}
                      issues={[
                        { line: "NO ca_cert", severity: "high", message: "PEAP without ca_cert allows rogue RADIUS to capture MSCHAPv2 challenge/response, offline crack", recommendation: "ca_cert + subject_match, EAP-TLS mutual cert, strong RADIUS secret, PMF, WIDS" },
                      ]}
                    />
                  )}

                  {id === '17-radius' && (
                    <ConfigViewer
                      title="FreeRADIUS clients.conf + users + eap.conf"
                      config={`# clients.conf BAD\nclient AP1 {\n  ipaddr = 192.168.1.1\n  secret = testing123\n  shortname = AP1\n}\nclient all {\n  ipaddr = 0.0.0.0/0\n  secret = testing123\n}\n\n# GOOD\n# client AP1 {\n#   ipaddr = 192.168.1.1\n#   secret = StrongRandomSecret123!@#With22+Chars\n# }\n\n# users\nuser1 Cleartext-Password := "WeakPass"\n  Tunnel-Type = VLAN,\n  Tunnel-Medium-Type = IEEE-802,\n  Tunnel-Private-Group-Id = 100\n\n# eap.conf — certs\n# ca_cert, server_cert, private_key\n`}
                      issues={[
                        { line: "secret = testing123", severity: "medium", message: "RADIUS secret weak default, should be 22+ chars random, per NAS unique", recommendation: "Strong secret 22+ chars random per NAS, RadSec TLS, isolated management VLAN" },
                        { line: "ipaddr = 0.0.0.0/0", severity: "medium", message: "clients.conf allows any IP as NAS with weak secret, should restrict to AP IPs", recommendation: "Restrict to AP IPs, not 0.0.0.0/0" },
                        { line: "Cleartext-Password := \"WeakPass\"", severity: "medium", message: "User password weak, no complexity, no lockout", recommendation: "Strong passwords, complexity, lockout, 2FA, EAP-TLS, monitoring" },
                      ]}
                    />
                  )}

                  {id === '18-corporate-attacks' && (
                    <ConfigViewer
                      title="Corporate Wi-Fi — 3 SSIDs + VLAN ACL + WIDS"
                      config={`# hostapd.conf 3 SSIDs\n# Corp-Enterprise WPA2-EAP Ch6 AA:BB:CC:DD:EE:FF VLAN 100\n# Corp-Guest Open Ch11 BB:CC:DD:EE:FF:00 VLAN 200 ap_isolate=0 weak\n# IoT-PSK WPA2-PSK Ch1 CC:DD:EE:FF:00:11 WPS enabled weak PSK WeakPass123\n\n# VLAN ACL BAD — allows Corp→Guest\n# iptables -A FORWARD -s 192.168.100.0/24 -d 192.168.200.0/24 -j ACCEPT\n# Should be DROP\n\n# WIDS authorized list missing rogue 11:22:33:44:55:66\n# Authorized: AA:BB:CC:DD:EE:FF Ch6, BB:CC:DD:EE:FF:00 Ch11, CC:DD:EE:FF:00:11 Ch1\n# Observed rogue: 11:22:33:44:55:66 Ch11 clones Corp-Enterprise\n\n# wpa_supplicant.conf no ca_cert\n# RADIUS secret testing123\n`}
                      issues={[
                        { line: "iptables ACCEPT Corp→Guest", severity: "high", message: "VLAN ACL misconfigured allows Corp VLAN 100 to ping Guest VLAN 200, should be isolated", recommendation: "VLAN ACL deny inter-VLAN, private VLANs, firewall rules, deny Corp→Guest and Guest→Corp" },
                        { line: "ap_isolate=0", severity: "medium", message: "Guest isolation disabled, clients can ARP spoof", recommendation: "ap_isolate=1 for Guest" },
                        { line: "Rogue 11:22:33:44:55:66", severity: "high", message: "Rogue AP clones Corp-Enterprise Ch11 not in authorized list, client assoc to rogue, credential capture", recommendation: "WIDS authorized list + alert + contain, 802.1X cert validation, EAP-TLS, strong secret, PMF, VLAN ACL deny, monitoring" },
                        { line: "wps_state=2", severity: "high", message: "WPS enabled on IoT", recommendation: "wps_state=0" },
                        { line: "WeakPass123", severity: "high", message: "Weak PSK in wordlist", recommendation: "Strong PSK 20+ random" },
                      ]}
                    />
                  )}

                  {id === '19-methodology' && (
                    <ConfigViewer
                      title="Methodology — Full Assessment Prep"
                      config={`# Scope: 6 APs +1 rogue, 5 clients, 1 hidden HIDDEN-LAB, WPS, weak PSK, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, rogue, segmentation\n# Methodology: Scope ROE → Recon passive → Enum per SSID → Vuln Analysis → Exploitation simulated → Post-Exploitation → Reporting → Retest\n# Evidence: PCAPs with frame numbers, config hashes, logs, screenshots, commands reproducible\n# Findings: WPS High 11k, WPA2 weak High, PEAP no cert High, RADIUS weak Medium, open no isolation Medium, captive MAC bypass Medium, rogue High, segmentation High\n# Overall risk High, quick wins vs long-term\n# Report: Executive summary, scope, methodology, findings, risk summary, recommendation summary, retest, references, appendices\n`}
                      issues={[
                        { line: "6 APs +1 rogue", severity: "high", message: "Multiple High findings, credential capture, network access, segmentation bypass", recommendation: "Quick wins: disable WPS, strong PSK 20+, PMF required, ca_cert+subject_match, strong RADIUS secret 22+, ap_isolate=1, VLAN ACL deny; Long-term: WPA3-only, EAP-TLS, RadSec, WIDS, monitoring, training, audits" },
                      ]}
                    />
                  )}

                  {id === '20-final-assessment' && (
                    <ConfigViewer
                      title="Final Assessment — All Issues Combined"
                      config={`# Final scope: Corp-Enterprise WPA2-EAP Ch6 AA:BB:CC:DD:EE:FF PEAP without ca_cert RADIUS testing123 weak PMF capable, Corp-Guest Open Ch11 BB:CC:DD:EE:FF:00 ap_isolate=0 captive portal HTTP POST weak MAC bypass, IoT-PSK Ch1 CC:DD:EE:FF:00:11 weak PSK WeakPass123 WPS enabled PMF disabled, HIDDEN-LAB Ch6 DD:EE:FF:00:11:22 hidden WPS PMF disabled, LAB-WPA3-TRANS Ch36 EE:FF:00:11:22:33 PSK+SAE same WeakPass123 PMF optional downgrade, LAB-WPS Ch6 FF:00:11:22:33:44 WPS 11k, rogue 11:22:33:44:55:66 clones Enterprise Ch11, VLAN 100 Corp 200 Guest 300 IoT ACL allows Corp→Guest, clients 5 with PNL leak\n# Flag: WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}\n`}
                      issues={[
                        { line: "WPS enabled 3 SSIDs", severity: "high", message: "WPS 11k PIN flaw on IoT, HIDDEN-LAB, LAB-WPS", recommendation: "wps_state=0" },
                        { line: "WeakPass123", severity: "high", message: "Weak PSK on IoT and TRANS, same for WPA2 and WPA3, in wordlist", recommendation: "Strong PSK 20+ random unique per SSID, WPA3-only" },
                        { line: "PEAP without ca_cert", severity: "high", message: "Enterprise client without cert validation, rogue RADIUS captures MSCHAPv2", recommendation: "ca_cert+subject_match via MDM, EAP-TLS, strong secret, RadSec, PMF, WIDS" },
                        { line: "RADIUS testing123", severity: "medium", message: "Weak secret", recommendation: "Strong 22+ chars, RadSec" },
                        { line: "Open Guest ap_isolate=0", severity: "medium", message: "No isolation, client attack, captive MAC bypass HTTP", recommendation: "ap_isolate=1, HTTPS portal, MAC+cookie+timeout, OWE" },
                        { line: "Rogue 11:22:33:44:55:66", severity: "high", message: "Rogue clones Enterprise not in authorized list", recommendation: "WIDS authorized list + alert + contain" },
                        { line: "VLAN ACL Corp→Guest", severity: "high", message: "Segmentation bypass Corp VLAN 100 to Guest 200", recommendation: "VLAN ACL deny inter-VLAN, private VLANs, firewall" },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-[#1e293b]/60">
                    <div className="space-y-4">
                      <div className="text-[13px] font-bold text-slate-200 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        Tasks
                      </div>

                      {id === '02-wifi-fundamentals' && lab.id === 'lab-02-beacon' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. BSSID? (MAC)</label><input value={labAnswers['bssid'] || ''} onChange={e => setLabAnswers({...labAnswers, bssid: e.target.value})} placeholder="AA:BB:CC:DD:EE:FF" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/30 focus:bg-[#0a1020] focus:outline-none hover:border-[#334155]/60 transition-all duration-200" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Channel?</label><input value={labAnswers['channel'] || ''} onChange={e => setLabAnswers({...labAnswers, channel: e.target.value})} placeholder="6" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. Security?</label><input value={labAnswers['security'] || ''} onChange={e => setLabAnswers({...labAnswers, security: e.target.value})} placeholder="Open" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. Probe leak?</label><input value={labAnswers['leak'] || ''} onChange={e => setLabAnswers({...labAnswers, leak: e.target.value})} placeholder="PNL / Preferred networks" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {id === '05-wireless-recon' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. How many APs in total?</label><input value={labAnswers['apCount'] || ''} onChange={e => setLabAnswers({...labAnswers, apCount: e.target.value})} placeholder="e.g., 5" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Which SSID is hidden? How revealed?</label><input value={labAnswers['hidden'] || ''} onChange={e => setLabAnswers({...labAnswers, hidden: e.target.value})} placeholder="HIDDEN-LAB revealed via probe response" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. List clients and their PNL</label><input value={labAnswers['clients'] || ''} onChange={e => setLabAnswers({...labAnswers, clients: e.target.value})} placeholder="12:34:56:78:9A:BC → LAB-WIFI, HomeWiFi, Corp-WLAN" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. Which BSSIDs share same ESS?</label><input value={labAnswers['ess'] || ''} onChange={e => setLabAnswers({...labAnswers, ess: e.target.value})} placeholder="00:11:22:33:44:55 and 00:11:22:33:44:56 = LAB-WIFI ESS" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {id === '06-traffic-analysis' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. How many beacons? Security?</label><input value={labAnswers['beacons'] || ''} onChange={e => setLabAnswers({...labAnswers, beacons: e.target.value})} placeholder="2 beacons, WPA2-PSK" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Full association flow (frame numbers)</label><input value={labAnswers['flow'] || ''} onChange={e => setLabAnswers({...labAnswers, flow: e.target.value})} placeholder="1:Beacon, 3:ProbeReq, 5-6:Auth, 7-8:Assoc, 9-12:EAPOL" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. EAPOL count? Complete handshake?</label><input value={labAnswers['eapol'] || ''} onChange={e => setLabAnswers({...labAnswers, eapol: e.target.value})} placeholder="4 EAPOL, complete handshake" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. BSSID, Client, Channel</label><input value={labAnswers['bssid2'] || ''} onChange={e => setLabAnswers({...labAnswers, bssid2: e.target.value})} placeholder="AA:BB:CC:DD:EE:FF, 11:22:33:44:55:66, Ch6" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {!['02-wifi-fundamentals','05-wireless-recon','06-traffic-analysis'].includes(id||'') && (
                        <div className="rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 p-4">
                          <div className="text-[12px] text-slate-400 leading-relaxed">
                            Analyze the artifacts above. Extract key evidence: BSSIDs, channels, security, frame numbers, vulnerabilities.
                            Document your findings with specific evidence for reporting practice.
                          </div>
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleLabCheck(lab.id)}
                        disabled={!!labCompleted[lab.id]}
                        className={`w-full py-3 rounded-xl font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 ${
                          labCompleted[lab.id] 
                            ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow-glow-emerald' 
                            : 'bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-glow-cyan hover:shadow-glow-violet'
                        }`}
                      >
                        {labCompleted[lab.id] ? <><CheckCircle className="w-4 h-4" /> Lab Completed</> : <><Target className="w-4 h-4" /> Validate & Complete Lab</>}
                      </motion.button>
                    </div>

                    <div className="space-y-4">
                      <div className="text-[12px] font-bold text-slate-300 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        VAPT Context & Evidence
                      </div>
                      <div className="rounded-xl bg-amber-500/[0.03] border border-amber-500/10 p-4 text-[11px] text-slate-400 leading-relaxed backdrop-blur-sm">
                        {id === '05-wireless-recon' && "Recon: Map APs, clients, hidden SSIDs, PNL. Evidence: BSSIDs, channels, security, clients PNL. Report: '5 APs, 2 in ESS LAB-WIFI, 1 hidden HIDDEN-LAB revealed via probe response f10, 2 clients PNL leak.'"}
                        {id === '06-traffic-analysis' && "Traffic analysis: Beacon f1 → Probe f3 → Auth f5-6 → Assoc f7-8 → EAPOL f9-12 complete. Evidence: frame numbers."}
                        {id === '02-wifi-fundamentals' && "Beacons first. Enumerate SSID, BSSID, channel, security. Probe PNL leak useful for Evil Twin."}
                        {!['02-wifi-fundamentals','05-wireless-recon','06-traffic-analysis'].includes(id||'') && "Analyze PCAPs, configs, extract evidence with frame numbers and specific vulnerabilities. Document impact, recommendation, retest."}
                      </div>
                      <div className="rounded-xl bg-[#020617] border border-[#1e293b] p-4 font-mono text-[11px] text-slate-500 backdrop-blur-sm">
                        <div className="text-slate-400 mb-2 flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                            <span className="text-[8px]">$</span>
                          </div>
                          tshark commands
                        </div>
                        {lab.pcap ? (
                          <>
                            <div className="text-cyan-400/80">tshark -r {lab.pcap}.pcapng -Y "wlan.fc.type_subtype==8"</div>
                            <div className="text-violet-400/80 mt-1">tshark -r {lab.pcap}.pcapng -Y "eapol"</div>
                          </>
                        ) : (
                          <div>cat hostapd.conf — audit WPS, PMF, ciphers</div>
                        )}
                      </div>
                      {labCompleted[lab.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 p-4 text-[11px] text-emerald-400 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Lab evidence collected. Skill unlocked. Proceed to quiz or next.
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {(id === '09-wpa2-practical' || id === '10-wps' || id === '11-wpa3' || id === '07-wep-legacy' || id === '12-deauth-disassoc' || id === '13-rogue-ap' || id === '14-captive-portals' || id === '15-enterprise-fundamentals' || id === '16-eap' || id === '17-radius' || id === '18-corporate-attacks' || id === '19-methodology' || id === '20-final-assessment') && (
                    <div className="pt-2">
                      <AttackDefenseRetest
                        attack={{
                          title: id === '07-wep-legacy' ? 'WEP Key Recovery (PTW 40k frames)' : id === '10-wps' ? 'WPS PIN Brute-Force 11k' : id === '11-wpa3' ? 'Transition Downgrade + Deauth' : id === '12-deauth-disassoc' ? 'Deauth Flood DoS + Handshake Capture' : id === '13-rogue-ap' ? 'Rogue AP Evil Twin Corp-WLAN' : id === '14-captive-portals' ? 'Captive Portal Bypass via MAC Spoof + HTTP Sniff' : id === '15-enterprise-fundamentals' ? 'Enterprise PEAP Without Cert Validation — Rogue RADIUS' : id === '16-eap' ? 'EAP PEAP-MSCHAPv2 Credential Capture' : id === '17-radius' ? 'RADIUS Weak Secret + No RadSec' : id === '18-corporate-attacks' ? 'Corporate Rogue + Segmentation + Isolation Bypass' : id === '19-methodology' || id === '20-final-assessment' ? 'Final Assessment — All Issues Combined' : 'Handshake Capture + Offline Audit',
                          description: id === '07-wep-legacy' ? 'IV reuse + RC4 weak, collect 40k frames, recover key in seconds' : id === '10-wps' ? 'WPS IE present, PIN halves flaw, 11k tries max, no rate limiting' : id === '11-wpa3' ? 'Transition PSK+SAE PMF optional, force WPA2 via deauth, capture handshake' : id === '12-deauth-disassoc' ? '12 deauth frames reason 7 AP→client + 2 client→AP + disassoc, PMF disabled, unauthenticated, DoS + force reconnect to capture handshake' : id === '13-rogue-ap' ? 'Rogue BSSID 11:22:33:44:55:66 clones SSID Corp-WLAN Ch11 vs legit AA:BB:CC:DD:EE:FF Ch6, client 12:34:56:78:9A:BC assoc to rogue f6-7, Evil Twin if PSK known' : id === '14-captive-portals' ? 'Open SSID Guest-WLAN, HTTP GET example.com → 302 redirect portal.guest.com/login, POST login over HTTP, MAC-based session, sniff MAC spoof bypass' : id === '15-enterprise-fundamentals' ? 'Corp-Enterprise WPA2-EAP, PEAP without ca_cert, rogue BSSID 11:22:33:44:55:66 clones Enterprise, client assoc to rogue, MSCHAPv2 challenge/response captured, hashcat -m 5500, RADIUS secret testing123 weak' : id === '16-eap' ? 'PEAP-MSCHAPv2, user@corp.com, TLS tunnel without cert validation, rogue RADIUS captures challenge/response, offline crack' : id === '17-radius' ? 'RADIUS secret testing123 weak, clients.conf 0.0.0.0/0, users weak password, no RadSec, no monitoring, VLAN 100' : id === '18-corporate-attacks' ? '3 SSIDs Enterprise/Guest/IoT + rogue 11:22:33:44:55:66 clones Enterprise Ch11, deauth, client assoc to rogue, MSCHAPv2 captured, Guest ap_isolate=0 ARP spoof, Corp VLAN 100→Guest 200 ping success ACL misconfigured' : id === '19-methodology' || id === '20-final-assessment' ? '6 APs +1 rogue, 5 clients, 1 hidden HIDDEN-LAB, WPS 3 SSIDs 11k, weak PSK WeakPass123 IoT and TRANS, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, captive MAC bypass, rogue, segmentation bypass Corp→Guest' : 'WPA2 handshake captured, PMKID present, weak PSK in wordlist',
                          evidence: lab.pcap ? `PCAP: ${lab.pcap}.pcapng` : 'Config: hostapd.conf',
                          impact: 'Credential capture, network access, lateral movement',
                        }}
                        defense={{
                          title: 'Defense & Hardening',
                          description: 'Layered defense: disable WPS, strong PSK, PMF required, cert validation, EAP-TLS, strong RADIUS secret, RadSec, VLAN ACL deny, isolation, WIDS, monitoring',
                          config: 'ieee80211w=2\nwps_state=0\n# Strong PSK 20+\n# ca_cert + subject_match\n# Strong RADIUS secret 22+',
                        }}
                        retest={{
                          title: 'Verify Fix',
                          description: 'Retest with new PCAPs, configs, verify beacon, handshake audit fails, rogue detection, VLAN ACL deny',
                          verification: 'Reproducible evidence: PCAP hash, frame numbers, config hash',
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="max-w-[700px] mx-auto space-y-5">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Swords className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-[16px] text-slate-100">Knowledge Check</h3>
                      <p className="text-[12px] text-slate-500">{quizzes.length} questions • 80% to pass • {module.title}</p>
                    </div>
                  </div>
                  {quizSubmitted && (
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 uppercase tracking-widest">Score</div>
                      <div className="text-[20px] font-bold text-slate-100 font-mono">{quizzes.filter((_, i) => quizAnswers[`q${i}`] === quizzes[i].correct).length} / {quizzes.length}</div>
                    </div>
                  )}
                </div>
              </div>

              {quizzes.map((q, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 hover:border-[#334155]/60 transition-all duration-300"
                >
                  <div className="text-[13px] font-semibold text-slate-100 mb-4 flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[11px] font-mono shrink-0">{idx + 1}</span>
                    <span className="leading-relaxed">{q.question}</span>
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt: string, optIdx: number) => (
                      <label key={optIdx} className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${quizAnswers[`q${idx}`] === optIdx ? 'bg-[#1e293b] border-cyan-500/30 text-slate-100 shadow-soft' : 'bg-[#020617]/60 border-[#1e293b]/60 text-slate-400 hover:border-[#334155]/60 hover:text-slate-200 hover:bg-[#020617]/80'}`}>
                        <input type="radio" name={`q${idx}`} checked={quizAnswers[`q${idx}`] === optIdx} onChange={() => setQuizAnswers({...quizAnswers, [`q${idx}`]: optIdx})} className="accent-cyan-400" />
                        <span className="text-[13px] leading-relaxed">{opt}</span>
                      </label>
                    ))}
                  </div>
                  {quizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-3 rounded-xl text-[11px] border backdrop-blur-sm ${quizAnswers[`q${idx}`] === q.correct ? 'bg-emerald-500/[0.04] border-emerald-500/15 text-emerald-400' : 'bg-red-500/[0.04] border-red-500/15 text-red-400'}`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {quizAnswers[`q${idx}`] === q.correct ? <><CheckCircle className="w-4 h-4" /> Correct</> : <>✗ Wrong — Correct: {q.options[q.correct]}</>}
                      </div>
                      <div className="mt-1.5 text-[11px] opacity-80 leading-relaxed">{q.explanation}</div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleQuizSubmit}
                disabled={quizSubmitted}
                className={`w-full py-4 rounded-xl font-bold text-[14px] transition-all duration-300 flex items-center justify-center gap-2 ${
                  quizSubmitted 
                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow-glow-emerald' 
                    : 'bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-glow-cyan hover:shadow-glow-violet'
                }`}
              >
                {quizSubmitted ? (
                  <>
                    <Award className="w-5 h-5" />
                    Score: {quizzes.filter((_, i) => quizAnswers[`q${i}`] === quizzes[i].correct).length} / {quizzes.length}
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    Submit Quiz
                  </>
                )}
              </motion.button>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="max-w-[800px] mx-auto space-y-5">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
                <div className="relative">
                  <h3 className="font-heading font-bold text-[16px] text-slate-100 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-violet-400" />
                    </div>
                    Reporting Exercise
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Title</label>
                      <div className="p-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-300">{id === '05-wireless-recon' ? 'Wireless Recon: 5 APs, Hidden SSID, PNL Leakage' : id === '06-traffic-analysis' ? 'Traffic Analysis: Complete Association Flow' : 'Insecure Wi-Fi Configuration'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Severity</label>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[13px] text-amber-400 font-medium">Medium</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evidence</label>
                    <div className="p-4 rounded-xl bg-[#020617] border border-[#1e293b] font-mono text-[11px] text-slate-400 leading-relaxed">
                      {id === '05-wireless-recon' ? 'PCAP: recon-lab.pcapng — 5 APs, HIDDEN-LAB revealed in frame 10 probe response, 2 clients, PNL leak' : 'PCAP with frame numbers, BSSID, channel, security'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[#1e293b]/60">
        <Link to="/modules" className="inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[#0f172a]/60 border border-transparent hover:border-[#1e293b]/60">
          <ArrowLeft className="w-4 h-4" />
          All Modules
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono px-3 py-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <Radio className="w-3 h-3" />
          Module {module.id} • {progress}% • {module.status}
        </div>
      </div>
    </div>
  )
}
