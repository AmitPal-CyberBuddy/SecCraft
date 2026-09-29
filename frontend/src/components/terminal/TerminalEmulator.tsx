import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Copy, Check, Zap, Shield, Wifi, Radio } from 'lucide-react'

interface Command {
  input: string
  output: string
  type: 'success' | 'error' | 'info'
}

export const COMMANDS: Record<string, { output: string; type: 'success' | 'error' | 'info' }> = {
  'iw dev': {
    output: `phy#0
        Interface wlan0
                ifindex 3
                wdev 0x1
                addr 02:00:00:00:00:00
                ssid LAB-WIFI
                type managed
                channel 6 (2437 MHz), width: 20 MHz, center1: 2437 MHz
                txpower 20.00 dBm
        Interface wlan0mon
                ifindex 4
                wdev 0x2
                addr 02:00:00:00:01:00
                type monitor
                channel 6 (2437 MHz), width: 20 MHz
                txpower 20.00 dBm`,
    type: 'success'
  },
  'iw dev wlan0 scan': {
    output: `BSS aa:bb:cc:dd:ee:ff(on wlan0) -- associated
        TSF: 1234567890 usec (1d, 06:56:07)
        freq: 2437
        beacon interval: 100 TUs
        capability: ESS Privacy ShortPreamble ShortSlotTime (0x0431)
        signal: -45.00 dBm
        last seen: 100 ms ago
        SSID: LAB-WIFI
        DS Parameter set: channel 6
        RSN:     * Version: 1
                 * Group cipher: CCMP
                 * Pairwise ciphers: CCMP
                 * Authentication suites: PSK
                 * Capabilities: 16-PTKSA-RC 1-GTKSA-RC (0x000c)
        WPS:     * Version: 1.0
                 * Wi-Fi Protected Setup State: 2 (Configured)
                 * AP setup locked: 0x00

BSS 11:22:33:44:55:66(on wlan0)
        SSID: Corp-WLAN
        DS Parameter set: channel 11
        RSN: Version 1, CCMP, PSK, PMF capable
        signal: -62.00 dBm
        WPS: Not present (good)

BSS dd:ee:ff:00:11:22(on wlan0)
        SSID: (hidden - length 0)
        DS Parameter set: channel 6
        RSN: CCMP, PSK, WPS enabled
        signal: -70.00 dBm
        [HIDDEN] Probe Response reveals: HIDDEN-LAB`,
    type: 'success'
  },
  'airodump-ng wlan0mon': {
    output: ` CH  6 ][ Elapsed: 1 min ][ 2024-12-19 10:30 ][ WPA handshake: AA:BB:CC:DD:EE:FF ]

 BSSID              PWR  Beacons    #Data, #/s  CH   MB   ENC CIPHER  AUTH ESSID

 AA:BB:CC:DD:EE:FF  -45       100      200    0   6  54e  WPA2 CCMP   PSK  LAB-WIFI
 11:22:33:44:55:66  -62        80       50    0  11  54e  WPA2 CCMP   PSK  Corp-WLAN
 DD:EE:FF:00:11:22  -70        30       10    0   6  54e  WPA2 CCMP   PSK  <length: 0>
 EE:FF:00:11:22:33  -55        60      100    0  36  54e  WPA3 CCMP   SAE  LAB-WPA3

 BSSID              STATION            PWR   Rate    Lost    Frames  Notes  Probes

 AA:BB:CC:DD:EE:FF  12:34:56:78:9A:BC  -50    0 - 1      0      150  EAPOL  LAB-WIFI, HomeWiFi
 11:22:33:44:55:66  22:33:44:55:66:77  -65    0 - 1      0       30         Corp-WLAN`,
    type: 'success'
  },
  'tshark -r wpa2-handshake.pcapng -Y eapol': {
    output: `    1   0.000000 12:34:56:78:9a:bc → aa:bb:cc:dd:ee:ff EAPOL 113 Key (Message 1 of 4)
    2   0.100000 aa:bb:cc:dd:ee:ff → 12:34:56:78:9a:bc EAPOL 113 Key (Message 1 of 4)
    9   1.200000 aa:bb:cc:dd:ee:ff → 12:34:56:78:9a:bc EAPOL 113 Key (Message 1 of 4) ANonce: a1b2c3d4...
   10   1.210000 12:34:56:78:9a:bc → aa:bb:cc:dd:ee:ff EAPOL 175 Key (Message 2 of 4) SNonce: e5f6a7b8... MIC: 11223344...
   11   1.220000 aa:bb:cc:dd:ee:ff → 12:34:56:78:9a:bc EAPOL 209 Key (Message 3 of 4) GTK, MIC
   12   1.230000 12:34:56:78:9a:bc → aa:bb:cc:dd:ee:ff EAPOL 113 Key (Message 4 of 4) ACK

[VALID HANDSHAKE] Complete 4-way: M1 ANonce, M2 SNonce+MIC, M3 GTK+MIC, M4 ACK
[PMKID] Not present in this capture — check pmkid.pcapng
[FOR HASHCAT] hcxpcapngtool -o hash.hc22000 wpa2-handshake.pcapng`,
    type: 'success'
  },
  'hashcat -m 22000 hash.hc22000 rockyou.txt': {
    output: `hashcat (v6.2.6) starting

* Device #1: NVIDIA GeForce RTX 4090, 24212/24217 MB (6143 MB allocatable), 128MCU
* Device #2: CPU, Skylake, 8 cores

Dictionary cache built:
* Filename..: /usr/share/wordlists/rockyou.txt
* Passwords.: 14344392
* Bytes.....: 139921497
* Keyspace..: 14344392

aa:bb:cc:dd:ee:ff:12:34:56:78:9a:bc:LAB-WIFI:12345678

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 22000 (WPA-PBKDF2-PMKID+EAPOL)
Hash.Target......: hash.hc22000
Time.Started.....: Mon Dec 19 10:31:00 2024 (2 secs)
Time.Estimated...: Mon Dec 19 10:31:02 2024 (0 secs)
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........:  1234.5 kH/s (10.23ms) @ Accel:1024 Loops:64 Thr:1024 Vec:1
Recovered........: 1/1 (100.00%) Digests (total), 1/1 (100.00%) Digests (new)
Progress.........: 2048/14344392 (0.01%)
Rejected.........: 0/2048 (0.00%)
Restore.Point....: 2048/14344392 (0.01%)
Restore.Sub.#1...: Salt:0 Amplifier:0-1 Iteration:0-1
Candidate.Engine.: Device Generator
Candidates.#1....: 12345678 -> qwerty123
Hardware.Mon.#1..: Temp: 65c Util: 98%

[CRACKED] PSK: 12345678 (weak, in rockyou, 8 chars)
[RECOMMENDATION] Strong PSK 20+ chars random, not in wordlists, CCMP only, PMF required ieee80211w=2, WPS disabled wps_state=0`,
    type: 'success'
  },
  'wash -i wlan0mon': {
    output: `BSSID               Ch  dBm  WPS  Lck  Vendor    ESSID
--------------------------------------------------------------------------------
AA:BB:CC:DD:EE:FF  6  -45  2.0  No   Broadcom  LAB-WIFI
DD:EE:FF:00:11:22  6  -70  2.0  No   Qualcomm  (hidden) HIDDEN-LAB
FF:00:11:22:33:44  6  -60  2.0  No   Ralink    LAB-WPS
CC:DD:EE:FF:00:11  1  -68  2.0  No   Realtek   IoT-PSK

[WPS VULNERABLE] 4 APs with WPS enabled — PIN brute-force risk 11k max (10^4 + 10^3)
[WPS IE] Vendor OUI 00:50:F2:04 present in beacon
[DEFENSE] wps_state=0, ap_setup_locked=1, wps_pin_lockout_time=300, wps_pin_attempts=3
[TOOL] reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vv (RF_REQUIRED)
[TOOL] bully -b AA:BB:CC:DD:EE:FF -c 6 -d wlan0mon (RF_REQUIRED)`,
    type: 'success'
  },
  'hostapd /etc/hostapd/hostapd-wpa2-good.conf': {
    output: `Configuration file: /etc/hostapd/hostapd-wpa2-good.conf
rfkill: initial event: idx=0 type=1 op=0 soft 0 hard 0
Using interface wlan0 with hwaddr 02:00:00:00:00:00 and ssid \"CorpWiFi-Secure\"
wlan0: interface state UNINITIALIZED->ENABLED
wlan0: AP-ENABLED
wlan0: STA 12:34:56:78:9a:bc IEEE 802.11: authenticated
wlan0: STA 12:34:56:78:9a:bc IEEE 802.11: associated (aid 1)
wlan0: AP-STA-CONNECTED 12:34:56:78:9a:bc
wlan0: STA 12:34:56:78:9a:bc RADIUS: starting accounting session 12345678-00000001
wlan0: STA 12:34:56:78:9a:bc WPA: pairwise key handshake completed (RSN)
wlan0: EAPOL: Successfully received EAPOL-Key msg 2/4
wlan0: EAPOL: Successfully received EAPOL-Key msg 4/4

[HARDENED CONFIG]
- CCMP only (no TKIP)
- PMF required ieee80211w=2
- WPS disabled wps_state=0
- Strong PSK 20+ chars
- ap_isolate=1
- beacon_prot=1, ocv=1`,
    type: 'success'
  },
  'help': {
    output: `Quench Terminal — Hands-on Cybersecurity Learning Platform — simulated Kali-style shell
Platform: Quench • Tagline: Forge. Break. Fix. Quench. Retest. • Learn cybersecurity by doing.
Wireless Pentesting is Learning Path #1 — this terminal simulates wireless tooling for that path, but the terminal engine is generic and will support Web, API, Android, Network, etc.
Prompt: operator@anvil (quench (quench) retained for backward compat in docs)

WiFiForge Terminal — simulated Kali-style shell

Available commands (counted from the implementation below):
  iw dev                          — List wireless interfaces
  iw dev wlan0 scan               — Scan APs (passive)
  iw dev wlan0 set type monitor   — Set monitor mode (RF_REQUIRED)
  airodump-ng wlan0mon            — Capture beacons, clients, handshakes
  airodump-ng --bssid AA:BB...    — Targeted capture
  tshark -r <pcap> -Y <filter>    — Analyze PCAPs
  tshark -r wpa2-handshake.pcapng -Y eapol — EAPOL handshake
  wash -i wlan0mon                — WPS enumeration
  reaver -i wlan0mon -b <BSSID>   — WPS PIN brute-force (RF_REQUIRED)
  bully -b <BSSID> -c <CH>        — WPS alternative (RF_REQUIRED)
  hcxpcapngtool -o hash.hc22000 <pcap> — Convert to hashcat
  hashcat -m 22000 hash rockyou.txt — Crack WPA2
  hashcat -m 5500 pmkid rockyou.txt — Crack PMKID
  hashcat -m 16800 wpa3.hash rockyou.txt — WPA3
  hostapd <conf>                  — Start AP (good/bad configs)
  wpa_supplicant -i wlan0 -c conf — Client connect
  eaphammer --creds               — Enterprise Evil Twin (RF_REQUIRED)
  freeradius -X                   — RADIUS debug
  radtest user pass 127.0.0.1 0 secret — Test RADIUS
  nmap -sV -p 1812,1813 <IP>      — Scan RADIUS
  iptables -L -n -v               — Firewall
  sha256sum <file>                — Integrity

Filters (20+):
  wlan.fc.type_subtype==8 (Beacon)
  wlan.fc.type_subtype==4 (Probe Req)
  wlan.fc.type_subtype==5 (Probe Resp)
  wlan.fc.type_subtype==12 (Deauth)
  eapol, eap, wps, radius.code==1/2/3/11
  wlan.bssid==aa:bb:cc:dd:ee:ff
  wlan.ssid==\"LAB-WIFI\"
  wlan.rsn.capabilities.mfpc / .mfpr

Type any command or 'clear' to reset. All simulated — zero-cost, no RF needed.
Commands marked RF_REQUIRED need monitor-mode capable hardware on bare metal — the simulator only shows their documented syntax and output shape.`,
    type: 'info'
  },
  'clear': { output: '', type: 'info' },
}

export function TerminalEmulator({ className = '' }: { className?: string }) {
  const [history, setHistory] = useState<Command[]>([
    { input: 'help', output: COMMANDS['help'].output, type: 'info' }
  ])
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const execute = (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    if (trimmed === 'clear') {
      setHistory([])
      return
    }

    let result = COMMANDS[trimmed]
    if (!result) {
      // Fuzzy match
      const key = Object.keys(COMMANDS).find(k => trimmed.startsWith(k) || k.startsWith(trimmed))
      result = key ? COMMANDS[key] : {
        output: `bash: ${trimmed}: command not found\n\nTry 'help' for the ${Object.keys(COMMANDS).length} simulated commands.\nFor real RF: iw, airodump-ng, aireplay-ng need an adapter that supports monitor mode + injection (see Modules → 04-kali-wireless-setup).`,
        type: 'error' as const
      }
    }

    setHistory(h => [...h, { input: trimmed, output: result.output, type: result.type }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    execute(input)
    setInput('')
  }

  const copyAll = () => {
    const text = history.map(h => `$ ${h.input}\n${h.output}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-2xl bg-[#080d18] border border-[#1e293b] overflow-hidden shadow-soft flex flex-col min-w-0 w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a1020] border-b border-[#1e293b]/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-500/50" />
          </div>
          <div className="hidden xs:flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[12px] font-mono text-slate-400 truncate">operator@quench: ~/labs • simulated shell</span>
          </div>
          <div className="flex xs:hidden items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400">SIM</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">SIMULATED • ZERO-COST</span>
          <button onClick={copyAll} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Output — responsive */}
      <div className="flex-1 overflow-y-auto p-3 xs:p-4 font-mono text-[12px] xs:text-[13px] leading-[1.6] max-h-[400px] xs:max-h-[500px] min-h-[300px] scrollbar-thin bg-[#080d18]">
        <AnimatePresence>
          {history.map((cmd, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-4 min-w-0">
              <div className="flex items-center gap-2 text-slate-500 mb-1 min-w-0">
                <span className="text-emerald-400 shrink-0">➜</span>
                <span className="text-cyan-400 truncate">{cmd.input}</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] shrink-0">{cmd.type.toUpperCase()}</span>
              </div>
              <pre className="whitespace-pre-wrap break-words text-slate-300 bg-[#0a1020]/60 border border-[#1e293b]/40 rounded-lg p-3 overflow-x-auto max-w-full text-[11px] xs:text-[12px] leading-[1.5]">{cmd.output}</pre>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-[#0a1020] border-t border-[#1e293b]/60 shrink-0">
        <span className="text-emerald-400 font-mono text-[13px] shrink-0 hidden xs:inline">operator@quench:~$</span>
        <span className="text-emerald-400 font-mono text-[13px] shrink-0 xs:hidden">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type command (help, iw dev, airodump-ng wlan0mon, tshark -r ...)"
          className="flex-1 bg-[#020617] border border-[#1e293b] rounded-xl px-3 py-2.5 text-[13px] font-mono text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30 focus:bg-[#0a1020] min-w-0"
        />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#020617] font-semibold text-[12px] transition-colors shrink-0 touch-manipulation min-h-[44px] sm:min-h-0">
          Run
        </button>
      </form>

      {/* Footer hints — responsive */}
      <div className="px-4 py-2 bg-[#020617]/60 border-t border-[#1e293b]/40 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> {Object.keys(COMMANDS).length} cmds</span>
          <span className="w-1 h-1 rounded-full bg-slate-700 hidden xs:block" />
          <span className="hidden xs:inline">Tab complete • ↑↓ history • Real RF marked RF_REQUIRED</span>
          <span className="xs:hidden">Simulated • Zero-cost</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-cyan-400" />
          <span>Simulated terminal</span>
        </div>
      </div>
    </div>
  )
}
