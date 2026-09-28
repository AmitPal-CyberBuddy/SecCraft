import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, FlaskConical, Swords, Terminal, FileText, Command, ArrowRight, Clock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import modules from '@/content/modules.json'

interface SearchItem {
  id: string
  title: string
  description: string
  type: 'module' | 'lesson' | 'lab' | 'command' | 'tool' | 'filter'
  path: string
  keywords: string[]
  xp?: number
}

const searchData: SearchItem[] = [
  ...modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: 'module' as const,
    path: `/modules/${m.id}`,
    keywords: [m.id, m.title, m.description, `phase ${m.phase}`, m.difficulty, ...m.skills],
    xp: 160,
  })),
  // Lessons
  { id: 'wireshark-filters', title: 'Wireshark Filters', description: 'Master wlan.fc.type_subtype filters', type: 'lesson', path: '/modules/06-traffic-analysis', keywords: ['wireshark', 'filter', 'wlan.fc.type_subtype', 'beacon', 'eapol'], xp: 10 },
  { id: 'handshake', title: 'WPA2 Handshake Analysis', description: 'M1-M4, ANonce, SNonce, MIC', type: 'lesson', path: '/modules/09-wpa2-practical', keywords: ['handshake', 'eapol', 'mic', 'anonce', 'snonce', 'ptk'], xp: 10 },
  { id: 'wps', title: 'WPS Exploitation', description: 'PIN brute-force 11k flaw', type: 'lesson', path: '/modules/10-wps', keywords: ['wps', 'pin', 'reaver', 'bully', 'wash', '11k'], xp: 10 },
  { id: 'wpa3', title: 'WPA3 SAE & Transition', description: 'Dragonfly, downgrade risks', type: 'lesson', path: '/modules/11-wpa3', keywords: ['wpa3', 'sae', 'dragonfly', 'transition', 'downgrade', 'forward secrecy'], xp: 10 },
  { id: 'deauth', title: 'Deauth & PMF', description: 'DoS, reason codes, 802.11w', type: 'lesson', path: '/modules/12-deauth-disassoc', keywords: ['deauth', 'disassoc', 'pmf', '802.11w', 'mfpc', 'mfpr', 'dos'], xp: 10 },
  { id: 'rogue-ap', title: 'Rogue AP & Evil Twin', description: 'Detection & defense', type: 'lesson', path: '/modules/13-rogue-ap', keywords: ['rogue', 'evil twin', 'wids', 'bssid', 'cloning'], xp: 10 },
  { id: 'enterprise', title: 'Enterprise & EAP', description: '802.1X, PEAP, EAP-TLS, RADIUS', type: 'lesson', path: '/modules/15-enterprise-fundamentals', keywords: ['enterprise', 'eap', 'peap', 'tls', 'radius', '802.1x'], xp: 10 },
  // Commands
  { id: 'cmd-airodump', title: 'airodump-ng', description: 'Wireless packet capture & recon', type: 'command', path: '/reference', keywords: ['airodump-ng', 'capture', 'recon', 'bssid', 'channel'], xp: 0 },
  { id: 'cmd-aireplay', title: 'aireplay-ng --deauth', description: 'Deauthentication attack (RF required)', type: 'command', path: '/reference', keywords: ['aireplay-ng', 'deauth', 'dos', 'injection'], xp: 0 },
  { id: 'cmd-hashcat', title: 'hashcat -m 22000', description: 'WPA2 handshake cracking', type: 'command', path: '/reference', keywords: ['hashcat', '22000', 'crack', 'handshake', 'pmkid'], xp: 0 },
  { id: 'cmd-tshark', title: 'tshark -r capture.pcapng', description: 'CLI Wireshark analysis', type: 'command', path: '/reference', keywords: ['tshark', 'wireshark', 'filter', 'pcap'], xp: 0 },
  { id: 'cmd-iw', title: 'iw dev wlan0 scan', description: 'Interface & scan management', type: 'command', path: '/reference', keywords: ['iw', 'scan', 'interface', 'monitor', 'managed'], xp: 0 },
  { id: 'cmd-hostapd', title: 'hostapd — Rogue AP', description: 'AP configuration & evil twin', type: 'command', path: '/reference', keywords: ['hostapd', 'rogue', 'evil twin', 'config'], xp: 0 },
  { id: 'cmd-wash', title: 'wash -i wlan0mon', description: 'WPS enumeration', type: 'command', path: '/reference', keywords: ['wash', 'wps', 'enumeration'], xp: 0 },
  // Filters
  { id: 'filter-beacon', title: 'wlan.fc.type_subtype==8', description: 'Beacon frames filter', type: 'filter', path: '/reference', keywords: ['beacon', 'filter', 'wlan.fc.type_subtype==8'], xp: 0 },
  { id: 'filter-eapol', title: 'eapol — 4-way handshake', description: 'EAPOL handshake filter', type: 'filter', path: '/reference', keywords: ['eapol', 'handshake', 'filter'], xp: 0 },
  { id: 'filter-deauth', title: 'wlan.fc.type_subtype==12', description: 'Deauth frames filter', type: 'filter', path: '/reference', keywords: ['deauth', 'filter', 'dos'], xp: 0 },
]

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const results = useMemo(() => {
    if (!query.trim()) return searchData.slice(0, 8)
    const q = query.toLowerCase()
    return searchData
      .map(item => {
        const score = 
          (item.title.toLowerCase().includes(q) ? 10 : 0) +
          (item.id.toLowerCase().includes(q) ? 8 : 0) +
          (item.keywords.some(k => k.toLowerCase().includes(q)) ? 5 : 0) +
          (item.description.toLowerCase().includes(q) ? 2 : 0)
        return { ...item, score }
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => document.getElementById('global-search-input')?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
        else {
          // Will be handled by parent
          document.dispatchEvent(new CustomEvent('open-search'))
        }
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // Fix: onClose stable via useCallback, but keep dep only open to avoid loop from inline function
  }, [open])

  const getIcon = (type: string) => {
    switch(type) {
      case 'module': return BookOpen
      case 'lesson': return FileText
      case 'lab': return FlaskConical
      case 'command': return Terminal
      case 'filter': return Search
      default: return Search
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'module': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'lesson': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'lab': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'command': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'filter': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] xs:pt-[15vh] p-3 xs:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[640px] rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Search Input */}
          <div className="relative flex items-center gap-3 p-4 border-b border-[#1e293b]/60">
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
            <input
              id="global-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search modules, lessons, commands, filters... (e.g., WPA3, deauth, hashcat)"
              className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder:text-slate-500 focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e293b] border border-[#334155] text-[10px] font-mono text-slate-400">
                <Command className="w-3 h-3" />K
              </kbd>
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors">
                <span className="text-[12px] text-slate-400">✕</span>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-slate-500" />
                </div>
                <div className="text-[13px] text-slate-400">No results for "{query}"</div>
                <div className="text-[11px] text-slate-600 mt-1">Try WPA3, handshake, deauth, hashcat, etc.</div>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => {
                  const Icon = getIcon(item.type)
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => {
                        navigate(item.path)
                        onClose()
                      }}
                      className="w-full text-left p-3 rounded-xl flex items-center gap-3 hover:bg-[#1e293b] border border-transparent hover:border-[#334155]/60 transition-all duration-200 group min-w-0"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#020617] border border-[#1e293b] flex items-center justify-center group-hover:border-[#334155] transition-colors shrink-0">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] font-medium text-slate-200 truncate group-hover:text-slate-100">{item.title}</span>
                          <span className={`hidden xs:inline-flex text-[9px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${getTypeColor(item.type)}`}>{item.type.toUpperCase()}</span>
                          {item.xp ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono shrink-0">+{item.xp} XP</span> : null}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 hidden xs:block" />
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#1e293b]/60 bg-[#020617]/40 flex flex-col xs:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">↵</kbd> Select</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">ESC</kbd> Close</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{searchData.length} items • local index</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
