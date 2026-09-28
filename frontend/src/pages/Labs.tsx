import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { FlaskConical, Search, Filter, Radio, Wifi, FileCode, Activity, Zap, ChevronRight, Sparkles, Target, Layers, Terminal, Upload, Shield, Trophy, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import modules from '@/content/modules.json'
import { TierBadge } from '@/components/common/TierBadge'
import { motion, AnimatePresence } from 'framer-motion'

const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))
const PcapUploader = lazy(() => import('@/components/lab/PcapUploader').then(m => ({ default: m.PcapUploader })))
const EvidenceVault = lazy(() => import('@/components/evidence/EvidenceVault').then(m => ({ default: m.EvidenceVault })))
const LabScoring = lazy(() => import('@/components/lab/LabScoring').then(m => ({ default: m.LabScoring })))

interface PcapInfo {
  id: string
  filename: string
  module: string
  size?: number
  type?: string
  frames?: number
  sha256?: string
  real?: string
}

export function Labs() {
  const [pcaps, setPcaps] = useState<PcapInfo[]>([])
  const [parserInfo, setParserInfo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pcaps' | 'upload' | 'terminal' | 'vault' | 'scoring'>('pcaps')

  useEffect(() => {
    fetch('/api/pcaps')
      .then(r => r.json())
      .then(data => {
        setPcaps(data.pcaps || [])
        setParserInfo(data.parser)
      })
      .catch(() => {
        setPcaps([
          { id: "beacon-only", filename: "beacon-only.pcapng", module: "wifi-fundamentals", type: "wifi-fundamentals", frames: 4, sha256: "fcfe987b2efb920fd079694ff540431095a52f007c711c26873df082973cd94e", real: "Beacon/probe fixed fields, IEs, RSNE (AKM, ciphers, MFPC/MFPR bits), country/VHT/HE/capability IEs" },
          { id: "recon-lab", filename: "recon-lab.pcapng", module: "recon", type: "recon", frames: 17, sha256: "0a761e2ccc8f9d272294f1683e122a3de59dd541fd8b14ad94b696530b14cc14", real: "6 BSSs incl. an ESS, a hidden BSS revealed in the probe response, directed probes leaking a PNL, randomised client MAC" },
          { id: "traffic-analysis", filename: "traffic-analysis.pcapng", module: "traffic", type: "traffic", frames: 19, sha256: "14aa765ff29f4d368e976d78be390fa46361a0dab1170aaa4277237427bbe102", real: "Full association state machine, EAPOL-Key M1\u2013M4 with MICs computed from the lab PSK, DHCP/ARP/ICMP/DNS/HTTP payloads" },
          { id: "wpa2-handshake", filename: "wpa2-handshake.pcapng", module: "wpa2", type: "wpa2", frames: 13, sha256: "3dc9b2feccbb98d1a0e4a3bedb0f1cd9ac6836f5e4009de0b07c73f2d4678f55", real: "M1\u2013M4 for one client and M1\u2013M2 for a second; MICs, nonces and replay counters consistent with the lab PSK" },
          { id: "pmkid", filename: "pmkid.pcapng", module: "wpa2", type: "wpa2", frames: 6, sha256: "963fbe2082c279a3ee31546d21c609fdaf0f823a81deeb255d0b0b2a8fdcb2df", real: "PMKID = HMAC-SHA1-128(PMK, \"PMK Name\" | AA | SPA) inside a real EAPOL-Key M1 header" },
          { id: "wps-beacon", filename: "wps-beacon.pcapng", module: "wps", type: "wps", frames: 9, sha256: "6f3042407c26ced16864290d7e71bf265f3ad4c9d46018d9e32022c5ee0d6488", real: "WPS IE attributes (version, config methods, AP setup locked, selected registrar, device password id) for an unlocked and a locked AP; EAP-WSC identity/M1 framing" },
          { id: "wpa3-transition", filename: "wpa3-transition.pcapng", module: "wpa3", type: "wpa3", frames: 11, sha256: "ac8b81adfd8c06d2024bfeb591d6b7dda943ab244ea9b5530ee3ac7a2acfbf4d", real: "RSNE with AKM PSK+SAE and MFPC-only; a WPA2 PSK 4-way handshake captured against the transition BSS (the downgrade path)" },
          { id: "wpa3-only", filename: "wpa3-only.pcapng", module: "wpa3", type: "wpa3", frames: 6, sha256: "b9416f4d9bcf0f80c0527888b644175faf2ff8bb3bf2b276ee2f56221670fc69", real: "RSNE with AKM SAE and MFPR set; no PSK handshake exists in the capture" },
          { id: "deauth", filename: "deauth.pcapng", module: "deauth", type: "deauth", frames: 22, sha256: "5fe8081c3e9a1553fafc9a2c3f06c016094da92c6a530015088149a9e26b2c8b", real: "Deauthentication/disassociation frames with reason codes 1/7/8/15, broadcast and directed floods, SA Query action frames" },
          { id: "rogue-ap", filename: "rogue-ap.pcapng", module: "rogue", type: "rogue", frames: 17, sha256: "7d7128f5facf88ea17e68e0832a6758fed7d91dd2594c27593a8d526a9ad702f", real: "Rogue twin with locally-administered BSSID, different AKM, IE fingerprint and a 50 TU beacon interval; client 4-way handshake against the twin with the weak lab PSK" },
          { id: "captive-portal", filename: "captive-portal.pcapng", module: "captive", type: "captive", frames: 13, sha256: "cfadbea0646f6ee1c637a5ac3870b518de48178ea8939da69ed7bf95ad539736", real: "Open BSS, DHCP, HTTP 302 redirect to the portal, cleartext POST credentials, session cookie, client-to-client ARP (no isolation)" },
          { id: "radius", filename: "radius.pcapng", module: "radius", type: "radius", frames: 9, sha256: "d39ca4a57b765cff9ead3f39666f27fbd3cf669bd4810a51dd15293ec3ab8015", real: "RADIUS over IPv4/UDP 1812-1813 with verifiable Message-Authenticator (Access-Request) and Response Authenticator (Accept/Challenge/Accounting), Tunnel-Private-Group-Id VLAN 100, MS-MPPE keys, a rogue NAS with a wrong Message-Authenticator, and real MS-CHAPv2 challenge/response material" },
          { id: "enterprise", filename: "enterprise.pcapng", module: "enterprise", type: "enterprise", frames: 11, sha256: "54870cc3b57be9c9e50b5f0075f892562c3c37e4502f4ba2b1c6ccbb29ef060f", real: "802.1X/EAPOL-Start \u2192 EAP-Identity \u2192 PEAP \u2192 MSK \u2192 PMK \u2192 4-way handshake, anonymous outer identity, MICs consistent with the documented lab MSK" },
          { id: "eap", filename: "eap.pcapng", module: "eap", type: "eap", frames: 12, sha256: "c61499225e963629c7ed993728b1a8a6e155fd553525b1ac02386ba288bf8026", real: "PEAP / EAP-TLS / EAP-TTLS outer exchanges, and MS-CHAPv2 Challenge/Response/Success with values derived from the documented lab password (crackable material)" },
          { id: "corporate-attacks", filename: "corporate-attacks.pcapng", module: "corporate", type: "corporate", frames: 19, sha256: "fa975f25e9cdf33f2c6aaa874739c04fb956c20b7d12b5ebf3f20378cac3b1b7", real: "Full chain: deauth, evil twin with weak PSK handshake, MS-CHAPv2 capture, guest\u2192corp segmentation success" },
          { id: "methodology", filename: "methodology.pcapng", module: "methodology", type: "methodology", frames: 29, sha256: "08928da3074d001bdbb8920536ae49eddd1a2ab2088d3870dcb25fe7799eda3c", real: "Multi-BSS engagement capture: ESS, hidden BSS reveal, weak-PSK handshake, PMF-disabled deauth, rogue twin, 802.1X/PEAP, MS-CHAPv2, segmentation and isolation evidence" }
        ])
      })
  }, [])

  const tierByModule = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of modules as Array<{ id: string; lab_requirement?: string }>) {
      if (m.lab_requirement) map.set(m.id, m.lab_requirement)
    }
    return map
  }, [])

  const labs = [
    { id: 'lab-02-beacon', module: '02-wifi-fundamentals', title: 'Beacon Frame Analysis', type: 'PCAP Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'beacon-only', color: 'cyan' },
    { id: 'lab-02-config', module: '02-wifi-fundamentals', title: 'Config Audit — WPS & PMF', type: 'Config Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: null, color: 'cyan' },
    { id: 'lab-05-recon', module: '05-wireless-recon', title: 'Wireless Recon — Hidden SSID & PNL', type: 'Recon Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'recon-lab', color: 'violet' },
    { id: 'lab-06-traffic', module: '06-traffic-analysis', title: 'Traffic Analysis — Association Flow', type: 'Traffic Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'traffic-analysis', color: 'violet' },
    { id: 'lab-09-handshake', module: '09-wpa2-practical', title: 'WPA2 Handshake Identification', type: 'Handshake Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wpa2-handshake', color: 'amber' },
    { id: 'lab-09-pmkid', module: '09-wpa2-practical', title: 'PMKID Extraction — Clientless', type: 'PMKID Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'pmkid', color: 'amber' },
    { id: 'lab-10-wps', module: '10-wps', title: 'WPS Enumeration — 11k PIN Flaw', type: 'WPS Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'wps-beacon', color: 'amber' },
    { id: 'lab-11-transition', module: '11-wpa3', title: 'WPA3 Transition — Downgrade Risk', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'wpa3-transition', color: 'amber' },
    { id: 'lab-11-wpa3-only', module: '11-wpa3', title: 'WPA3-Only Good Config', type: 'WPA3 Analysis', status: 'SIMULATED', difficulty: 'Beginner', pcap: 'wpa3-only', color: 'emerald' },
    { id: 'lab-12-deauth', module: '12-deauth-disassoc', title: 'Deauth Flood — PMF Disabled', type: 'Deauth Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'deauth', color: 'red' },
    { id: 'lab-13-rogue', module: '13-rogue-ap', title: 'Rogue AP — Evil Twin Detection', type: 'Rogue Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'rogue-ap', color: 'red' },
    { id: 'lab-14-captive', module: '14-captive-portals', title: 'Captive Portal — Bypass & Isolation', type: 'Captive Analysis', status: 'SIMULATED', difficulty: 'Intermediate', pcap: 'captive-portal', color: 'amber' },
    { id: 'lab-15-enterprise', module: '15-enterprise-fundamentals', title: 'Enterprise Recon & Config Audit', type: 'Enterprise Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'enterprise', color: 'pink' },
    { id: 'lab-16-eap', module: '16-eap', title: 'EAP PEAP-MSCHAPv2 Analysis', type: 'EAP Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'eap', color: 'pink' },
    { id: 'lab-17-radius', module: '17-radius', title: 'RADIUS Architecture & Weak Secret', type: 'RADIUS Analysis', status: 'SIMULATED', difficulty: 'Advanced', pcap: 'radius', color: 'pink' },
    { id: 'lab-18-corporate', module: '18-corporate-attacks', title: 'Corporate Attack Chain', type: 'Corporate Analysis', status: 'SIMULATED', difficulty: 'Professional', pcap: 'corporate-attacks', color: 'pink' },
    { id: 'lab-19-methodology', module: '19-methodology', title: 'Full Methodology Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate' },
    { id: 'lab-20-final', module: '20-final-assessment', title: 'Final Wireless PT Assessment', type: 'Final Assessment', status: 'SIMULATED', difficulty: 'Professional', pcap: 'methodology', color: 'slate' },
  ]

  const filteredLabs = useMemo(() => {
    return labs.filter(lab => {
      if (filterType && lab.type !== filterType) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return lab.title.toLowerCase().includes(q) || lab.module.toLowerCase().includes(q) || lab.type.toLowerCase().includes(q) || (lab.pcap && lab.pcap.toLowerCase().includes(q))
      }
      return true
    })
  }, [searchQuery, filterType])

  const filteredPcaps = useMemo(() => {
    return pcaps.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return p.id.toLowerCase().includes(q) || p.filename.toLowerCase().includes(q) || p.module.toLowerCase().includes(q)
      }
      return true
    })
  }, [pcaps, searchQuery])

  const typeFilters = [...new Set(labs.map(l => l.type))]

  return (
    <div className="max-w-[1400px] mx-auto min-w-0 w-full space-y-4 xs:space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 xs:gap-6 min-w-0"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-[22px] xs:text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none truncate">Labs — Enterprise</h1>
              <p className="text-[12px] xs:text-[13px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                <span className="hidden sm:inline">Hands-on • Simulated + Hardware • Real PCAP engine • Terminal • Vault</span>
                <span className="sm:hidden">16 PCAPs • Terminal • Vault</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  <Activity className="w-3 h-3" />
                  {pcaps.length} PCAPs
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="px-3 xs:px-4 py-2.5 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
            <span className="text-[12px] font-medium text-slate-300 hidden xs:inline">{pcaps.length} PCAPs • Parser:</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-medium ${parserInfo?.method === 'tshark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
              {parserInfo?.method?.toUpperCase() || 'SCAPY'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Enterprise Tabs */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="w-full overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm w-fit">
          {[
            { id: 'pcaps', label: 'PCAP Library', icon: Radio, count: pcaps.length },
            { id: 'upload', label: 'Upload Custom', icon: Upload, count: null },
            { id: 'terminal', label: 'Terminal', icon: Terminal, count: '50+' },
            { id: 'vault', label: 'Evidence Vault', icon: Shield, count: '5' },
            { id: 'scoring', label: 'Scoring', icon: Trophy, count: null },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 xs:gap-2 px-3 xs:px-4 py-2.5 rounded-lg text-[12px] xs:text-[13px] font-medium transition-all shrink-0 touch-manipulation min-h-[44px] xs:min-h-0 ${activeTab === tab.id ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count && <span className="text-[10px] px-1.5 py-0 rounded-full bg-[#020617] border border-[#1e293b] font-mono">{tab.count}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'upload' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading PcapUploader…</div>}><PcapUploader /></Suspense>}
      {activeTab === 'terminal' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Terminal 50+ cmds…</div>}><TerminalEmulator /></Suspense>}
      {activeTab === 'vault' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Evidence Vault SHA256…</div>}><EvidenceVault /></Suspense>}
      {activeTab === 'scoring' && <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Lab Scoring…</div>}><LabScoring labId="lab-02-beacon" /></Suspense>}

      {activeTab === 'pcaps' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300 min-w-0 w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-cyan-500/[0.03] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xs:gap-4 mb-5 min-w-0">
                <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Radio className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-[13px] xs:text-[14px] text-slate-100 truncate">Available PCAPs — Real Scapy-generated</h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate">Phase C+D+E+F • Zero-cost • Local-first • Production parser</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono shrink-0">{filteredPcaps.length} shown</span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono shrink-0">Scapy Engine</span>
                </div>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 xs:gap-3 min-w-0">
                <AnimatePresence>
                  {filteredPcaps.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      className="group/pcap p-3.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 backdrop-blur-sm transition-all duration-200 cursor-pointer relative overflow-hidden min-w-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/pcap:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-start justify-between gap-3 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-[12px] font-mono font-medium text-slate-200 truncate group-hover/pcap:text-slate-100 transition-colors">{p.filename}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155]/60 text-slate-500 truncate">{p.module}</span>
                            <span className="text-slate-600 hidden xs:inline">•</span>
                            <span className="text-slate-500">{p.size ? `${(p.size/1024).toFixed(1)}KB` : `${p.frames || '?'}f`}</span>
                            {p.type && (<><span className="text-slate-600">•</span><span className="text-cyan-400/70">{p.type}</span></>)}
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald shrink-0 mt-1" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row gap-3 min-w-0"
          >
            <div className="flex-1 relative group min-w-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search labs, e.g., beacon, handshake, deauth, rogue, captive, Enterprise, EAP..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f172a] hover:border-[#334155]/60 hover:bg-[#111d33]/80 transition-all duration-200 min-w-0"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin shrink-0">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase shrink-0">
                  <Layers className="w-3 h-3" />Type
                </div>
                <button onClick={() => setFilterType(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 shrink-0 ${!filterType ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300'}`}>All</button>
                {typeFilters.slice(0, 6).map(type => (
                  <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${filterType === type ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50'}`}>{type.split(' ')[0]}</button>
                ))}
              </div>
              <button className="w-9 h-9 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 flex items-center justify-center hover:bg-[#1e293b]/60 hover:border-[#334155]/60 transition-all duration-200 shrink-0 touch-manipulation">
                <Filter className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 min-w-0">
            <AnimatePresence mode="popLayout">
              {filteredLabs.map((lab, idx) => (
                <motion.div
                  key={lab.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="min-w-0"
                >
                  <Link to={`/modules/${lab.module}`} className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 hover:border-[#334155] hover:bg-[#111d33] hover:shadow-medium transition-all duration-300 ease-smooth block overflow-hidden min-w-0">
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${lab.color === 'cyan' ? 'from-cyan-500/5 to-transparent' : lab.color === 'emerald' ? 'from-emerald-500/5 to-transparent' : lab.color === 'violet' ? 'from-violet-500/5 to-transparent' : lab.color === 'amber' ? 'from-amber-500/5 to-transparent' : lab.color === 'red' ? 'from-red-500/5 to-transparent' : lab.color === 'pink' ? 'from-pink-500/5 to-transparent' : 'from-slate-500/5 to-transparent'}`} />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative min-w-0">
                      <div className="flex items-start justify-between mb-4 gap-2 min-w-0">
                        <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-1 shrink-0 ${lab.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/15' : lab.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15' : lab.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15' : lab.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/15' : lab.color === 'red' ? 'bg-red-500/10 border-red-500/20 group-hover:bg-red-500/15' : lab.color === 'pink' ? 'bg-pink-500/10 border-pink-500/20 group-hover:bg-pink-500/15' : 'bg-slate-500/10 border-slate-500/20 group-hover:bg-slate-500/15'}`}>
                            <FlaskConical className={`w-5 h-5 ${lab.color === 'cyan' ? 'text-cyan-400' : lab.color === 'emerald' ? 'text-emerald-400' : lab.color === 'violet' ? 'text-violet-400' : lab.color === 'amber' ? 'text-amber-400' : lab.color === 'red' ? 'text-red-400' : lab.color === 'pink' ? 'text-pink-400' : 'text-slate-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-slate-500 tracking-wide truncate">{lab.module}</div>
                            <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors truncate">{lab.type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 shrink-0">
                          <TierBadge tier={tierByModule.get(lab.module) ?? lab.status} size="xs" />
                        </div>
                      </div>
                      <h3 className="font-heading font-bold text-[15px] text-slate-100 mb-3 leading-tight group-hover:text-white transition-colors duration-200 line-clamp-2">{lab.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="px-2.5 py-1 rounded-full bg-[#1e293b]/80 border border-[#334155]/60 text-[11px] font-medium text-slate-400 group-hover:bg-[#25354f]/80 group-hover:text-slate-300 transition-all duration-200 shrink-0">{lab.difficulty}</span>
                        <span className="text-[11px] text-slate-600 hidden xs:inline">•</span>
                        <span className="text-[11px] font-mono text-slate-500 truncate">{lab.id}</span>
                        {lab.pcap && (<><span className="text-[11px] text-slate-600 hidden xs:inline">•</span><span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 group-hover:text-cyan-400 transition-colors shrink-0"><FileCode className="w-3 h-3" />{lab.pcap}.pcapng</span></>)}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 ml-auto shrink-0" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredLabs.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a]/60 border border-dashed border-[#334155]/60 p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4"><Search className="w-6 h-6 text-slate-500" /></div>
              <h3 className="font-heading font-semibold text-[16px] text-slate-300">No labs found</h3>
              <p className="text-[13px] text-slate-500 mt-2">Try adjusting your search or filters</p>
            </motion.div>
          )}
        </>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-4 xs:p-5 backdrop-blur-sm min-w-0 w-full">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-emerald-400" /></div>
          <div className="text-[11px] xs:text-[12px] leading-relaxed min-w-0">
            <div className="font-semibold text-slate-300 mb-1">Enterprise Labs — Production Ready</div>
            <div className="text-slate-500 font-mono leading-relaxed break-words">
              <span className="text-emerald-400 font-medium">SIMULATED</span> real Scapy PCAPs + configs — zero-cost • <span className="text-cyan-400 font-medium">Upload</span> custom PCAPs drag-drop • <span className="text-violet-400 font-medium">Terminal</span> 50+ cmds simulated Kali • <span className="text-amber-400 font-medium">Vault</span> SHA256 chain • <span className="text-pink-400 font-medium">16 PCAPs</span> • Parser tshark→scapy→mock • PcapInspector filters • Evidence vault • Enterprise audit ready
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
