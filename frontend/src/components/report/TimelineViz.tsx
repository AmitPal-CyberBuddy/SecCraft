import { motion } from 'framer-motion'
import { Clock, Shield, Zap, Target, Flag, Award, Radio, FileCode } from 'lucide-react'

interface Event {
  time: string
  title: string
  desc: string
  type: 'recon' | 'attack' | 'evidence' | 'defense' | 'retest'
  icon: any
}

const events: Event[] = [
  { time: '00:00', title: 'Recon — iw dev + iw scan', desc: 'LAB-WIFI BSSID aa:bb:cc:11:22:33 Ch6 WPA2-PSK WPS enabled — 3 BSS', type: 'recon', icon: Radio },
  { time: '00:05', title: 'Traffic Analysis — airodump-ng', desc: 'CH 6 — handshake captured indicator — 1 client 12:34:56:78:9A:BC', type: 'recon', icon: Target },
  { time: '00:12', title: 'WPS Enum — wash', desc: '4 APs WPS vulnerable — LAB-WIFI WPS 2.0 locked No — 11k PIN feasible', type: 'attack', icon: Shield },
  { time: '00:18', title: 'Evidence — wpa2-handshake.pcapng', desc: '11 frames — 4 EAPOL VALID HANDSHAKE — ANonce SNonce MIC — SHA256 a1b2c3...', type: 'evidence', icon: FileCode },
  { time: '00:25', title: 'Attack — hashcat -m 22000', desc: 'Cracked 12345678 — rockyou.txt — offline audit — weak passphrase', type: 'attack', icon: Zap },
  { time: '00:35', title: 'Defense — hostapd/wpa2-good.conf', desc: 'WPA3-SAE or 20+ char passphrase — wps_state=0 — ieee80211w=2 PMF required', type: 'defense', icon: Shield },
  { time: '00:42', title: 'Retest — wash + airodump', desc: 'No WPS APs — SAE config — PMF required — no handshake — hardened', type: 'retest', icon: Award },
  { time: '00:50', title: 'Flag — WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}', desc: 'Full methodology assessment complete — report PDF/A generated — chain verified', type: 'evidence', icon: Flag },
]

export function TimelineViz({ className = '' }: { className?: string }) {
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'recon': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
      case 'attack': return 'bg-red-500/10 border-red-500/20 text-red-400'
      case 'evidence': return 'bg-violet-500/10 border-violet-500/20 text-violet-400'
      case 'defense': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      case 'retest': return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      default: return 'bg-[#1e293b] border-[#334155] text-slate-500'
    }
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Attack Timeline — Gantt • Evidence Chain • Production</h3>
          <p className="text-[11px] text-slate-500 font-mono">Recon → Attack → Evidence → Defense → Retest → Flag • 8 events • 50min • Enterprise</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/20 via-violet-500/20 to-amber-500/20" />
        <div className="space-y-4">
          {events.map((ev, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative flex gap-4 min-w-0">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 ${getTypeColor(ev.type)}`}>
                <ev.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400">{ev.time}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${getTypeColor(ev.type)}`}>{ev.type.toUpperCase()}</span>
                  <span className="text-[12px] font-semibold text-slate-100">{ev.title}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{ev.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-5 p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-violet-300">Enterprise:</span> Timeline visualization Gantt, attack chain, evidence linking PCAP frame numbers BSSID SSID channel, SHA256 chain, compliance mapping, executive dashboard.
      </div>
    </div>
  )
}
