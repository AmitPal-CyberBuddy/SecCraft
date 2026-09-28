import { motion } from 'framer-motion'
import { BookOpen, Terminal, Filter, Hash, Sparkles, Zap, Target, Search } from 'lucide-react'
import { lazy, Suspense } from 'react'

const Flashcards = lazy(() => import('@/components/learning/Flashcards').then(m => ({ default: m.Flashcards })))
const PcapUploader = lazy(() => import('@/components/lab/PcapUploader').then(m => ({ default: m.PcapUploader })))
const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))

export function Reference() {
  const commands = [
    { cmd: "iw dev", desc: "List wireless interfaces", example: "iw dev", cat: "Interface" },
    { cmd: "iw dev wlan0 info", desc: "Interface info", example: "iw dev wlan0 info", cat: "Interface" },
    { cmd: "ip link set wlan0 up", desc: "Bring interface up", example: "sudo ip link set wlan0 up", cat: "Interface" },
    { cmd: "tshark -r file.pcapng -Y wlan.fc.type_subtype==8", desc: "Filter beacons", example: "tshark -r beacon.pcapng -Y 'wlan.fc.type_subtype==8'", cat: "Analysis" },
    { cmd: "aircrack-ng", desc: "WPA/WPA2 crack (authorized only)", example: "aircrack-ng -w wordlist.txt capture.cap", cat: "Audit" },
    { cmd: "wireshark", desc: "GUI packet analysis", example: "wireshark capture.pcapng", cat: "Analysis" },
  ]

  const filters = [
    { filter: "wlan.fc.type_subtype == 8", desc: "Beacon frames", type: "Mgmt" },
    { filter: "wlan.fc.type_subtype == 4", desc: "Probe requests", type: "Mgmt" },
    { filter: "wlan.fc.type_subtype == 5", desc: "Probe responses", type: "Mgmt" },
    { filter: "eapol", desc: "EAPOL / 4-way handshake", type: "EAPOL" },
    { filter: "wlan_mgt.ssid == \"LAB-WIFI\"", desc: "Filter by SSID", type: "Filter" },
    { filter: "wlan.bssid == AA:BB:CC:DD:EE:FF", desc: "Filter by BSSID", type: "Filter" },
    { filter: "wps", desc: "WPS IE present", type: "WPS" },
    { filter: "wlan.fc.type_subtype == 12", desc: "Deauth frames", type: "Deauth" },
  ]

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 xs:gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Quick Reference</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">Commands, Wireshark filters, terminology — complement, not replacement for learning path</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="col-span-1 lg:col-span-3 min-w-0 rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400" />
              </div>
              Commands
              <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{commands.length} commands</span>
            </h3>
            <div className="space-y-3">
              {commands.map((c, idx) => (
                <motion.div
                  key={c.cmd}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.03 }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  className="group/cmd p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                        <span className="font-mono text-[12px] text-cyan-400 font-medium">{c.cmd}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">{c.cat}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{c.desc}</div>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center opacity-0 group-hover/cmd:opacity-100 transition-opacity duration-200">
                      <Terminal className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                  <div className="mt-3 font-mono text-[11px] text-slate-500 bg-[#0f172a]/80 p-2.5 rounded-xl border border-[#1e293b]/60 group-hover/cmd:border-[#334155]/40 group-hover/cmd:text-slate-400 transition-all duration-200">
                    <span className="text-slate-600 mr-2">$</span>{c.example}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-violet-400" />
                </div>
                Wireshark Filters
                <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{filters.length} filters</span>
              </h3>
              <div className="space-y-2.5">
                {filters.map((f, idx) => (
                  <motion.div
                    key={f.filter}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.02 }}
                    whileHover={{ scale: 1.01, x: 2 }}
                    className="group/filter flex flex-col gap-2 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-[11px] text-violet-400 break-all group-hover/filter:text-violet-300 transition-colors">{f.filter}</code>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono shrink-0 ml-2">{f.type}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{f.desc}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-emerald-400" />
                </div>
                Terminology
              </h3>
              <div className="space-y-3">
                {[
                  { term: 'SSID', desc: 'Human network name' },
                  { term: 'BSSID', desc: 'MAC of AP radio' },
                  { term: 'ESS', desc: 'Group of BSSIDs same SSID' },
                  { term: 'PMF', desc: 'Protected Management Frames (802.11w)' },
                  { term: 'PSK', desc: 'Pre-Shared Key (WPA2-Personal)' },
                  { term: 'SAE', desc: 'Simultaneous Auth of Equals (WPA3)' },
                  { term: 'EAPOL', desc: 'Extensible Auth Protocol over LAN — 4-way handshake' },
                  { term: 'PNL', desc: 'Preferred Network List — client SSID history' },
                  { term: 'WPS', desc: 'Wi-Fi Protected Setup — PIN flaw 11k' },
                ].map((item, idx) => (
                  <motion.div
                    key={item.term}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.02 }}
                    whileHover={{ x: 2 }}
                    className="flex gap-3 p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:bg-[#020617]/80 hover:border-[#334155]/40 transition-all duration-200 group/term"
                  >
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover/term:bg-cyan-500/15 transition-colors shrink-0">{item.term}</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed group-hover/term:text-slate-300 transition-colors">{item.desc}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Flashcards SM-2…</div>}>
            <Flashcards />
          </Suspense>

          <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Terminal…</div>}>
            <TerminalEmulator />
          </Suspense>

          <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading PcapUploader…</div>}>
            <PcapUploader />
          </Suspense>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.04] to-violet-500/[0.02] border border-cyan-500/15 p-5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-[11px] leading-relaxed">
                <div className="font-bold text-slate-300 mb-1">Pro Tip — Enterprise</div>
                <div className="text-slate-500">Use PcapInspector filter presets for quick analysis. Combine filters with <span className="font-mono text-cyan-400 bg-[#020617] px-1 py-0.5 rounded border border-[#1e293b]">&&</span> and <span className="font-mono text-cyan-400 bg-[#020617] px-1 py-0.5 rounded border border-[#1e293b]">||</span> for advanced queries. Flashcards SM-2 spaced repetition 30+ terms 50+ commands 20+ filters • Notes & Bookmarks per lesson • Cmd+K search • Terminal 50+ cmds • Evidence vault SHA256 • Certificate QR • Daily challenges • Teams • JWT • PWA offline • Real jsPDF PDF/A • Production</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
