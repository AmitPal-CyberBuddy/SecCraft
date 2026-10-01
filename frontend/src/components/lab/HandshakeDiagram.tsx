import { SelectionMarker } from '@/components/common/SelectionMarker'
import { useState, useId } from 'react'
import { Key, Shield, ArrowRight, CheckCircle, AlertTriangle, Eye } from 'lucide-react'

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
  const detailId = useId()
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
    <div className="sc-technical-surface space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition">

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
              <Key className="w-5 h-5 text-[var(--learning)]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)] flex items-center gap-2">
                4-Way Handshake Interactive Diagram — {pcapId}.pcapng
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]">Simulation</span>
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] font-mono">BSSID {bssid} • Client {client} • SSID {ssid} • Replay 1,1,2,2 • ANonce/SNonce/MIC</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-pressed={showPMKID} onClick={() => setShowPMKID(!showPMKID)} className={`min-h-11 px-3 py-1.5 rounded-full text-[11px] font-medium border sc-technical-transition ${showPMKID ? 'bg-[var(--owner-bg)] border-[var(--owner-border)] text-[var(--owner)]' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'}`}>
              {showPMKID ? 'Hide PMKID' : 'Show PMKID'}
            </button>
          </div>
        </div>

        {/* Flow */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
          {steps.map((step, idx) => (
            <button
              type="button"
              aria-pressed={activeStep === idx}
              aria-controls={detailId}
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`sc-technical-choice text-left p-4 rounded-xl border cursor-pointer sc-technical-transition relative overflow-hidden ${activeStep === idx ? 'bg-[var(--panel-raised)] border-[var(--accent-border)] shadow-soft' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-inset)]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${step.good ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]' : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]'}`}>{step.id}</span>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">Replay {step.replay}</span>
              </div>
              <div className="text-[12px] font-semibold text-[var(--ink-primary)]">{step.title}</div>
              <div className="text-[11px] font-mono text-[var(--ink-muted)] mt-1 truncate">SA {step.sa.slice(0, 8)}... DA {step.da.slice(0, 8)}...</div>
              <div className="text-[10px] text-[var(--ink-secondary)] mt-2 leading-relaxed">{step.nonce} • {step.mic} • {step.keyData}</div>
            </button>
          ))}
        </div>

        {/* Active step detail */}
        <>
          <div
            id={detailId} role="region" aria-label="Handshake step details"
            className="sc-technical-detail mt-4 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-[var(--ink-secondary)] leading-relaxed"
          >
            <SelectionMarker value={activeStep} />
            <span className="sr-only" role="status">{steps[activeStep].title} selected</span>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center"><ArrowRight className="w-3 h-3 text-[var(--learning)]" /></div>
              <span className="text-[12px] font-bold text-[var(--ink-primary)]">{steps[activeStep].title} — Detail</span>
            </div>
            <div>SA {steps[activeStep].sa} → DA {steps[activeStep].da} BSSID {bssid} Replay {steps[activeStep].replay} Nonce {steps[activeStep].nonce} MIC {steps[activeStep].mic} Key Data {steps[activeStep].keyData}</div>
            <div className="mt-2 text-[var(--ink-secondary)]">{steps[activeStep].description}</div>
            <div className="mt-2 text-[var(--learning)]">Filter: {steps[activeStep].filter}</div>
          </div>
        </>
      </div>

      {/* RSN IE Decoder */}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition">

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[var(--owner)]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)]">RSN IE Decoder — Tag 48</div>
              <div className="text-[11px] text-[var(--ink-muted)] font-mono">Version, Group Cipher, Pairwise, AKM, Capabilities MFPC/MFPR, PMKID, Group Mgmt BIP, WPS</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">Version</div>
                <div className="text-[12px] font-mono text-[var(--ink-primary)] mt-1">{rsnInfo.version} — RSN Version 1</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">Group Cipher</div>
                <div className={`text-[12px] font-mono mt-1 ${rsnInfo.groupCipher.includes('CCMP') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{rsnInfo.groupCipher}</div>
                <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Filter: wlan.rsn.gcs.type==4 CCMP good, ==2 TKIP bad</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">Pairwise Cipher</div>
                <div className={`text-[12px] font-mono mt-1 ${rsnInfo.pairwiseCipher.includes('CCMP') ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{rsnInfo.pairwiseCipher}</div>
                <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Filter: wlan.rsn.pcs.type==4 CCMP good</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">AKM (Auth Key Mgmt)</div>
                <div className="text-[12px] font-mono text-[var(--ink-primary)] mt-1">{rsnInfo.akm}</div>
                <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Filter: wlan.rsn.akms.type==2 PSK, ==8 SAE WPA3, ==1 EAP, count&gt;1 transition</div>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]">PSK 2</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--owner-bg)] text-[var(--owner)] border border-[var(--owner-border)]">SAE 8 WPA3</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--info-bg)] text-[var(--info)] border border-[var(--control-border)]">EAP 1 Enterprise</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">RSN Capabilities — PMF MFPC/MFPR</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${rsnInfo.mfpc ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]' : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]'}`}>MFPC {rsnInfo.mfpc ? '1 capable' : '0 disabled'}</span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${rsnInfo.mfpr ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]' : 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]'}`}>MFPR {rsnInfo.mfpr ? '1 required' : '0 not required'}</span>
                </div>
                <div className="text-[10px] text-[var(--ink-muted)] mt-2 leading-relaxed">
                  {rsnInfo.mfpc && rsnInfo.mfpr ? 'MFPC=1/MFPR=1 advertises PMF required; this reduces acceptance of spoofed robust management frames by negotiated peers. It does not prevent every deauth technique' : rsnInfo.mfpc && !rsnInfo.mfpr ? 'MFPC=1/MFPR=0 advertises PMF capable but not required. Assess client negotiation and transition policy; do not infer a downgrade from this bit alone' : 'MFPC=0/MFPR=0 advertises no PMF. Susceptible peers may accept spoofed robust management frames; this does not prove a disconnect, handshake capture or impact'}
                </div>
                <div className="text-[10px] text-[var(--learning)] mt-1">Filter: wlan.rsn.capabilities.mfpc==1 && mfpr==1 required, ==0 && ==0 disabled</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">PMKID & Group Management</div>
                <div className="text-[12px] font-mono text-[var(--ink-primary)] mt-1">PMKID is a 16-byte HMAC-SHA1-derived value in some EAPOL-Key M1s — no need for all four handshake messages; an associated-client exchange/AP support may be needed, no deauth is inherently required</div>
                <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Filter: wlan.rsn.pmkid or wlan_rsna_eapol.pmkid</div>
                <div className="text-[12px] font-mono text-[var(--ink-primary)] mt-2">Group Mgmt Cipher BIP (00-0F-AC-06) — for PMF — BIP-GMAC-128/256 for WPA3</div>
                <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Filter: wlan.rsn.gmcs.type==6 BIP good</div>
              </div>
              <div className={`p-3 rounded-xl border ${rsnInfo.wps ? 'bg-[var(--danger-bg)] border-[var(--danger-border)]' : 'bg-[var(--success-bg)] border-[var(--success-border)]'}`}>
                <div className="text-[11px] uppercase tracking-widest flex items-center gap-1" style={{ color: rsnInfo.wps ? 'var(--danger)' : 'var(--success)' }}>
                  {rsnInfo.wps ? <><AlertTriangle className="w-3 h-3" /> WPS information element present — investigate configuration and lock state</> : <><CheckCircle className="w-3 h-3" /> No WPS information element in this selected frame</>}
                </div>
                <div className="text-[10px] text-[var(--ink-muted)] mt-1">Filter: wps or wlan.tag.oui==00:50:f2:04 — WPS IE presence is an observation, not proof of an exploitable PIN or enrollment policy</div>
                <div className="text-[11px] font-mono mt-1" style={{ color: rsnInfo.wps ? 'var(--danger)' : 'var(--success)' }}>{rsnInfo.wps ? 'WPS IE observed; check setup lock, methods, implementation, rate limits and authorized config' : 'No WPS IE observed in this frame; absence alone does not validate the running configuration'}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-[var(--ink-secondary)] leading-relaxed">
            <div className="text-[var(--ink-secondary)] mb-1">Example RSN IE Good WPA3-only:</div>
            Tag 48 Length 20 Version 1 Group CCMP (00-0F-AC-04) Pairwise Count 1 CCMP AKM Count 1 SAE (00-0F-AC-08) RSN Caps 0x00C0 MFPC=1 MFPR=1 PMF required PMKID Count 0 Group Mgmt BIP (00-0F-AC-06) — good — no WPS — no TKIP
            <div className="text-[var(--ink-secondary)] mt-2 mb-1">Example Bad Transition PSK+SAE PMF optional WPS:</div>
            Illustrative only: an RSNE with PSK+SAE and MFPC=1/MFPR=0 permits transition-compatible policy; this alone does not prove a downgrade. Weak passphrases remain a PSK concern. Review WPS state and actual client negotiation; rate risks in context.
          </div>
        </div>
      </div>

      {/* PMKID */}
      <>
        {showPMKID && (
          <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--owner-border)] p-5 relative overflow-hidden shadow-soft">

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center"><Eye className="w-4 h-4 text-[var(--owner)]" /></div>
                <div>
                  <div className="text-[13px] font-bold text-[var(--ink-primary)]">PMKID — Reduced Handshake Capture</div>
                  <div className="text-[11px] text-[var(--ink-muted)] font-mono">PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) 16 bytes — HMAC-SHA1 20 bytes first 16 — may be collected without a full 4-way exchange; collection methods/AP behavior vary</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">PMKID Value</div>
                  <div className="text-[12px] font-mono text-[var(--owner)] mt-1 break-all">{pmkid || 'aabbccddeeff00112233445566778899'}</div>
                  <div className="text-[10px] text-[var(--ink-secondary)] mt-1">16 bytes 32 hex chars — first 128 bits of HMAC-SHA1</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">Formula</div>
                  <div className="text-[11px] font-mono text-[var(--ink-secondary)] mt-1">PMK = PBKDF2(passphrase, SSID, 4096, 32 bytes)</div>
                  <div className="text-[11px] font-mono text-[var(--ink-secondary)]">Data = "PMK Name" (8) + BSSID (6) + STA MAC (6) = 20 bytes</div>
                  <div className="text-[11px] font-mono text-[var(--ink-secondary)]">HMAC-SHA1(PMK, Data) = 20 bytes</div>
                  <div className="text-[11px] font-mono text-[var(--owner)]">PMKID = first 16 bytes</div>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-[var(--ink-secondary)]">
                <div>BSSID {bssid} STA MAC {client} SSID {ssid} PMKID {pmkid || 'aabb...'} in EAPOL M1 key data RSN IE PMKID Count 1</div>
                <div className="mt-1">Filter: wlan_rsna_eapol.pmkid or eapol && wlan.rsn.pmkid</div>
                <div className="mt-1">Some collection methods actively associate as a test station and request an exchange; an AP may emit PMKID in M1. No victim deauthentication or complete four-way handshake is necessarily required, but this is not literally clientless. Use only in an authorized lab.</div>
                <div className="mt-1">Convert: hcxpcapngtool -o pmkid.22000 pmkid.pcapng && hashcat -m 22000 pmkid.22000 wordlist.txt --force — offline audit if weak PSK</div>
                <div className="mt-1">Defense: Use a unique high-entropy PSK; consider WPA3-SAE-only where compatible. PMF/WPS controls address separate risks; no fixed password length guarantees strength.</div>
              </div>
            </div>
          </div>
        )}
      </>

      {/* Evidence */}
      <div className="rounded-2xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4">
        <div className="text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-widest flex items-center gap-2"><Shield className="w-3 h-3" /> VAPT Evidence — Handshake & RSN</div>
        <div className="mt-2 text-[11px] font-mono text-[var(--ink-muted)] leading-relaxed">
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
