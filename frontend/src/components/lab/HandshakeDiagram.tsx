import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Key, Shield, Zap, ArrowRight, CheckCircle, AlertTriangle, Eye, Lock, Unlock } from 'lucide-react'

interface Props {
  pcapId?: string
  bssid?: string
  client?: string
  ssid?: string
  anonce?: string
  snonce?: string
  mic?: string
  pmkid?: string
  rsn?: {
    version: number
    groupCipher: string
    pairwiseCipher: string
    akm: string
    mfpc: boolean
    mfpr: boolean
    wps?: boolean
  }
}

export function HandshakeDiagram({ pcapId = 'wpa2-handshake', bssid = 'AA:BB:CC:DD:EE:FF', client = '11:22:33:44:55:66', ssid = 'LAB-WPA2', anonce = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', snonce = 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', mic = '1234567890abcdef1234567890abcdef', pmkid, rsn }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [showPMKID, setShowPMKID] = useState(false)

  const steps = [
    {
      id: 'M1',
      title: 'M1: AP → Client ANonce',
      sa: bssid,
      da: client,
      replay: 1,
      mic: '0 (no MIC)',
      nonce: anonce.slice(0, 16) + '...',
      keyData: 'None',
      description: 'AP sends ANonce 32 bytes random, replay 1, no MIC, no key data. Client now has ANonce + generates SNonce + PMK → derives PTK via PRF.',
      filter: 'eapol && wlan.bssid==' + bssid,
      good: true,
    },
    {
      id: 'M2',
      title: 'M2: Client → AP SNonce + MIC',
      sa: client,
      da: bssid,
      replay: 1,
      mic: mic.slice(0, 16) + '... valid',
      nonce: snonce.slice(0, 16) + '...',
      keyData: 'RSN IE (client)',
      description: 'Client sends SNonce 32 bytes + MIC HMAC-SHA1(KCK) over EAPOL + RSN IE, replay 1. AP derives PTK, verifies MIC via KCK. Proves client knows PMK.',
      filter: 'eapol && wlan.sa==' + client,
      good: true,
    },
    {
      id: 'M3',
      title: 'M3: AP → Client GTK + MIC',
      sa: bssid,
      da: client,
      replay: 2,
      mic: '789abc... valid',
      nonce: 'ANonce same or 0',
      keyData: 'GTK encrypted with KEK + RSN IE',
      description: 'AP sends GTK encrypted with KEK + MIC with KCK, replay 2, secure 1. Client verifies MIC, decrypts GTK with KEK, installs PTK + GTK.',
      filter: 'eapol && wlan.bssid==' + bssid + ' && eapol.keydes.replay_counter==2',
      good: true,
    },
    {
      id: 'M4',
      title: 'M4: Client → AP ACK + MIC',
      sa: client,
      da: bssid,
      replay: 2,
      mic: 'def012... valid',
      nonce: '0 (no nonce)',
      keyData: 'None (ACK)',
      description: 'Client ACK, MIC, replay 2, secure 1, no key data. Both install PTK + GTK. Data now encrypted with TK CCMP.',
      filter: 'eapol && wlan.sa==' + client + ' && eapol.keydes.replay_counter==2',
      good: true,
    },
  ]

  const rsnInfo = rsn || {
    version: 1,
    groupCipher: 'CCMP (00-0F-AC-04) good',
    pairwiseCipher: 'CCMP (00-0F-AC-04) good',
    akm: 'PSK (00-0F-AC-02) or SAE (08) — check transition',
    mfpc: true,
    mfpr: false,
    wps: false,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155]/60 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-violet-500/[0.02] opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-100 flex items-center gap-2">
                4-Way Handshake Interactive Diagram — {pcapId}.pcapng
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">BSSID {bssid} • Client {client} • SSID {ssid} • Replay 1,1,2,2 • ANonce/SNonce/MIC</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPMKID(!showPMKID)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${showPMKID ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-[#020617]/60 border-[#1e293b]/60 text-slate-500 hover:text-slate-300'}`}>
              {showPMKID ? 'Hide PMKID' : 'Show PMKID'}
            </button>
          </div>
        </div>

        {/* Flow */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${activeStep === idx ? 'bg-[#1e293b] border-cyan-500/30 shadow-glow-cyan' : 'bg-[#020617]/60 border-[#1e293b]/50 hover:border-[#334155]/60 hover:bg-[#020617]/80'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${step.good ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{step.id}</span>
                <span className="text-[10px] font-mono text-slate-500">Replay {step.replay}</span>
              </div>
              <div className="text-[12px] font-semibold text-slate-100">{step.title}</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">SA {step.sa.slice(0, 8)}... DA {step.da.slice(0, 8)}...</div>
              <div className="text-[10px] text-slate-600 mt-2 leading-relaxed">{step.nonce} • {step.mic} • {step.keyData}</div>
              {activeStep === idx && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400" />}
            </motion.div>
          ))}
        </div>

        {/* Active step detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 p-4 rounded-xl bg-[#020617] border border-[#1e293b] font-mono text-[11px] text-slate-400 leading-relaxed"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><ArrowRight className="w-3 h-3 text-cyan-400" /></div>
              <span className="text-[12px] font-bold text-slate-200">{steps[activeStep].title} — Detail</span>
            </div>
            <div>SA {steps[activeStep].sa} → DA {steps[activeStep].da} BSSID {bssid} Replay {steps[activeStep].replay} Nonce {steps[activeStep].nonce} MIC {steps[activeStep].mic} Key Data {steps[activeStep].keyData}</div>
            <div className="mt-2 text-slate-300">{steps[activeStep].description}</div>
            <div className="mt-2 text-cyan-400/80">Filter: {steps[activeStep].filter}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RSN IE Decoder */}
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155]/60 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-100">RSN IE Decoder — Tag 48</div>
              <div className="text-[11px] text-slate-500 font-mono">Version, Group Cipher, Pairwise, AKM, Capabilities MFPC/MFPR, PMKID, Group Mgmt BIP, WPS</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">Version</div>
                <div className="text-[12px] font-mono text-slate-200 mt-1">{rsnInfo.version} — RSN Version 1</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">Group Cipher</div>
                <div className={`text-[12px] font-mono mt-1 ${rsnInfo.groupCipher.includes('CCMP') ? 'text-emerald-400' : 'text-red-400'}`}>{rsnInfo.groupCipher}</div>
                <div className="text-[10px] text-slate-600 mt-1">Filter: wlan.rsn.gcs.type==4 CCMP good, ==2 TKIP bad</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">Pairwise Cipher</div>
                <div className={`text-[12px] font-mono mt-1 ${rsnInfo.pairwiseCipher.includes('CCMP') ? 'text-emerald-400' : 'text-red-400'}`}>{rsnInfo.pairwiseCipher}</div>
                <div className="text-[10px] text-slate-600 mt-1">Filter: wlan.rsn.pcs.type==4 CCMP good</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">AKM (Auth Key Mgmt)</div>
                <div className="text-[12px] font-mono text-slate-200 mt-1">{rsnInfo.akm}</div>
                <div className="text-[10px] text-slate-600 mt-1">Filter: wlan.rsn.akms.type==2 PSK, ==8 SAE WPA3, ==1 EAP, count&gt;1 transition</div>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PSK 2</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">SAE 8 WPA3</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">EAP 1 Enterprise</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">RSN Capabilities — PMF MFPC/MFPR</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${rsnInfo.mfpc ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>MFPC {rsnInfo.mfpc ? '1 capable' : '0 disabled'}</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${rsnInfo.mfpr ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>MFPR {rsnInfo.mfpr ? '1 required' : '0 not required'}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  {rsnInfo.mfpc && rsnInfo.mfpr ? 'PMF required MFPC=1 MFPR=1 — good — prevents deauth — WPA3 mandates required' : rsnInfo.mfpc && !rsnInfo.mfpr ? 'PMF capable optional MFPC=1 MFPR=0 — better than disabled but downgrade possible — should be required if all clients support PMF — Medium' : 'PMF disabled MFPC=0 MFPR=0 — bad — Medium — deauth possible, handshake capture via deauth, DoS, Evil Twin'}
                </div>
                <div className="text-[10px] text-cyan-400/80 mt-1">Filter: wlan.rsn.capabilities.mfpc==1 && mfpr==1 required, ==0 && ==0 disabled</div>
              </div>
              <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest">PMKID & Group Management</div>
                <div className="text-[12px] font-mono text-slate-200 mt-1">PMKID Count 0 or 1 — PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) 16 bytes — clientless capture via hcxdumptool — single frame — no deauth</div>
                <div className="text-[10px] text-slate-600 mt-1">Filter: wlan.rsn.pmkid or wlan_rsna_eapol.pmkid</div>
                <div className="text-[12px] font-mono text-slate-200 mt-2">Group Mgmt Cipher BIP (00-0F-AC-06) — for PMF — BIP-GMAC-128/256 for WPA3</div>
                <div className="text-[10px] text-slate-600 mt-1">Filter: wlan.rsn.gmcs.type==6 BIP good</div>
              </div>
              <div className={`p-3 rounded-xl border ${rsnInfo.wps ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="text-[11px] uppercase tracking-widest flex items-center gap-1" style={{ color: rsnInfo.wps ? '#f87171' : '#34d399' }}>
                  {rsnInfo.wps ? <><AlertTriangle className="w-3 h-3" /> WPS Enabled IE 00:50:F2:04 High 11k PIN flaw</> : <><CheckCircle className="w-3 h-3" /> WPS Disabled — good</>}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Filter: wps or wlan.tag.oui==00:50:f2:04 — beacon WPS IE present = WPS enabled = High/Medium</div>
                <div className="text-[11px] font-mono mt-1" style={{ color: rsnInfo.wps ? '#f87171' : '#34d399' }}>{rsnInfo.wps ? 'wps_state=2 enabled — bad — 11k PIN brute-force' : 'wps_state=0 disabled — good'}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#020617] border border-[#1e293b] font-mono text-[11px] text-slate-400 leading-relaxed">
            <div className="text-slate-300 mb-1">Example RSN IE Good WPA3-only:</div>
            Tag 48 Length 20 Version 1 Group CCMP (00-0F-AC-04) Pairwise Count 1 CCMP AKM Count 1 SAE (00-0F-AC-08) RSN Caps 0x00C0 MFPC=1 MFPR=1 PMF required PMKID Count 0 Group Mgmt BIP (00-0F-AC-06) — good — no WPS — no TKIP
            <div className="text-slate-300 mt-2 mb-1">Example Bad Transition PSK+SAE PMF optional WPS:</div>
            Tag 48 Length 24 Version 1 Group CCMP Pairwise CCMP AKM Count 2 PSK (02) + SAE (08) same WeakPass123 RSN Caps 0x0040 MFPC=1 MFPR=0 PMF optional Group Mgmt BIP + Tag 221 OUI 00:50:F2:04 WPS IE — bad — transition downgrade risk, PMF optional allows deauth, WPS High, weak PSK High
          </div>
        </div>
      </div>

      {/* PMKID */}
      <AnimatePresence>
        {showPMKID && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl bg-[#0f172a] border border-violet-500/20 p-5 relative overflow-hidden shadow-glow-violet">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"><Eye className="w-4 h-4 text-violet-400" /></div>
                <div>
                  <div className="text-[13px] font-bold text-slate-100">PMKID — Clientless Single Frame</div>
                  <div className="text-[11px] text-slate-500 font-mono">PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) 16 bytes — HMAC-SHA1 20 bytes first 16 — clientless via hcxdumptool</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest">PMKID Value</div>
                  <div className="text-[12px] font-mono text-violet-400 mt-1 break-all">{pmkid || 'aabbccddeeff00112233445566778899'}</div>
                  <div className="text-[10px] text-slate-600 mt-1">16 bytes 32 hex chars — first 128 bits of HMAC-SHA1</div>
                </div>
                <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest">Formula</div>
                  <div className="text-[11px] font-mono text-slate-300 mt-1">PMK = PBKDF2(passphrase, SSID, 4096, 32 bytes)</div>
                  <div className="text-[11px] font-mono text-slate-300">Data = "PMK Name" (8) + BSSID (6) + STA MAC (6) = 20 bytes</div>
                  <div className="text-[11px] font-mono text-slate-300">HMAC-SHA1(PMK, Data) = 20 bytes</div>
                  <div className="text-[11px] font-mono text-violet-400">PMKID = first 16 bytes</div>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[#020617] border border-[#1e293b] font-mono text-[11px] text-slate-400">
                <div>BSSID {bssid} STA MAC {client} SSID {ssid} PMKID {pmkid || 'aabb...'} in EAPOL M1 key data RSN IE PMKID Count 1</div>
                <div className="mt-1">Filter: wlan_rsna_eapol.pmkid or eapol && wlan.rsn.pmkid</div>
                <div className="mt-1">Capture clientless: hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1 — associates as client, gets M1 with PMKID, single frame, no client needed, no deauth, less detection than handshake</div>
                <div className="mt-1">Convert: hcxpcapngtool -o pmkid.22000 pmkid.pcapng && hashcat -m 22000 pmkid.22000 wordlist.txt --force — offline audit if weak PSK</div>
                <div className="mt-1">Defense: Strong PSK 20+ random not in wordlists, PMF required, WPA3 SAE resists offline audit forward secrecy, no WPS</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence */}
      <div className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/50 p-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Shield className="w-3 h-3" /> VAPT Evidence — Handshake & RSN</div>
        <div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
          PCAP: {pcapId}.pcapng SHA256 (sha256sum {pcapId}.pcapng) Frames 11-12 BSSID {bssid} Client {client} SSID {ssid} Ch6<br/>
          M1 f9 ANonce {anonce.slice(0, 16)}... replay 1 SA BSSID DA client MIC 0, M2 f10 SNonce {snonce.slice(0, 16)}... MIC {mic.slice(0, 16)}... replay 1 SA client DA BSSID, M3 f11 GTK encrypted MIC replay 2 SA BSSID DA client, M4 f12 ACK MIC replay 2 SA client DA BSSID — complete 1,1,2,2<br/>
          RSN: Group CCMP, Pairwise CCMP, AKM {rsnInfo.akm}, MFPC={rsnInfo.mfpc ? 1 : 0} MFPR={rsnInfo.mfpr ? 1 : 0} {rsnInfo.mfpc && rsnInfo.mfpr ? 'PMF required good' : rsnInfo.mfpc ? 'PMF capable optional Medium' : 'PMF disabled Medium deauth possible'}, WPS {rsnInfo.wps ? 'enabled High 11k' : 'disabled good'}, BIP Group Mgmt<br/>
          Filters: eapol && wlan.bssid=={bssid}, wlan.rsn.akms.type==2 PSK ==8 SAE, wlan.rsn.capabilities.mfpc==1 && mfpr==1 required, wps, wlan_rsna_eapol.pmkid<br/>
          Hashcat: hcxpcapngtool -o {pcapId}.hc22000 {pcapId}.pcapng && hashcat -m 22000 {pcapId}.hc22000 wordlist.txt --force — only authorized lab
        </div>
      </div>
    </div>
  )
}
