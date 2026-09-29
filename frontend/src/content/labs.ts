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
  /** Only these entries have current answer validation; other labs are guided self-review. */
  grading: 'verified' | 'self-review'
}

export const LABS: LabEntry[] = [
    { learningPathId: 'wireless-pentesting', id: 'lab-02-beacon', grading: 'verified', module: '02-wifi-fundamentals', title: 'Beacon Frame Analysis', type: 'PCAP Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'beacon-only', color: 'cyan', description: 'Extract SSID, BSSID, channel, security from beacon-only.pcapng' },
    { learningPathId: 'wireless-pentesting', id: 'lab-02-config', grading: 'self-review', module: '02-wifi-fundamentals', title: 'Config Audit — WPS & PMF', type: 'Config Analysis', status: 'PLANNED', difficulty: 'Beginner', pcap: null, color: 'cyan', description: 'PLANNED — no hostapd configuration artifact or answer-validated activity is currently bundled; excluded from progress and XP.' },
    { learningPathId: 'wireless-pentesting', id: 'lab-05-recon', grading: 'verified', module: '05-wireless-recon', title: 'Wireless Recon — Hidden SSID & PNL', type: 'Recon Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'recon-lab', color: 'violet', description: 'Map 6 BSSIDs, a hidden SSID, client probes and association evidence from recon-lab.pcapng' },
    { learningPathId: 'wireless-pentesting', id: 'lab-06-traffic', grading: 'verified', module: '06-traffic-analysis', title: 'Traffic Analysis — Association Flow', type: 'Traffic Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'traffic-analysis', color: 'violet', description: 'Synthetic 21-frame flow: association, EAPOL M1–M4 and example DHCP/ARP/ICMP/DNS/HTTP payloads; inspect the manifest limits' },
    { learningPathId: 'wireless-pentesting', id: 'lab-09-handshake', grading: 'self-review', module: '09-wpa2-practical', title: 'WPA2 Handshake Identification', type: 'Handshake Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wpa2-handshake', color: 'amber', description: 'Identify M1-M4, ANonce, SNonce, MIC, completeness' },
    { learningPathId: 'wireless-pentesting', id: 'lab-09-pmkid', grading: 'self-review', module: '09-wpa2-practical', title: 'PMKID Extraction — Reduced Handshake', type: 'PMKID Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'pmkid', color: 'amber', description: 'Extract PMKID from EAPOL M1 key data' },
    { learningPathId: 'wireless-pentesting', id: 'lab-10-wps', grading: 'self-review', module: '10-wps', title: 'WPS Enumeration — PIN Risk Indicators', type: 'WPS Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wps-beacon', color: 'amber', description: 'Read WPS IE attributes and setup-lock state in the supplied frames; no full WPS PIN/M1–M8 exchange is included' },
    { learningPathId: 'wireless-pentesting', id: 'lab-11-transition', grading: 'self-review', module: '11-wpa3', title: 'WPA3 Transition — Downgrade Risk', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'wpa3-transition', color: 'amber', description: 'Read PSK+SAE AKMs and MFPC-only in the fixture; a PSK handshake is present, but this alone does not prove an induced downgrade' },
    { learningPathId: 'wireless-pentesting', id: 'lab-11-wpa3-only', grading: 'self-review', module: '11-wpa3', title: 'WPA3-Only Good Config', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'wpa3-only', color: 'emerald', description: 'Verify WPA3-only with PMF required — good config' },
    { learningPathId: 'wireless-pentesting', id: 'lab-12-deauth', grading: 'self-review', module: '12-deauth-disassoc', title: 'Deauth Frame Patterns — PMF States', type: 'Deauth Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'deauth', color: 'red', description: 'Classify captured deauthentication/disassociation frames, reason codes and SA Query; the capture alone does not prove receiver acceptance or impact' },
    { learningPathId: 'wireless-pentesting', id: 'lab-13-rogue', grading: 'self-review', module: '13-rogue-ap', title: 'Same-SSID Look-Alike — Infrastructure Analysis', type: 'Rogue Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'rogue-ap', color: 'red', description: 'Compare look-alike BSSID/IEs and the captured client handshake; confirm ownership against an authorized inventory before calling it rogue' },
    { learningPathId: 'wireless-pentesting', id: 'lab-14-captive', grading: 'self-review', module: '14-captive-portals', title: 'Portal Traffic & Client-Isolation Analysis', type: 'Captive Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'captive-portal', color: 'amber', description: 'Open network with simulated DHCP/HTTP and a two-station ARP exchange; separate what the fixture shows from portal/session claims' },
    { learningPathId: 'wireless-pentesting', id: 'lab-15-enterprise', grading: 'self-review', module: '15-enterprise-fundamentals', title: 'Enterprise Recon & Config Audit', type: 'Enterprise Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'enterprise', color: 'pink', description: 'Inspect synthetic 802.1X/EAPOL framing and the documented illustrative profile; TLS records/MSK are structural/example data, not a certificate-validation test' },
    { learningPathId: 'wireless-pentesting', id: 'lab-16-eap', grading: 'self-review', module: '16-eap', title: 'EAP PEAP-MSCHAPv2 Analysis', type: 'EAP Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'eap', color: 'pink', description: 'Compare EAP outer-method identifiers and the separate direct MS-CHAPv2 fixture material; no complete PEAP TLS tunnel or client certificate-validation outcome is captured' },
    { learningPathId: 'wireless-pentesting', id: 'lab-17-radius', grading: 'self-review', module: '17-radius', title: 'RADIUS Authenticators & Attributes', type: 'RADIUS Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'radius', color: 'pink', description: 'Inspect RADIUS packet fields/authenticators and VLAN attribute in the fixture; it does not reveal or prove a deployed shared secret, NAS configuration, or policy outcome' },
    { learningPathId: 'wireless-pentesting', id: 'lab-18-corporate', grading: 'self-review', module: '18-corporate-attacks', title: 'Corporate Sequence — Evidence & Limits', type: 'Corporate Analysis', status: 'SIMULATED', difficulty: 'Professional', pcap: 'corporate-attacks', color: 'pink', description: 'Management frames, a look-alike BSS, lab EAP-MSCHAPv2 packets and a synthetic ICMP pair; inspect limits (no DHCP/PEAP/RADIUS evidence)' },
    { learningPathId: 'wireless-pentesting', id: 'lab-19-methodology', grading: 'self-review', module: '19-methodology', title: 'Methodology Capture Review — Self-Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate', description: 'Eight BSSIDs including a weak-PSK exercise target and look-alike; inspect beacon/probe, WPS and handshake evidence. Synthetic EAP/ICMP frames do not prove production certificate validation or segmentation policy' },
    { learningPathId: 'wireless-pentesting', id: 'lab-20-final', grading: 'self-review', module: '20-final-assessment', title: 'Final Wireless PT Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate', description: 'Self-review of the methodology capture and reporting workflow; no independent grading, live RF test, or separate retest evidence is supplied' },
    { learningPathId: 'wireless-pentesting', id: 'lab-07-wep', grading: 'self-review', module: '07-wep-legacy', title: 'WEP Config Audit', type: 'Config Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: null, color: 'cyan', description: 'Identify obsolete WEP and explain IV/RC4 weaknesses; determine severity from exposure and impact rather than labeling it Critical by default' },
    { learningPathId: 'wireless-pentesting', id: 'lab-08-rsn', grading: 'self-review', module: '08-wpa-wpa2', title: 'RSN IE Analysis', type: 'Beacon Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'wpa2-handshake', color: 'cyan', description: 'Inspect the fixture RSNE for advertised AKM, cipher and PMF capability; distinguish advertised policy from negotiated/enforced behavior' },
]

/** Catalogue entries which currently have a learner-facing artifact/activity. */
export const AVAILABLE_LABS = LABS.filter(lab => lab.status !== 'PLANNED')
