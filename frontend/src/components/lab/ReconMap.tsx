import { SelectionMarker } from '@/components/common/SelectionMarker'
import { useState, useEffect } from 'react'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Wifi, Radio, Users, AlertTriangle, EyeOff, Shield, Hash, Activity, Target } from 'lucide-react'
import { apiFetch, discardResponseBody } from '@/lib/api'

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
  summary?: string
  /** Decoded RSNE — present only when the frame actually carries one. */
  rsn?: { akmp?: number[]; caps?: number } | null
  akm_names?: string[]
  cipher_names?: string[]
  mfpc?: boolean
  mfpr?: boolean
  radio?: { channel?: number; signal?: number }
  probe_response?: boolean
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
  signal?: number
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

/**
 * OUI labelling for the lab captures. The lab MACs are generated, so the only claims made here are
 * the ones that are checkable from the address itself: the U/L bit (locally administered) and the
 * multicast bit. Vendor names are never guessed for unknown OUIs.
 */
const MAC_LABELS: Record<string, string> = {
  '00:11:22': 'OUI 00:11:22 (lab AP)',
}

const vendorFromOUI = (mac: string) => {
  const oui = mac?.slice(0, 8).toUpperCase()
  const firstOctet = parseInt((mac || '').slice(0, 2), 16)
  if (!Number.isNaN(firstOctet) && (firstOctet & 0x02)) return 'locally administered'
  return MAC_LABELS[oui] || `OUI ${oui}`
}

export function ReconMap(props: Props) {
  return <ObservedReconMap key={props.pcapId} {...props} />
}

function ObservedReconMap({ pcapId }: Props) {
  const [data, setData] = useState<PcapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'api' | 'bundled'>('bundled')
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [selectedAP, setSelectedAP] = useState<APInfo | null>(null)
  const [filterESS, setFilterESS] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const abort = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      setUnavailable(null)
      // Local parser API first, then the offline dataset that ships with the build. No invented
      // frames: if neither is available the panel reports that instead of drawing a fictional BSS.
      try {
        const res = await apiFetch(`/api/pcaps/${encodeURIComponent(pcapId)}/analyze`, { signal: abort.signal })
        if (!res.ok) {
          await discardResponseBody(res)
          throw new Error(`parser API responded ${res.status}`)
        }
        const result = await res.json()
        if (cancelled) return
        setData(result)
        setDataSource('api')
      } catch (apiError: any) {
        if (cancelled) return
        try {
          const bundled = await fetch(`${import.meta.env.BASE_URL}lab-data/${pcapId}.json`, { signal: abort.signal })
          if (!bundled.ok) throw new Error(`bundled dataset responded ${bundled.status}`)
          const result = (await bundled.json()) as PcapData
          if (cancelled) return
          setData(result)
          setDataSource('bundled')
        } catch (bundledError: any) {
          if (cancelled) return
          setUnavailable(
            `Recon map unavailable for ${pcapId}. The local parser API is not reachable (${apiError.message}) ` +
            `and no bundled dataset was found (${bundledError.message}).`,
          )
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true; abort.abort() }
  }, [pcapId])

  if (loading) {
    return <LoadingPanel label="Mapping observed network signals" detail={`Building a recon view from ${pcapId}.pcapng`} />
  }

  if (!data) {
    return (
      <div className="sc-technical-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5 text-[var(--attention)]" />
        </div>
        <div className="text-[13px] text-[var(--ink-secondary)] font-medium">Recon map unavailable</div>
        <div className="text-[11.5px] text-[var(--ink-muted)] mt-2 max-w-[520px] mx-auto leading-relaxed">{unavailable}</div>
      </div>
    )
  }

  // Build AP infos from frames
  const beaconFrames = data.frames.filter(f => f.subtype_name.includes('Beacon'))
  const probeReqFrames = data.frames.filter(f => f.subtype_name.includes('Probe Request'))
  const probeRespFrames = data.frames.filter(f => f.subtype_name.includes('Probe Response'))
  const assocReqFrames = data.frames.filter(f => f.subtype_name.includes('Assoc Request'))

  const apMap = new Map<string, APInfo>()
  beaconFrames.forEach(f => {
    if (!f.bssid) return
    const existing = apMap.get(f.bssid)
    const hidden = !f.ssid
    // A hidden BSSID is only "revealed" when another frame in this capture really carries the name.
    const revealed =
      probeRespFrames.find(pr => pr.bssid === f.bssid && !!pr.ssid)?.ssid ||
      assocReqFrames.find(ar => ar.bssid === f.bssid && !!ar.ssid)?.ssid ||
      ''
    // Everything below is read from the decoded frame — nothing is assumed per BSSID.
    const akms = f.akm_names?.length ? f.akm_names.join(' + ') : ''
    const ciphers = f.cipher_names?.length ? f.cipher_names.join(' + ') : ''
    const security = f.rsn ? [akms || 'RSNE (no AKM listed)', ciphers].filter(Boolean).join(' / ') : 'Open (no RSNE)'
    const pmf = f.mfpr ? 'required' : f.mfpc ? 'capable' : f.rsn ? 'disabled' : 'n/a (open)'
    if (existing) {
      existing.beaconCount++
      if (hidden && revealed) { existing.ssid = revealed; existing.hidden = false }
      return
    }
    apMap.set(f.bssid, {
      bssid: f.bssid,
      ssid: hidden ? revealed : f.ssid || '',
      channel: f.channel ?? f.radio?.channel ?? 0,
      security,
      vendor: vendorFromOUI(f.bssid),
      hidden: hidden && !revealed,
      essGroup: hidden ? revealed || '(unresolved)' : f.ssid || '(empty)',
      clients: [],
      signal: f.radio?.signal,
      wps: !!f.wps,
      pmf,
      beaconCount: 1,
      firstSeen: f.number,
    })
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
    <div className="sc-technical-surface space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition">

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
              <Radio className="w-5 h-5 text-[var(--owner)]" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)] flex items-center gap-2">
                Recon Map — {pcapId}.pcapng
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]">{dataSource === 'api' ? 'API dataset' : 'Bundled dataset'}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] font-mono">{aps.length} APs • {clients.length} clients • {data.summary.channels.join(', ')} channels • {beaconFrames.length} beacons • {probeReqFrames.length} probes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select aria-label="Filter network name" value={filterESS} onChange={e => setFilterESS(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[12px] text-[var(--ink-secondary)] focus:border-[var(--owner-border)] focus:outline-none">
              <option value="">All ESS</option>
              {Array.from(essGroups.keys()).map(ess => <option key={ess} value={ess}>{ess || '(hidden)'} ({essGroups.get(ess)?.length})</option>)}
            </select>
          </div>
        </div>

        {/* Channel spectrum */}
        <div className="mt-5 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
          <div className="text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Channel Map — 2.4GHz & 5GHz
          </div>
          <div className="grid grid-cols-12 gap-1">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(ch => {
              const apsOnCh = aps.filter(ap => ap.channel === ch)
              return (
                <div key={ch} aria-label={`${apsOnCh.length} access points on channel ${ch}`} className="text-center">
                  <div className={`h-16 rounded-lg border flex flex-col items-center justify-end p-1 sc-technical-transition ${apsOnCh.length ? 'bg-[var(--accent-bg)] border-[var(--accent-border)]' : 'bg-[var(--panel-bg)] border-[var(--line-normal)]'}`}>
                    {apsOnCh.map(ap => (
                      <div key={ap.bssid} className="w-full h-2 rounded-full bg-[var(--chart-one)] mb-1" title={`${ap.ssid} ${ap.bssid}`} />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">{ch}</div>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-8 gap-1 mt-3">
            {[36,40,44,48,52,56,60,64,100,104,108,112,116,120,124,128,132,136,140,144,149,153,157,161,165].slice(0,16).map(ch => {
              const apsOnCh = aps.filter(ap => ap.channel === ch)
              return (
                <div key={ch} aria-label={`${apsOnCh.length} access points on channel ${ch}`} className="text-center">
                  <div className={`h-12 rounded-lg border flex flex-col items-center justify-end p-1 ${apsOnCh.length ? 'bg-[var(--info-bg)] border-[var(--info-border)]' : 'bg-[var(--panel-bg)] border-[var(--line-normal)]'}`}>
                    {apsOnCh.map(ap => <div key={ap.bssid} className="w-full h-2 rounded-full bg-[var(--chart-two)] mb-1" />)}
                  </div>
                  <div className="text-[9px] font-mono text-[var(--ink-secondary)] mt-1">{ch}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-mono text-[var(--ink-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--chart-one)]" /> 2.4GHz AP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--chart-two)]" /> 5GHz AP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--chart-three)]" /> Hidden</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AP List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-[12px] font-bold text-[var(--ink-primary)] flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[var(--learning)]" /> APs — {filteredAPs.length} {filterESS && `in ESS ${filterESS}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAPs.map(ap => (
              <button
                type="button"
                aria-pressed={selectedAP?.bssid === ap.bssid}
                key={ap.bssid}
                onClick={() => setSelectedAP(ap)}
                className={`sc-technical-choice text-left p-4 rounded-xl border cursor-pointer sc-technical-transition ${selectedAP?.bssid === ap.bssid ? 'bg-[var(--panel-raised)] border-[var(--accent-border)] shadow-soft' : 'bg-[var(--panel-bg)] border-[var(--line-normal)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-bg)]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[var(--ink-primary)] truncate">{ap.ssid || '(hidden)'}</span>
                      {ap.hidden && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--attention)] border border-[var(--warning-border)] flex items-center gap-1"><EyeOff className="w-3 h-3" /> HIDDEN</span>}
                      {ap.wps && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]">WPS</span>}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--ink-secondary)] mt-1 truncate">{ap.bssid} • Ch{ap.channel} {channelToBand(ap.channel)} • {ap.signal !== undefined ? `${ap.signal} dBm` : 'signal not in capture (radiotap absent)'}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ap.security === 'Open' ? 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]' : 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]'}`}>{ap.security}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)]">{ap.vendor}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)]">{ap.beaconCount} beacons</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--attention)]">PMF {ap.pmf}</span>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${ap.hidden ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : 'bg-[var(--accent-bg)] border-[var(--accent-border)]'}`}>
                    {ap.hidden ? <EyeOff className="w-4 h-4 text-[var(--attention)]" /> : <Wifi className="w-4 h-4 text-[var(--learning)]" />}
                  </div>
                </div>
                {ap.clients.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--line-normal)]">
                    <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-1"><Users className="w-3 h-3" /> {ap.clients.length} clients associated</div>
                    <div className="text-[11px] font-mono text-[var(--ink-secondary)] mt-1 truncate">{ap.clients.join(', ')}</div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* ESS Groups */}
          <div className="mt-6">
            <div className="text-[12px] font-bold text-[var(--ink-primary)] flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-[var(--owner)]" /> ESS Groups — Same SSID Different BSSID
            </div>
            <div className="space-y-2">
              {Array.from(essGroups.entries()).map(([ess, groupAps]) => (
                <div key={ess} className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-mono text-[var(--ink-primary)]">{ess || '(hidden)'} — {groupAps.length} BSSID{groupAps.length>1?'s':''} {groupAps.length>1 && <span className="text-[var(--success)]">ESS (roaming)</span>}</div>
                    <div className="text-[10px] text-[var(--ink-muted)]">{groupAps.map(a=>`Ch${a.channel}`).join(', ')}</div>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--ink-muted)] mt-1">{groupAps.map(a=>a.bssid).join(', ')}</div>
                  {groupAps.length>1 && <div className="text-[10px] text-[var(--ink-secondary)] mt-1">Same SSID different BSSID = ESS multiple APs for roaming — check authorized list to rule out rogue. If authorized list says {ess} legit BSSIDs {groupAps.map(a=>a.bssid).join(', ')}, then not rogue.</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clients & Details */}
        <div className="space-y-4">
          <div>
            <div className="text-[12px] font-bold text-[var(--ink-primary)] flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[var(--owner)]" /> Clients — {clients.length} + PNL Leakage
            </div>
            <div className="space-y-2">
              {clients.map(c => (
                <div key={c.mac} className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] hover:border-[var(--line-strong)] sc-technical-transition">
                  <div className="text-[12px] font-mono text-[var(--ink-primary)]">{c.mac}</div>
                  <div className="text-[11px] text-[var(--ink-muted)] mt-1">{c.vendor} • {c.probes} probes • {c.associatedBssid ? `Assoc to ${c.associatedBssid}` : 'Not associated'}</div>
                  <div className="mt-2">
                    <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest">PNL — Preferred Network List</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.pnl.map(ssid => (
                        <span key={ssid} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--owner-bg)] text-[var(--owner)] border border-[var(--owner-border)]">{ssid}</span>
                      ))}
                    </div>
                    {c.pnl.some(name => name && !aps.some(a => a.ssid === name && !a.hidden)) && (
                      <div className="text-[10px] text-[var(--attention)] mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> PNL leak — this client probes for{' '}
                        {c.pnl.filter(name => name && !aps.some(a => a.ssid === name && !a.hidden)).join(', ')},
                        which no BSS in this capture advertises openly
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedAP && (
            <div className="sc-technical-detail p-4 rounded-xl bg-[var(--panel-bg)] border border-[var(--accent-border)] shadow-soft" role="region" aria-label="Selected access point details">
              <SelectionMarker value={selectedAP.bssid} />
              <div className="text-[12px] font-bold text-[var(--ink-primary)] flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--learning)]" /> Selected AP Detail — {selectedAP.bssid}
              </div>
              <div className="mt-3 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">SSID</span><span className="text-[var(--ink-primary)]">{selectedAP.ssid || '(hidden)'} {selectedAP.hidden && '(hidden beacon empty)'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">BSSID</span><span className="text-[var(--ink-primary)]">{selectedAP.bssid}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Channel</span><span className="text-[var(--ink-primary)]">Ch{selectedAP.channel} {channelToBand(selectedAP.channel)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Security</span><span className="text-[var(--ink-primary)]">{selectedAP.security}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Vendor</span><span className="text-[var(--ink-primary)]">{selectedAP.vendor} OUI {selectedAP.bssid.slice(0,8)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Signal</span><span className="text-[var(--ink-primary)]">{selectedAP.signal !== undefined ? `${selectedAP.signal} dBm` : 'not present in capture'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">PMF</span><span className="text-[var(--attention)]">{selectedAP.pmf}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">WPS</span><span className={selectedAP.wps ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>{selectedAP.wps ? 'WPS IE present in beacon' : 'no WPS IE in beacon'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Beacons</span><span className="text-[var(--ink-primary)]">{selectedAP.beaconCount} frames f{selectedAP.firstSeen}</span></div>
                <div className="flex justify-between"><span className="text-[var(--ink-muted)]">Clients</span><span className="text-[var(--ink-primary)]">{selectedAP.clients.length} {selectedAP.clients.join(', ')}</span></div>
              </div>
              {selectedAP.hidden && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[11px] text-[var(--attention)]">
                  <div className="flex items-center gap-1 font-bold"><EyeOff className="w-3 h-3" /> Hidden SSID Reveal Evidence</div>
                  <div className="mt-1 leading-relaxed text-[var(--ink-secondary)]">
                    The beacon from {selectedAP.bssid} (frame {selectedAP.firstSeen}, channel {selectedAP.channel}) carries an empty SSID IE.
                    {selectedAP.ssid
                      ? ` The name "${selectedAP.ssid}" appears later in this capture in a frame for the same BSSID — that is the reveal you can cite. Filters: wlan.fc.type_subtype==8 && wlan.ssid=="", wlan.fc.type_subtype==5 && wlan.ssid==${selectedAP.ssid}`
                      : ' No later frame in this capture reveals the name — a hidden SSID that is never revealed in the capture cannot be named in the report.'}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
            <div className="text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-widest flex items-center gap-2"><Shield className="w-3 h-3" /> VAPT Evidence</div>
            <div className="mt-2 text-[11px] font-mono text-[var(--ink-muted)] leading-relaxed">
              PCAP: {pcapId}.pcapng<br/>
              APs: {aps.length} BSSIDs: {aps.map(a=>a.bssid).join(', ')}<br/>
              Hidden: {aps.filter(a=>a.hidden).map(a=>`${a.bssid} Ch${a.channel} beacon f${a.firstSeen} carries an empty SSID IE`).join('; ') || 'none in this capture'}<br/>
              Revealed names: {aps.filter(a=>a.hidden===false && a.ssid).map(a=>a.ssid).length} in capture<br/>
              Clients: {clients.map(c=>`${c.mac} PNL ${c.pnl.join(', ')}`).join('; ')}<br/>
              ESS: {Array.from(essGroups.entries()).filter(([,g])=>g.length>1).map(([ess,g])=>`${ess} ${g.map(a=>a.bssid).join(', ')}`).join('; ')}<br/>
              Channels: {data.summary.channels.join(', ')}<br/>
              Filters: wlan.fc.type_subtype==8 beacons, wlan.fc.type_subtype==4 probe req, wlan.fc.type_subtype==5 probe resp, wlan.ssid=="" hidden<br/>
              Hash: SHA256 (calculate via sha256sum {pcapId}.pcapng)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
