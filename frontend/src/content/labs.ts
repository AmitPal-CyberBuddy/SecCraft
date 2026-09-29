/**
 * Lab catalogue — the labs this build actually ships.
 *
 * `pcap` points at a capture in frontend/public/pcaps (validated by scripts/verify-lab-artifacts.py);
 * `null` means the lab works on configuration files / written artefacts instead of a capture.
 * Keep this list in sync with modules.json `artifacts` when a lab is added or removed: it is the
 * denominator used for lab progress in the UI (see content/stats.ts).
 */

export interface LabEntry {
  learningPathId: string
  id: string
  module: string
  title: string
  type: string
  status: string
  difficulty: string
  pcap: string | null
  color: string
  /** One-line statement of what the lab asks you to prove from the artefact. */
  description: string
}

export const LABS: LabEntry[] = [
    { learningPathId: 'wireless-pentesting', id: 'lab-02-beacon', module: '02-wifi-fundamentals', title: 'Beacon Frame Analysis', type: 'PCAP Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'beacon-only', color: 'cyan', description: 'Extract SSID, BSSID, channel, security from beacon-only.pcapng' },
    { learningPathId: 'wireless-pentesting', id: 'lab-02-config', module: '02-wifi-fundamentals', title: 'Config Audit — WPS & PMF', type: 'Config Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: null, color: 'cyan', description: 'Identify WPS, PMF, channel width issues' },
    { learningPathId: 'wireless-pentesting', id: 'lab-05-recon', module: '05-wireless-recon', title: 'Wireless Recon — Hidden SSID & PNL', type: 'Recon Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'recon-lab', color: 'violet', description: 'Map 5 APs, hidden SSID, clients, PNL leakage from recon-lab.pcapng' },
    { learningPathId: 'wireless-pentesting', id: 'lab-06-traffic', module: '06-traffic-analysis', title: 'Traffic Analysis — Association Flow', type: 'Traffic Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'traffic-analysis', color: 'violet', description: 'Full flow: Beacon → Probe → Auth → Assoc → EAPOL handshake' },
    { learningPathId: 'wireless-pentesting', id: 'lab-09-handshake', module: '09-wpa2-practical', title: 'WPA2 Handshake Identification', type: 'Handshake Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wpa2-handshake', color: 'amber', description: 'Identify M1-M4, ANonce, SNonce, MIC, completeness' },
    { learningPathId: 'wireless-pentesting', id: 'lab-09-pmkid', module: '09-wpa2-practical', title: 'PMKID Extraction — Clientless', type: 'PMKID Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'pmkid', color: 'amber', description: 'Extract PMKID from EAPOL M1 key data' },
    { learningPathId: 'wireless-pentesting', id: 'lab-10-wps', module: '10-wps', title: 'WPS Enumeration — 11k PIN Flaw', type: 'WPS Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wps-beacon', color: 'amber', description: 'Detect WPS IE in beacon and probe response, BSSID, SSID, channel' },
    { learningPathId: 'wireless-pentesting', id: 'lab-11-transition', module: '11-wpa3', title: 'WPA3 Transition — Downgrade Risk', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'wpa3-transition', color: 'amber', description: 'Identify transition mode: AKMs PSK+SAE, PMF optional, downgrade risk' },
    { learningPathId: 'wireless-pentesting', id: 'lab-11-wpa3-only', module: '11-wpa3', title: 'WPA3-Only Good Config', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'wpa3-only', color: 'emerald', description: 'Verify WPA3-only with PMF required — good config' },
    { learningPathId: 'wireless-pentesting', id: 'lab-12-deauth', module: '12-deauth-disassoc', title: 'Deauth Flood — PMF Disabled', type: 'Deauth Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'deauth', color: 'red', description: 'Count deauth frames, reason codes, check PMF disabled, DoS impact' },
    { learningPathId: 'wireless-pentesting', id: 'lab-13-rogue', module: '13-rogue-ap', title: 'Rogue AP — Evil Twin Detection', type: 'Rogue Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'rogue-ap', color: 'red', description: 'Detect rogue BSSID cloning Corp-WLAN, legit vs rogue, client association to rogue' },
    { learningPathId: 'wireless-pentesting', id: 'lab-14-captive', module: '14-captive-portals', title: 'Captive Portal — Bypass & Isolation', type: 'Captive Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'captive-portal', color: 'amber', description: 'Open network, HTTP redirect to portal, login over HTTP, MAC spoof bypass, isolation' },
    { learningPathId: 'wireless-pentesting', id: 'lab-15-enterprise', module: '15-enterprise-fundamentals', title: 'Enterprise Recon & Config Audit', type: 'Enterprise Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'enterprise', color: 'pink', description: 'WPA2-EAP, 802.1X roles, supplicant/authenticator/RADIUS, PEAP without ca_cert risk' },
    { learningPathId: 'wireless-pentesting', id: 'lab-16-eap', module: '16-eap', title: 'EAP PEAP-MSCHAPv2 Analysis', type: 'EAP Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'eap', color: 'pink', description: 'PEAP TLS tunnel, MSCHAPv2 challenge/response, cert validation missing, hashcat -m 5500' },
    { learningPathId: 'wireless-pentesting', id: 'lab-17-radius', module: '17-radius', title: 'RADIUS Architecture & Weak Secret', type: 'RADIUS Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'radius', color: 'pink', description: 'Access-Request/Accept, VLAN 100, secret testing123 weak, users, logs' },
    { learningPathId: 'wireless-pentesting', id: 'lab-18-corporate', module: '18-corporate-attacks', title: 'Corporate Attack Chain', type: 'Corporate Analysis', status: 'SIMULATED', difficulty: 'Professional', pcap: 'corporate-attacks', color: 'pink', description: '3 SSIDs Enterprise/Guest/IoT + rogue + deauth + segmentation bypass Corp→Guest + isolation bypass' },
    { learningPathId: 'wireless-pentesting', id: 'lab-19-methodology', module: '19-methodology', title: 'Full Methodology Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate', description: '6 APs, hidden SSID, WPS, weak PSK, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, rogue, segmentation' },
    { learningPathId: 'wireless-pentesting', id: 'lab-20-final', module: '20-final-assessment', title: 'Final Wireless PT Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate', description: 'Independent assessment: scope, recon, enum, vuln, reporting, retest — all previous issues combined' },
    { learningPathId: 'wireless-pentesting', id: 'lab-07-wep', module: '07-wep-legacy', title: 'WEP Config Audit', type: 'Config Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: null, color: 'cyan', description: 'Identify WEP as Critical, understand IV reuse, RC4 weaknesses' },
    { learningPathId: 'wireless-pentesting', id: 'lab-08-rsn', module: '08-wpa-wpa2', title: 'RSN IE Analysis', type: 'Beacon Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'wpa2-handshake', color: 'cyan', description: 'Analyze RSN IE: CCMP, PSK, PMF status from wpa2-handshake.pcapng' },
]
