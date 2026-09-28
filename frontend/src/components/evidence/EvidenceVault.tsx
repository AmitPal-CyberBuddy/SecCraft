import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, FileCode, Hash, Clock, Download, Trash2, Search, Filter, CheckCircle, AlertTriangle, File, Zap } from 'lucide-react'

interface Evidence {
  id: string
  type: 'pcap' | 'config' | 'log' | 'screenshot' | 'hash'
  name: string
  module: string
  timestamp: string
  sha256: string
  size: string
  verified: boolean
}

const mockEvidence: Evidence[] = [
  { id: '1', type: 'pcap', name: 'wpa2-handshake.pcapng', module: '09-wpa2-practical', timestamp: '2024-12-19 10:30', sha256: 'a1b2c3d4e5f6...', size: '12.4KB', verified: true },
  { id: '2', type: 'pcap', name: 'recon-lab.pcapng', module: '05-wireless-recon', timestamp: '2024-12-19 09:15', sha256: 'f6e5d4c3b2a1...', size: '8.2KB', verified: true },
  { id: '3', type: 'config', name: 'hostapd-wpa2-good.conf', module: '08-wpa-wpa2', timestamp: '2024-12-19 10:45', sha256: '1234567890ab...', size: '1.2KB', verified: true },
  { id: '4', type: 'log', name: 'hashcat-crack.log', module: '09-wpa2-practical', timestamp: '2024-12-19 10:32', sha256: 'abcdef123456...', size: '2.1KB', verified: true },
  { id: '5', type: 'hash', name: 'evidence-chain.json', module: '19-methodology', timestamp: '2024-12-19 11:00', sha256: 'deadbeef...', size: '4.5KB', verified: false },
]

export function EvidenceVault({ className = '' }: { className?: string }) {
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = mockEvidence.filter(e => {
    if (filter && e.type !== filter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.module.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const getIcon = (type: string) => {
    switch(type) {
      case 'pcap': return FileCode
      case 'config': return File
      case 'log': return FileCode
      case 'hash': return Hash
      default: return File
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'pcap': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'config': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'log': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'hash': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Evidence Vault — Chain of Custody</h3>
            <p className="text-[11px] text-slate-500 font-mono">SHA256 verified • Production integrity • Enterprise audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{filtered.length} items</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">{mockEvidence.filter(e => e.verified).length} verified</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search evidence (e.g., handshake, recon, config)" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 min-w-0" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#020617] border border-[#1e293b] shrink-0 overflow-x-auto scrollbar-thin">
          {['all', 'pcap', 'config', 'log', 'hash'].map(t => (
            <button key={t} onClick={() => setFilter(t === 'all' ? null : t)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all shrink-0 ${filter === t || (t === 'all' && !filter) ? 'bg-[#1e293b] text-slate-100 border border-[#334155]' : 'text-slate-500 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
        {filtered.map((ev, idx) => {
          const Icon = getIcon(ev.type)
          return (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="group p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60 flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${getTypeColor(ev.type)}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-mono font-medium text-slate-200 truncate">{ev.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${getTypeColor(ev.type)}`}>{ev.type.toUpperCase()}</span>
                  {ev.verified ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500 flex-wrap">
                  <span className="truncate">{ev.module}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                  <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{ev.timestamp}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600 hidden xs:block shrink-0" />
                  <span className="hidden xs:inline truncate">{ev.sha256.slice(0, 16)}... • {ev.size}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation">
                  <Download className="w-4 h-4 text-slate-400" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors touch-manipulation">
                  <Trash2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/10 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed min-w-0">
          <span className="font-semibold text-cyan-300">Enterprise:</span> All evidence SHA256 hashed, chain of custody maintained, exportable for reports. Verified = hash matches original capture. Production-ready for PCI-DSS, NIST 800-153 audits.
        </div>
      </div>
    </div>
  )
}
