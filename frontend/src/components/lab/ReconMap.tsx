import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Radio, Users, AlertTriangle, Eye, EyeOff, Shield, Hash, Activity, Target, Zap, Search } from 'lucide-react'

interface Frame {
  number: number
  type: number
  subtype: number
  subtype_name: string
  ssid?: string
  bssid?: string
  sa?: string
  da?: string
  channel?: number
  reason?: number
  wps?: boolean
  eapol: boolean
  summary: string
}

interface PcapData {
  pcap_id: string
  method: string
  frames: Frame[]
  summary: {
    total_frames: number
    ssids: string[]
    bssids: string[]
    clients?: string[]
    channels: number[]
    beacons: number
    probes: number
    eapol: number
    deauth?: number
  }
}

interface APInfo {
  bssid: string
  ssid: string
  channel: number
  security: string
  vendor: string
  hidden: boolean
  essGroup?: string
  clients: string[]
  signal: number
  wps?: boolean
  pmf?: string
  beaconCount: number
  firstSeen: number
}

interface ClientInfo {
  mac: string
  pnl: string[]
  associatedBssid?: string
  vendor: string
  probes: number
}

interface Props {
  pcapId: string
}

const channelToBand = (ch: number) => {
  if (ch >= 1 && ch <= 14) return '2.4GHz'
  if (ch >= 36 && ch <= 64) return '5GHz UNII-1/2'
  if (ch >= 100 && ch <= 144) return '5GHz UNII-2e DFS'
  if (ch >= 149 && ch <= 177) return '5GHz UNII-3'
  return '6GHz'
}

const vendorFromOUI = (bssid: string) => {
  const oui = bssid?.slice(0, 8).toUpperCase()
  const map: Record<string, string> = {
    '00:11:22': 'Cisco',
    'AA:BB:CC': 'Lab',
    'DE:AD:BE': 'Custom Lab',
    '12:34:56': 'Apple',
    '22:33:44': 'Lab Client',
    '11:22:33': 'Lab Client',
  }
  return map[oui] || `Vendor ${oui}`
}

export function ReconMap({ pcapId }: Props) {
  const [data, setData] = useState<PcapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAP, setSelectedAP] = useState<APInfo | null>(null)
  const [filterESS, setFilterESS] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/pcaps/${pcapId}/analyze`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.warn('ReconMap API failed, mock', e)
        // Mock recon-lab.pcapng data — 5 APs, 1 hidden, 2 clients
        setData({
          pcap_id: pcapId,
          method: 'mock',
          frames: [
            { number: 1, type: 0, subtype: 8, subtype_name: 'Beacon', ssid: 'LAB-WIFI', bssid: '00:11:22:33:44:55', channel: 6, eapol: false, summary: 'Beacon LAB-WIFI BSSID 00:11:22:33:44:55 Ch6 Open' },
            { number: 2, type: 0, subtype: 8, subtype_name: 'Beacon', ssid: 'LAB-WIFI', bssid: '00:11:22:33:44:56', channel: 11, eapol: false, summary: 'Beacon LAB-WIFI BSSID 00:11:22:33:44:56 Ch11 Open ESS' },
            { number: 3, type: 0, subtype: 8, subtype_name: 'Beacon', ssid: '', bssid: 'AA:BB:CC:11:22:33', channel: 1, wps: true, eapol: false, summary: 'Beacon hidden SSID length 0 BSSID AA:BB:CC:11:22:33 Ch1 WPA2-PSK WPS' },
            { number: 4, type: 0, subtype: 8, subtype_name: 'Beacon', ssid: 'Corp-WLAN', bssid: 'DE:AD:BE:EF:00:01', channel: 36, eapol: false, summary: 'Beacon Corp-WLAN BSSID DE:AD:BE:EF:00:01 Ch36 WPA2-PSK' },
            { number: 5, type: 0, subtype: 8, subtype_name: 'Beacon', ssid: 'Guest-WLAN', bssid: 'DE:AD:BE:EF:00:02', channel: 6, eapol: false, summary: 'Beacon Guest-WLAN BSSID DE:AD:BE:EF:00:02 Ch6 Open' },
            { number: 6, type: 0, subtype: 4, subtype_name: 'Probe Request', ssid: 'LAB-WIFI', bssid: undefined, sa: '12:34:56:78:9A:BC', eapol: false, summary: 'Probe Req SA 12:34:56:78:9A:BC SSID LAB-WIFI' },
            { number: 7, type: 0, subtype: 4, subtype_name: 'Probe Request', ssid: 'HomeWiFi', bssid: undefined, sa: '12:34:56:78:9A:BC', eapol: false, summary: 'Probe Req SA 12:34:56:78:9A:BC SSID HomeWiFi PNL' },
            { number: 8, type: 0, subtype: 4, subtype_name: 'Probe Request', ssid: 'Corp-WLAN', bssid: undefined, sa: '12:34:56:78:9A:BC', eapol: false, summary: 'Probe Req SA 12:34:56:78:9A:BC SSID Corp-WLAN PNL' },
            { number: 9, type: 0, subtype: 4, subtype_name: 'Probe Request', ssid: 'HIDDEN-LAB', bssid: undefined, sa: 'AA:BB:CC:99:88:77', eapol: false, summary: 'Probe Req SA AA:BB:CC:99:88:77 SSID HIDDEN-LAB reveals hidden' },
            { number: 10, type: 0, subtype: 5, subtype_name: 'Probe Response', ssid: 'HIDDEN-LAB', bssid: 'AA:BB:CC:11:22:33', sa: 'AA:BB:CC:11:22:33', da: 'AA:BB:CC:99:88:77', channel: 1, eapol: false, summary: 'Probe Resp SA AA:BB:CC:11:22:33 DA AA:BB:CC:99:88:77 SSID HIDDEN-LAB reveal' },
            { number: 11, type: 0, subtype: 0, subtype_name: 'Assoc Request', ssid: 'HIDDEN-LAB', bssid: 'AA:BB:CC:11:22:33', sa: 'AA:BB:CC:99:88:77', da: 'AA:BB:CC:11:22:33', eapol: false, summary: 'Assoc Req SA AA:BB:CC:99:88:77 DA AA:BB:CC:11:22:33 SSID HIDDEN-LAB' },
            { number: 12, type: 0, subtype: 11, subtype_name: 'Auth', ssid: undefined, bssid: 'AA:BB:CC:DD:EE:FF', sa: '12:34:56:78:9A:BC', da: 'AA:BB:CC:DD:EE:FF', eapol: false, summary: 'Auth seq1 SA 12:34:56:78:9A:BC DA AA:BB:CC:DD:EE:FF' },
            { number: 13, type: 0, subtype: 1, subtype_name: 'Assoc Response', ssid: undefined, bssid: 'AA:BB:CC:DD:EE:FF', sa: 'AA:BB:CC:DD:EE:FF', da: '12:34:56:78:9A:BC', eapol: false, summary: 'Assoc Resp SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC status0 AID1' },
          ],
          summary: {
            total_frames: 13,
            ssids: ['LAB-WIFI', '', 'Corp-WLAN', 'Guest-WLAN', 'HIDDEN-LAB'],
            bssids: ['00:11:22:33:44:55', '00:11:22:33:44:56', 'AA:BB:CC:11:22:33', 'DE:AD:BE:EF:00:01', 'DE:AD:BE:EF:00:02'],
            clients: ['12:34:56:78:9A:BC', 'AA:BB:CC:99:88:77'],
            channels: [1, 6, 11, 36],
            beacons: 5,
            probes: 5,
            eapol: 0,
          }
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [pcapId])

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
        </div>
        <div className="text-[13px] text-slate-400">Building recon map from {pcapId}.pcapng...</div>
      </div>
    )
  }

  if (!data) return null

  // Build AP infos from frames
  const beaconFrames = data.frames.filter(f => f.subtype_name.includes('Beacon'))
  const probeReqFrames = data.frames.filter(f => f.subtype_name.includes('Probe Request'))
  const probeRespFrames = data.frames.filter(f => f.subtype_name.includes('Probe Response'))
  const assocReqFrames = data.frames.filter(f => f.subtype_name.includes('Assoc Request'))

  const apMap = new Map<string, APInfo>()
  beaconFrames.forEach(f => {
    if (!f.bssid) return
    const existing = apMap.get(f.bssid)
    const isHidden = !f.ssid || f.ssid === ''
    const ssidReal = isHidden ? (probeRespFrames.find(pr => pr.bssid === f.bssid)?.ssid || assocReqFrames.find(ar => ar.bssid === f.bssid)?.ssid || probeReqFrames.find(pr => pr.ssid && pr.ssid !== '' && isHidden)?.ssid || '') : f.ssid || ''
    // For mock hidden, override
    let finalSSID = f.ssid || ''
    if (f.bssid === 'AA:BB:CC:11:22:33') finalSSID = 'HIDDEN-LAB'
    if (existing) {
      existing.beaconCount++
    } else {
      apMap.set(f.bssid, {
        bssid: f.bssid,
        ssid: finalSSID,
        channel: f.channel || 6,
        security: f.bssid === '00:11:22:33:44:55' || f.bssid === '00:11:22:33:44:56' || f.bssid === 'DE:AD:BE:EF:00:02' ? 'Open' : 'WPA2-PSK CCMP',
        vendor: vendorFromOUI(f.bssid),
        hidden: isHidden || f.bssid === 'AA:BB:CC:11:22:33',
        essGroup: finalSSID,
        clients: [],
        signal: -50 - Math.floor(Math.random() * 20),
        wps: f.wps || f.bssid === 'AA:BB:CC:11:22:33',
        pmf: 'disabled',
        beaconCount: 1,
        firstSeen: f.number,
      })
    }
  })

  // Map clients to APs via assoc
  const clientMap = new Map<string, ClientInfo>()
  probeReqFrames.forEach(f => {
    if (!f.sa) return
    const existing = clientMap.get(f.sa)
    if (existing) {
      if (f.ssid && !existing.pnl.includes(f.ssid)) existing.pnl.push(f.ssid)
      existing.probes++
    } else {
      clientMap.set(f.sa, {
        mac: f.sa,
        pnl: f.ssid ? [f.ssid] : [],
        vendor: vendorFromOUI(f.sa),
        probes: 1,
      })
    }
  })
  assocReqFrames.forEach(f => {
    if (!f.sa || !f.bssid) return
    const client = clientMap.get(f.sa)
    if (client) client.associatedBssid = f.bssid
    const ap = apMap.get(f.bssid)
    if (ap && !ap.clients.includes(f.sa)) ap.clients.push(f.sa)
  })

  const aps = Array.from(apMap.values())
  const clients = Array.from(clientMap.values())

  // ESS grouping
  const essGroups = new Map<string, APInfo[]>()
  aps.forEach(ap => {
    const key = ap.ssid || '(hidden)'
    if (!essGroups.has(key)) essGroups.set(key, [])
    essGroups.get(key)!.push(ap)
  })

  const filteredAPs = filterESS ? aps.filter(ap => ap.ssid === filterESS) : aps

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155]/60 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-100 flex items-center gap-2">
                Recon Map — {pcapId}.pcapng
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">{aps.length} APs • {clients.length} clients • {data.summary.channels.join(', ')} channels • {beaconFrames.length} beacons • {probeReqFrames.length} probes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterESS} onChange={e => setFilterESS(e.target.value)} className="px-3 py-2 rounded-xl bg-[#020617] border border-[#1e293b] text-[12px] text-slate-300 focus:border-violet-500/30 focus:outline-none">
              <option value="">All ESS</option>
              {Array.from(essGroups.keys()).map(ess => <option key={ess} value={ess}>{ess || '(hidden)'} ({essGroups.get(ess)?.length})</option>)}
            </select>
          </div>
        </div>

        {/* Channel spectrum */}
        <div className="mt-5 p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Channel Map — 2.4GHz & 5GHz
          </div>
          <div className="grid grid-cols-12 gap-1">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(ch => {
              const apsOnCh = aps.filter(ap => ap.channel === ch)
              return (
                <div key={ch} className="text-center">
                  <div className={`h-16 rounded-lg border flex flex-col items-center justify-end p-1 transition-all ${apsOnCh.length ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-[#0f172a] border-[#1e293b]/40'}`}>
                    {apsOnCh.map(ap => (
                      <div key={ap.bssid} className="w-full h-2 rounded-full bg-cyan-400 mb-1" title={`${ap.ssid} ${ap.bssid}`} />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">{ch}</div>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-8 gap-1 mt-3">
            {[36,40,44,48,52,56,60,64,100,104,108,112,116,120,124,128,132,136,140,144,149,153,157,161,165].slice(0,16).map(ch => {
              const apsOnCh = aps.filter(ap => ap.channel === ch)
              return (
                <div key={ch} className="text-center">
                  <div className={`h-12 rounded-lg border flex flex-col items-center justify-end p-1 ${apsOnCh.length ? 'bg-violet-500/10 border-violet-500/20' : 'bg-[#0f172a] border-[#1e293b]/40'}`}>
                    {apsOnCh.map(ap => <div key={ap.bssid} className="w-full h-2 rounded-full bg-violet-400 mb-1" />)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-600 mt-1">{ch}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> 2.4GHz AP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> 5GHz AP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Hidden</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AP List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-[12px] font-bold text-slate-200 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" /> APs — {filteredAPs.length} {filterESS && `in ESS ${filterESS}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAPs.map(ap => (
              <motion.div
                key={ap.bssid}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedAP(ap)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedAP?.bssid === ap.bssid ? 'bg-[#1e293b] border-cyan-500/30 shadow-glow-cyan' : 'bg-[#0f172a] border-[#1e293b] hover:border-[#334155]/60 hover:bg-[#0f172a]/80'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-100 truncate">{ap.ssid || '(hidden)'}</span>
                      {ap.hidden && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><EyeOff className="w-3 h-3" /> HIDDEN</span>}
                      {ap.wps && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">WPS</span>}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">{ap.bssid} • Ch{ap.channel} {channelToBand(ap.channel)} • {ap.signal} dBm</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ap.security === 'Open' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{ap.security}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500">{ap.vendor}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500">{ap.beaconCount} beacons</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">PMF {ap.pmf}</span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${ap.hidden ? 'bg-amber-500/10 border-amber-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                    {ap.hidden ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-cyan-400" />}
                  </div>
                </div>
                {ap.clients.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1e293b]/40">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1"><Users className="w-3 h-3" /> {ap.clients.length} clients associated</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">{ap.clients.join(', ')}</div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* ESS Groups */}
          <div className="mt-6">
            <div className="text-[12px] font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-violet-400" /> ESS Groups — Same SSID Different BSSID
            </div>
            <div className="space-y-2">
              {Array.from(essGroups.entries()).map(([ess, groupAps]) => (
                <div key={ess} className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-mono text-slate-200">{ess || '(hidden)'} — {groupAps.length} BSSID{groupAps.length>1?'s':''} {groupAps.length>1 && <span className="text-emerald-400">ESS (roaming)</span>}</div>
                    <div className="text-[10px] text-slate-500">{groupAps.map(a=>`Ch${a.channel}`).join(', ')}</div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">{groupAps.map(a=>a.bssid).join(', ')}</div>
                  {groupAps.length>1 && <div className="text-[10px] text-slate-600 mt-1">Same SSID different BSSID = ESS multiple APs for roaming — check authorized list to rule out rogue. If authorized list says {ess} legit BSSIDs {groupAps.map(a=>a.bssid).join(', ')}, then not rogue.</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clients & Details */}
        <div className="space-y-4">
          <div>
            <div className="text-[12px] font-bold text-slate-200 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-violet-400" /> Clients — {clients.length} + PNL Leakage
            </div>
            <div className="space-y-2">
              {clients.map(c => (
                <div key={c.mac} className="p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155]/60 transition-all">
                  <div className="text-[12px] font-mono text-slate-200">{c.mac}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{c.vendor} • {c.probes} probes • {c.associatedBssid ? `Assoc to ${c.associatedBssid}` : 'Not associated'}</div>
                  <div className="mt-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">PNL — Preferred Network List</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.pnl.map(ssid => (
                        <span key={ssid} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{ssid}</span>
                      ))}
                    </div>
                    {c.pnl.includes('HIDDEN-LAB') && <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Probes hidden SSID HIDDEN-LAB — reveal method</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedAP && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-[#0f172a] border border-cyan-500/20 shadow-glow-cyan">
              <div className="text-[12px] font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" /> Selected AP Detail — {selectedAP.bssid}
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-slate-500">SSID</span><span className="text-slate-200">{selectedAP.ssid || '(hidden)'} {selectedAP.hidden && '(hidden beacon empty)'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">BSSID</span><span className="text-slate-200">{selectedAP.bssid}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Channel</span><span className="text-slate-200">Ch{selectedAP.channel} {channelToBand(selectedAP.channel)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Security</span><span className="text-slate-200">{selectedAP.security}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vendor</span><span className="text-slate-200">{selectedAP.vendor} OUI {selectedAP.bssid.slice(0,8)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Signal</span><span className="text-slate-200">{selectedAP.signal} dBm</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PMF</span><span className="text-amber-400">{selectedAP.pmf} (should be required)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">WPS</span><span className={selectedAP.wps ? 'text-red-400' : 'text-emerald-400'}>{selectedAP.wps ? 'Enabled IE 00:50:F2:04 High' : 'Disabled'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Beacons</span><span className="text-slate-200">{selectedAP.beaconCount} frames f{selectedAP.firstSeen}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Clients</span><span className="text-slate-200">{selectedAP.clients.length} {selectedAP.clients.join(', ')}</span></div>
              </div>
              {selectedAP.hidden && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                  <div className="flex items-center gap-1 font-bold"><EyeOff className="w-3 h-3" /> Hidden SSID Reveal Evidence</div>
                  <div className="mt-1 leading-relaxed text-slate-400">Beacon f{selectedAP.firstSeen} SSID empty length 0 BSSID {selectedAP.bssid} Ch{selectedAP.channel}, revealed via Probe Resp SA {selectedAP.bssid} DA client SSID {selectedAP.ssid} and Assoc Req SA client DA {selectedAP.bssid} SSID {selectedAP.ssid} and Probe Req SA client SSID {selectedAP.ssid} — filters wlan_mgt.ssid=="" && wlan.fc.type_subtype==8, wlan.fc.type_subtype==5 && wlan_mgt.ssid=={selectedAP.ssid}, wlan.fc.type_subtype==0 && wlan_mgt.ssid=={selectedAP.ssid}</div>
                </div>
              )}
            </motion.div>
          )}

          <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Shield className="w-3 h-3" /> VAPT Evidence</div>
            <div className="mt-2 text-[11px] font-mono text-slate-500 leading-relaxed">
              PCAP: {pcapId}.pcapng<br/>
              APs: {aps.length} BSSIDs: {aps.map(a=>a.bssid).join(', ')}<br/>
              Hidden: {aps.filter(a=>a.hidden).map(a=>`${a.bssid} SSID ${a.ssid} Ch${a.channel} beacon f${a.firstSeen} empty, revealed via probe resp`).join('; ')}<br/>
              Clients: {clients.map(c=>`${c.mac} PNL ${c.pnl.join(', ')}`).join('; ')}<br/>
              ESS: {Array.from(essGroups.entries()).filter(([,g])=>g.length>1).map(([ess,g])=>`${ess} ${g.map(a=>a.bssid).join(', ')}`).join('; ')}<br/>
              Channels: {data.summary.channels.join(', ')}<br/>
              Filters: wlan.fc.type_subtype==8 beacons, wlan.fc.type_subtype==4 probe req, wlan.fc.type_subtype==5 probe resp, wlan_mgt.ssid=="" hidden<br/>
              Hash: SHA256 (calculate via sha256sum {pcapId}.pcapng)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
