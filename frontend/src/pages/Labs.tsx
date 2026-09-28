import { useState, useEffect, useMemo } from 'react'
import { FlaskConical, Search, Filter, Radio, Wifi, FileCode, Activity, Zap, ChevronRight, Sparkles, Target, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface PcapInfo {
  id: string
  filename: string
  module: string
  size?: number
  type?: string
  frames?: number
}

export function Labs() {
  const [pcaps, setPcaps] = useState<PcapInfo[]>([])
  const [parserInfo, setParserInfo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pcaps')
      .then(r => r.json())
      .then(data => {
        setPcaps(data.pcaps || [])
        setParserInfo(data.parser)
      })
      .catch(() => {
        setPcaps([
          { id: 'beacon-only', filename: 'beacon-only.pcapng', module: '02-wifi-fundamentals', type: 'beacon', frames: 5 },
          { id: 'recon-lab', filename: 'recon-lab.pcapng', module: '05-wireless-recon', type: 'recon', frames: 13 },
          { id: 'traffic-analysis', filename: 'traffic-analysis.pcapng', module: '06-traffic-analysis', type: 'traffic', frames: 12 },
          { id: 'wpa2-handshake', filename: 'wpa2-handshake.pcapng', module: '09-wpa2-practical', type: 'handshake', frames: 11 },
          { id: 'pmkid', filename: 'pmkid.pcapng', module: '09-wpa2-practical', type: 'pmkid', frames: 1 },
          { id: 'wps-beacon', filename: 'wps-beacon.pcapng', module: '10-wps', type: 'wps', frames: 2 },
          { id: 'wpa3-transition', filename: 'wpa3-transition.pcapng', module: '11-wpa3', type: 'wpa3', frames: 2 },
          { id: 'wpa3-only', filename: 'wpa3-only.pcapng', module: '11-wpa3', type: 'wpa3', frames: 1 },
          { id: 'deauth', filename: 'deauth.pcapng', module: '12-deauth-disassoc', type: 'deauth', frames: 14 },
          { id: 'rogue-ap', filename: 'rogue-ap.pcapng', module: '13-rogue-ap', type: 'rogue', frames: 7 },
          { id: 'captive-portal', filename: 'captive-portal.pcapng', module: '14-captive-portals', type: 'captive', frames: 6 },
          { id: 'enterprise', filename: 'enterprise.pcapng', module: '15-enterprise-fundamentals', type: 'enterprise', frames: 13 },
          { id: 'eap', filename: 'eap.pcapng', module: '16-eap', type: 'eap', frames: 13 },
          { id: 'radius', filename: 'radius.pcapng', module: '17-radius', type: 'radius', frames: 13 },
          { id: 'corporate-attacks', filename: 'corporate-attacks.pcapng', module: '18-corporate-attacks', type: 'corporate', frames: 14 },
          { id: 'methodology', filename: 'methodology.pcapng', module: '19-methodology', type: 'methodology', frames: 24 },
        ])
      })
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
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Labs</h1>
              <p className="text-[13px] text-slate-400 mt-1.5 flex items-center gap-2">
                <span>Hands-on artifact-based labs • Simulated + Hardware • Real PCAP engine</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  <Activity className="w-3 h-3" />
                  {pcaps.length} PCAPs
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="px-4 py-2.5 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
            <span className="text-[12px] font-medium text-slate-300">{pcaps.length} PCAPs • Parser:</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-medium ${
              parserInfo?.method === 'tshark' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {parserInfo?.method?.toUpperCase() || 'SCAPY'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* PCAPs Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-cyan-500/[0.03] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[14px] text-slate-100">Available PCAPs — Real Scapy-generated</h3>
                <p className="text-[11px] text-slate-500 font-mono">Phase C+D+E+F • Zero-cost • Local-first</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">
                {filteredPcaps.length} shown
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono">
                Scapy Engine
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  className="group/pcap p-3.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 backdrop-blur-sm transition-all duration-200 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/pcap:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-[12px] font-mono font-medium text-slate-200 truncate group-hover/pcap:text-slate-100 transition-colors">{p.filename}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155]/60 text-slate-500">{p.module}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">{p.size ? `${(p.size/1024).toFixed(1)}KB` : `${p.frames || '?'}f`}</span>
                        {p.type && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-cyan-400/70">{p.type}</span>
                          </>
                        )}
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

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row gap-3"
      >
        <div className="flex-1 relative group">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 transition-colors" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search labs, e.g., beacon, handshake, deauth, rogue, captive, Enterprise, EAP..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0f172a] hover:border-[#334155]/60 hover:bg-[#111d33]/80 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              <Layers className="w-3 h-3" />
              Type
            </div>
            <button
              onClick={() => setFilterType(null)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                !filterType ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            {typeFilters.slice(0, 6).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap ${
                  filterType === type 
                    ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50'
                }`}
              >
                {type.split(' ')[0]}
              </button>
            ))}
          </div>
          <button className="w-9 h-9 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 flex items-center justify-center hover:bg-[#1e293b]/60 hover:border-[#334155]/60 transition-all duration-200 shrink-0">
            <Filter className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </motion.div>

      {/* Labs Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
      >
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
            >
              <Link
                to={`/modules/${lab.module}`}
                className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 hover:border-[#334155] hover:bg-[#111d33] hover:shadow-medium transition-all duration-300 ease-smooth block overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  lab.color === 'cyan' ? 'from-cyan-500/5 to-transparent' :
                  lab.color === 'emerald' ? 'from-emerald-500/5 to-transparent' :
                  lab.color === 'violet' ? 'from-violet-500/5 to-transparent' :
                  lab.color === 'amber' ? 'from-amber-500/5 to-transparent' :
                  lab.color === 'red' ? 'from-red-500/5 to-transparent' :
                  lab.color === 'pink' ? 'from-pink-500/5 to-transparent' :
                  'from-slate-500/5 to-transparent'
                }`} />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-1
                        ${lab.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/15' :
                          lab.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15' :
                          lab.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15' :
                          lab.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/15' :
                          lab.color === 'red' ? 'bg-red-500/10 border-red-500/20 group-hover:bg-red-500/15' :
                          lab.color === 'pink' ? 'bg-pink-500/10 border-pink-500/20 group-hover:bg-pink-500/15' :
                          'bg-slate-500/10 border-slate-500/20 group-hover:bg-slate-500/15'
                        }
                      `}>
                        <FlaskConical className={`w-5 h-5 ${
                          lab.color === 'cyan' ? 'text-cyan-400' :
                          lab.color === 'emerald' ? 'text-emerald-400' :
                          lab.color === 'violet' ? 'text-violet-400' :
                          lab.color === 'amber' ? 'text-amber-400' :
                          lab.color === 'red' ? 'text-red-400' :
                          lab.color === 'pink' ? 'text-pink-400' :
                          'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <div className="text-[11px] font-mono text-slate-500 tracking-wide">{lab.module}</div>
                        <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">{lab.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-medium backdrop-blur-sm ${
                        lab.status === 'SIMULATED' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {lab.status === 'SIMULATED' ? '● SIM' : '◐ RF'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-heading font-bold text-[15px] text-slate-100 mb-3 leading-tight group-hover:text-white transition-colors duration-200 line-clamp-2">
                    {lab.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#1e293b]/80 border border-[#334155]/60 text-[11px] font-medium text-slate-400 group-hover:bg-[#25354f]/80 group-hover:text-slate-300 transition-all duration-200">
                      {lab.difficulty}
                    </span>
                    <span className="text-[11px] text-slate-600">•</span>
                    <span className="text-[11px] font-mono text-slate-500">{lab.id}</span>
                    {lab.pcap && (
                      <>
                        <span className="text-[11px] text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                          <FileCode className="w-3 h-3" />
                          {lab.pcap}.pcapng
                        </span>
                      </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 ml-auto" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredLabs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#0f172a]/60 border border-dashed border-[#334155]/60 p-12 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="font-heading font-semibold text-[16px] text-slate-300">No labs found</h3>
          <p className="text-[13px] text-slate-500 mt-2">Try adjusting your search or filters</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-5 backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-[12px] leading-relaxed">
            <div className="font-semibold text-slate-300 mb-1">Zero-cost Simulated Labs</div>
            <div className="text-slate-500 font-mono">
              <span className="text-emerald-400 font-medium">SIMULATED</span> labs use real Scapy-generated PCAPs + configs — no hardware. 
              <span className="text-cyan-400 font-medium"> Phase C</span> Recon/Traffic + 
              <span className="text-amber-400 font-medium"> Phase D</span> WPA/WPS/WPA3 + 
              <span className="text-violet-400 font-medium"> Phase E</span> Deauth/Rogue/Captive + 
              <span className="text-pink-400 font-medium"> Phase F</span> Enterprise/EAP/RADIUS/Corporate/Methodology • 16 PCAPs • Parser: tshark → scapy → mock • PcapInspector with filters
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
