import { SelectionMarker } from '@/components/common/SelectionMarker'
import { ScrollRegion, CopyButton } from '@/components/common/TechnicalContent'
import { useState, useEffect, useRef, useId, useCallback } from 'react'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { Search, Filter, Radio, Wifi, Users, Hash, Zap, AlertCircle, CheckCircle, FileCode, Activity } from 'lucide-react'
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
  summary: string
}

interface PcapData {
  pcap_id: string
  method: string
  filter?: string
  /** Set when a display filter could not be evaluated offline. */
  note?: string
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
    disassoc?: number
    assoc?: number
    wps?: number
  }
}

interface Props {
  pcapId: string
  initialFilter?: string
  onFrameSelect?: (frame: Frame) => void
}

const filterPresets = [
  { label: 'All', short: 'All', value: '' },
  { label: 'Beacons', short: 'Beacon', value: 'wlan.fc.type_subtype==8' },
  { label: 'Probe Req', short: 'Probe', value: 'wlan.fc.type_subtype==4' },
  { label: 'Probe Resp', short: 'Resp', value: 'wlan.fc.type_subtype==5' },
  { label: 'EAPOL', short: 'EAPOL', value: 'eapol' },
  { label: 'EAP', short: 'EAP', value: 'eap' },
  { label: 'RADIUS', short: 'RADIUS', value: 'radius' },
  { label: 'Auth', short: 'Auth', value: 'wlan.fc.type_subtype==11' },
  { label: 'Deauth', short: 'Deauth', value: 'wlan.fc.type_subtype==12' },
  { label: 'Disassoc', short: 'Disas', value: 'wlan.fc.type_subtype==10' },
  { label: 'Assoc Req', short: 'Assoc', value: 'wlan.fc.type_subtype==0' },
  { label: 'Assoc Resp', short: 'AssocR', value: 'wlan.fc.type_subtype==1' },
  { label: 'WPS', short: 'WPS', value: 'wps' },
]

/** Build a one-line summary from the decoded fields that are actually present. */
function frameSummary(fr: any): string {
  const bits: string[] = [fr.subtype_name || 'Frame']
  if (fr.ssid) bits.push(`SSID=${fr.ssid}`)
  if (fr.bssid) bits.push(`BSSID=${fr.bssid}`)
  if (fr.sa && fr.sa !== fr.bssid) bits.push(`SA=${fr.sa}`)
  if (fr.channel) bits.push(`Ch=${fr.channel}`)
  if (fr.reason !== undefined) bits.push(`Reason=${fr.reason}`)
  if (fr.auth_algorithm !== undefined) bits.push(`Auth alg=${fr.auth_algorithm}`)
  if (fr.status_code !== undefined) bits.push(`Status=${fr.status_code} (${fr.status_code === 0 ? 'success' : 'failure'})`)
  if (fr.wps) bits.push('WPS IE')
  if (fr.eapol) bits.push(`EAPOL${fr.key_message ? ` ${fr.key_message}` : fr.eapol_type !== undefined ? ` type=${fr.eapol_type}` : ''}`)
  if (fr.eap_code_name) bits.push(`EAP ${fr.eap_code_name}${fr.eap_type_name ? `/${fr.eap_type_name}` : ''}`)
  if (fr.eap_identity) bits.push(`identity=${fr.eap_identity}`)
  if (fr.radius_code_name) bits.push(`RADIUS ${fr.radius_code_name}`)
  if (fr.mschapv2_opcode_name) bits.push(`MS-CHAPv2 ${fr.mschapv2_opcode_name}`)
  if (fr.protected) bits.push('protected')
  return bits.join(' | ')
}

/** Minimal display-filter evaluator for the bundled dataset (the backend does this server-side). */
function applyDisplayFilter(json: PcapData, filter: string): PcapData {
  const f = (filter || '').trim()
  const supported = (fr: any): boolean => {
    if (!f) return true
    const m = /^wlan\.fc\.type_subtype==(\d+)$/.exec(f)
    if (m) return String(fr.subtype) === m[1]
    if (f === 'eapol') return !!fr.eapol
    if (f === 'eap') return !!fr.eap
    if (f === 'radius') return !!fr.radius
    if (f === 'wps') return !!fr.wps || !!fr.wps_attrs
    const ssidMatch = /^wlan\.ssid==(.+)$/.exec(f)
    if (ssidMatch) return fr.ssid === ssidMatch[1]
    return true
  }
  const evaluable =
    !f ||
    /^wlan\.fc\.type_subtype==\d+$/.test(f) ||
    ['eapol', 'eap', 'radius', 'wps'].includes(f) ||
    /^wlan\.ssid==.+$/.test(f)
  const frames = (json.frames as any[])
    .filter(supported)
    .map(fr => ({ ...fr, summary: fr.summary || frameSummary(fr) }))
  const note = evaluable
    ? json.note
    : `Filter "${f}" is only evaluated by the local parser API; the bundled offline dataset shows all frames.`
  return { ...json, filter: evaluable ? f : '', frames, note }
}

export function PcapInspector(props: Props) {
  return <CaptureInspector key={JSON.stringify([props.pcapId, props.initialFilter || ''])} {...props} />
}

function CaptureInspector({ pcapId, initialFilter = '', onFrameSelect }: Props) {
  const detailId = useId()
  const detailRef = useRef<HTMLDivElement>(null)
  const frameTrigger = useRef<HTMLButtonElement | null>(null)
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const [appliedFilter, setAppliedFilter] = useState(initialFilter)
  const [pendingFilter, setPendingFilter] = useState(initialFilter)
  const [data, setData] = useState<PcapData | null>(null)
  const [filter, setFilter] = useState(initialFilter)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null)

  const fetchData = useCallback(async (f: string) => {
    const generation = ++request.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const current = () => generation === request.current && !abort.signal.aborted
    setLoading(true)
    setPendingFilter(f)
    setError(null)
    setSelectedFrame(null)
    // Keep the last result visible and explicitly labelled while filtering. Controls
    // remain mounted, so focus and rapid filter changes don't disappear with a spinner.
    const publish = (result: PcapData, applied = f) => {
      if (!current()) return
      setData(result)
      setAppliedFilter(applied)
    }
    try {
      const params = new URLSearchParams()
      if (f) params.set('filter', f)
      const res = await apiFetch(`/api/pcaps/${encodeURIComponent(pcapId)}/analyze?${params.toString()}`, { signal: abort.signal })
      if (!res.ok) {
        await discardResponseBody(res)
        throw new Error(`parser API responded ${res.status}`)
      }
      publish(await res.json())
    } catch (apiError: any) {
      if (!current()) return
      try {
        const bundled = await fetch(`${import.meta.env.BASE_URL}lab-data/${pcapId}.json`, { signal: abort.signal })
        if (!bundled.ok) throw new Error(`bundled dataset responded ${bundled.status}`)
        const filtered = applyDisplayFilter((await bundled.json()) as PcapData, f)
        publish(filtered, filtered.filter || '')
      } catch (bundledError: any) {
        if (current()) setError(`No new analysis available for ${pcapId}. The local parser API is not reachable (${apiError.message}) and no bundled dataset was found (${bundledError.message}).`)
      }
    } finally {
      if (current()) setLoading(false)
    }
  }, [pcapId])

  const cancelRequests = useCallback(() => { request.current++; controller.current?.abort() }, [])
  useEffect(() => {
    fetchData(initialFilter)
    return cancelRequests
  }, [fetchData, initialFilter, cancelRequests])

  const inspect = (frame: Frame, trigger?: HTMLButtonElement | null) => {
    if (loading) return
    if (trigger) frameTrigger.current = trigger
    setSelectedFrame(frame)
    onFrameSelect?.(frame)
  }

  const handleFilterApply = () => {
    fetchData(filter)
  }

  const handlePreset = (value: string) => {
    setFilter(value)
    fetchData(value)
  }

  if (!loading && !data) {
    return (
      <div className="sc-technical-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[var(--attention)]" />
        </div>
        <div className="text-[13px] text-[var(--ink-secondary)] font-medium">No analysis available for {pcapId}</div>
        <div className="text-[11.5px] text-[var(--ink-muted)] mt-2 max-w-[520px] mx-auto leading-relaxed">{error}</div>
        <button onClick={() => fetchData(filter)} className="mt-4 px-4 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[12px] text-[var(--ink-secondary)] hover:border-[var(--line-strong)] transition-colors">
          Retry
        </button>
      </div>
    )
  }

  if (loading && !data) {
    return <LoadingPanel label="Reading capture evidence" detail={`${pcapId}.pcapng · local parser, then bundled offline analysis`} />
  }

  return (
    <div className="sc-technical-surface sc-packet-inspector space-y-4">
      {/* Summary Bar */}
      <div
        className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition"
      >

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[var(--learning)]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                  <span className="text-[13px] font-bold text-[var(--ink-primary)] font-mono">{pcapId}.pcapng</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]  shadow-soft" />
                </div>
                <div className="text-[11px] text-[var(--ink-muted)] font-mono flex items-center gap-2">
                  <span>Method: {data?.method}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
                  <span>{data?.summary.total_frames} frames</span>
                  <span className="hidden sm:inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[10px] text-[var(--learning)]">
                    <Activity className="w-3 h-3" />
                    {(data?.method === 'wififorge-labkit' || data?.method === 'platform-labkit' || data?.method === 'platform-labkit (legacy wififorge-labkit)') ? 'OFFLINE DATASET' : 'PARSER API'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              {data && (
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-medium backdrop-blur-sm tracking-widest ${
                  (data.method === 'wififorge-labkit' || data.method === 'platform-labkit' || data.method === 'platform-labkit (legacy wififorge-labkit)')
                    ? 'bg-[var(--accent-bg)] text-[var(--learning)] border-[var(--accent-border)]'
                    : 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)] shadow-soft'
                }`}>
                  {(data.method === 'wififorge-labkit' || data.method === 'platform-labkit' || data.method === 'platform-labkit (legacy wififorge-labkit)') ? 'BUNDLED DATASET' : 'LOCAL PARSER API'}
                </span>
              )}
              {error && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--warning-bg)] text-[var(--attention)] border border-[var(--warning-border)] flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3" /> NOT AVAILABLE
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] sc-technical-transition group/card">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] mb-1.5 uppercase tracking-widest font-semibold"><Wifi className="w-3 h-3" /> SSIDs</div>
              <div className="text-[12px] font-mono text-[var(--ink-primary)] truncate group-hover/card:text-[var(--ink-primary)] transition-colors">{data?.summary.ssids.join(', ') || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] sc-technical-transition group/card">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] mb-1.5 uppercase tracking-widest font-semibold"><Hash className="w-3 h-3" /> BSSIDs</div>
              <div className="text-[11px] font-mono text-[var(--ink-primary)] truncate group-hover/card:text-[var(--ink-primary)] transition-colors">{data?.summary.bssids.slice(0,2).join(', ') || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] sc-technical-transition group/card">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] mb-1.5 uppercase tracking-widest font-semibold"><Users className="w-3 h-3" /> Clients</div>
              <div className="text-[11px] font-mono text-[var(--ink-primary)] group-hover/card:text-[var(--ink-primary)] transition-colors">{data?.summary.clients?.length || 0} observed clients</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] sc-technical-transition group/card">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] mb-1.5 uppercase tracking-widest font-semibold"><Zap className="w-3 h-3" /> Stats</div>
              <div className="text-[11px] text-[var(--ink-secondary)] font-mono leading-relaxed group-hover/card:text-[var(--ink-primary)] transition-colors">
                <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[var(--action-fill)]" />{data?.summary.beacons} beacons</span>
                <span className="mx-1 text-[var(--ink-muted)]">•</span>
                <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[var(--owner)]" />{data?.summary.probes} probes</span>
                <span className="mx-1 text-[var(--ink-muted)]">•</span>
                <span className="inline-flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[var(--attention)]" />{data?.summary.eapol} EAPOL</span>
                {(data?.summary.deauth||0)>0 && <><span className="mx-1 text-[var(--ink-muted)]">•</span><span className="text-[var(--danger)]">{data?.summary.deauth} deauth</span></>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] backdrop-blur-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="w-4 h-4 text-[var(--ink-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 group-hover:text-[var(--ink-muted)] transition-colors" />
            <input
              aria-label="Packet display filter"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilterApply()}
              placeholder="Wireshark display filter, e.g., wlan.fc.type_subtype==8, eapol, wlan.ssid==LAB-WIFI"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[12px] font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:border-[var(--accent-border)] focus:bg-[var(--panel-inset)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition"
            />
          </div>
          <button
            onClick={handleFilterApply}
            className="px-5 py-2.5 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[12px] font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:bg-[var(--panel-raised)] hover:text-[var(--ink-primary)] flex items-center gap-2 sc-technical-transition shadow-soft"
          >
            <Filter className="w-4 h-4" />
            Apply Filter
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {filterPresets.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.value)}
              aria-pressed={appliedFilter === preset.value && !loading}
              className={`sc-technical-choice px-3 py-1.5 rounded-full text-[11px] font-medium border sc-technical-transition ${
                appliedFilter === preset.value && !loading
                  ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--learning)] shadow-soft'
                  : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] hover:border-[var(--line-strong)] hover:bg-[var(--panel-inset)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <p className="sc-technical-status" role="status">{loading
        ? `Updating filter “${pendingFilter || 'All'}”. Previous results remain visible; inspection is paused. Previously applied: ${appliedFilter || 'All'}.`
        : `Showing ${data?.frames.length ?? 0} frames · applied filter: ${appliedFilter || 'All'}.`}</p>
      {error && <div className="ws-notice ws-notice-error" role="alert"><p>{error} Previous results are unchanged.</p><button type="button" className="ws-action ws-action-secondary" onClick={handleFilterApply}>Retry filter</button></div>}

      {data?.note && (
        <div className="rounded-2xl bg-[var(--warning-bg)] border border-[var(--warning-border)] p-3.5 text-[11.5px] text-[var(--attention)] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{data.note} Start the local parser API (<span className="font-mono">uvicorn app.main:app --reload</span> in <span className="font-mono">backend/</span>) for full display-filter support.</span>
        </div>
      )}

      {/* Frames Table */}
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden hover:border-[var(--line-strong)] sc-technical-transition">
        <div className="p-4 border-b border-[var(--line-normal)] bg-[var(--panel-inset)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--ink-primary)]">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
              <FileCode className="w-4 h-4 text-[var(--learning)]" />
            </div>
            Frames
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] font-mono text-[var(--ink-secondary)]">{data?.frames.length} shown</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-muted)]">
            Click to inspect • {(data?.method === 'wififorge-labkit' || data?.method === 'platform-labkit' || data?.method === 'platform-labkit (legacy wififorge-labkit)') ? 'bundled offline dataset' : 'local parser API'}
          </div>
        </div>
        <div className="ws-pcap-cards" aria-label="Capture frames" inert={loading} aria-busy={loading}>
          {data?.frames.map(frame => <details key={frame.number} open={selectedFrame?.number === frame.number} onToggle={event => { if (event.currentTarget.open) inspect(frame); else if (selectedFrame?.number === frame.number) setSelectedFrame(null) }}>
            <summary>Frame {frame.number} · {frame.subtype_name}<span>{frame.ssid || 'No SSID'} · Channel {frame.channel || '—'}</span></summary>
            <dl>{[['BSSID', frame.bssid], ['Source', frame.sa], ['Destination', frame.da], ['Summary', frame.summary || frameSummary(frame)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
            <CopyButton text={JSON.stringify(frame, null, 2)} label="Copy frame details" />
          </details>)}
        </div>
        <div className="ws-pcap-table" inert={loading} aria-busy={loading}><ScrollRegion label="Capture frames — scroll horizontally for all columns">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--panel-inset)] border-b border-[var(--line-normal)] text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">
                <th scope="col" className="text-left p-3 font-semibold">No</th>
                <th scope="col" className="text-left p-3 font-semibold">Type</th>
                <th scope="col" className="text-left p-3 font-semibold">SSID / Info</th>
                <th scope="col" className="text-left p-3 font-semibold">BSSID / SA</th>
                <th scope="col" className="text-left p-3 font-semibold">Ch</th>
                <th scope="col" className="text-left p-3 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody>
              {data?.frames.map(frame => (
                <tr
                  key={frame.number}
                  onClick={event => inspect(frame, event.currentTarget.querySelector('button'))}
                  className={`border-b border-[var(--line-normal)] hover:bg-[var(--panel-raised)] cursor-pointer sc-technical-transition group/row ${selectedFrame?.number === frame.number ? 'bg-[var(--panel-raised)] border-[var(--accent-border)]' : ''}`}
                >
                  <td className="p-3"><button type="button" className="ws-frame-button" aria-label={`Inspect frame ${frame.number}`} aria-pressed={selectedFrame?.number === frame.number} aria-controls={selectedFrame ? detailId : undefined} disabled={loading} onClick={event => { event.stopPropagation(); inspect(frame, event.currentTarget) }}>{frame.number}</button></td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium border tracking-widest backdrop-blur-sm ${
                      frame.subtype_name.includes('Beacon') ? 'bg-[var(--accent-bg)] text-[var(--learning)] border-[var(--accent-border)]' :
                      frame.subtype_name.includes('Probe') ? 'bg-[var(--owner-bg)] text-[var(--owner)] border-[var(--owner-border)]' :
                      frame.subtype_name.includes('EAPOL') ? 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]' :
                      frame.subtype_name.includes('Deauth') ? 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]' :
                      frame.subtype_name.includes('Disassoc') ? 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]' :
                      frame.subtype_name.includes('Assoc') ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]' :
                      'bg-[var(--panel-raised)] text-[var(--ink-secondary)] border-[var(--line-strong)]'
                    }`}>
                      {frame.subtype_name}{frame.reason ? ` R${frame.reason}` : ''}{frame.wps ? ' WPS' : ''}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[var(--ink-secondary)] whitespace-nowrap group-hover/row:text-[var(--ink-primary)] transition-colors">{frame.ssid || '—'}</td>
                  <td className="p-3 font-mono text-[11px] text-[var(--ink-muted)] whitespace-nowrap group-hover/row:text-[var(--ink-secondary)] transition-colors">{frame.bssid || frame.sa || '—'}</td>
                  <td className="p-3 font-mono text-[var(--ink-muted)]">{frame.channel || '—'}</td>
                  <td className="p-3 text-[var(--ink-secondary)] min-w-[240px] group-hover/row:text-[var(--ink-secondary)] transition-colors">{frame.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion></div>

        {data?.frames.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-[var(--ink-muted)]" />
            </div>
            <div className="text-[13px] text-[var(--ink-secondary)]">No frames match filter "{filter}"</div>
            <div className="text-[11px] text-[var(--ink-secondary)] mt-1 font-mono">Try a different Wireshark display filter</div>
          </div>
        )}
      </div>

      {selectedFrame && <div className="ws-pcap-table"><button type="button" className="ws-action ws-action-secondary" onClick={() => { detailRef.current?.focus({ preventScroll: true }); detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }}>Go to selected frame details</button></div>}
      {/* Frame Detail */}
      <>
        {selectedFrame && (
          <div
            ref={detailRef} id={detailId} tabIndex={-1} role="region" aria-label={`Frame ${selectedFrame.number} details`}
            className="ws-pcap-detail sc-technical-detail rounded-2xl bg-[var(--panel-bg)] border border-[var(--accent-border)] p-5 relative overflow-hidden shadow-soft"
          >

            <SelectionMarker value={selectedFrame.number} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-[var(--learning)]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[var(--ink-primary)]">Frame {selectedFrame.number} — {selectedFrame.subtype_name}</div>
                    <div className="text-[11px] text-[var(--ink-muted)] font-mono">Detailed inspection • Evidence collection</div>
                  </div>
                </div>
                <button type="button" aria-label="Close frame details" onClick={() => { setSelectedFrame(null); frameTrigger.current?.focus({ preventScroll: true }) }} className="w-8 h-8 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] sc-technical-transition text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-semibold">SSID</div>
                  <div className="font-mono text-[12px] text-[var(--ink-primary)] mt-1.5">{selectedFrame.ssid || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-semibold">BSSID</div>
                  <div className="font-mono text-[12px] text-[var(--ink-primary)] mt-1.5">{selectedFrame.bssid || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-semibold">SA / Client</div>
                  <div className="font-mono text-[12px] text-[var(--ink-primary)] mt-1.5">{selectedFrame.sa || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] backdrop-blur-sm">
                  <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest font-semibold">Channel</div>
                  <div className="font-mono text-[12px] text-[var(--ink-primary)] mt-1.5">{selectedFrame.channel || '—'}</div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                {selectedFrame.summary || frameSummary(selectedFrame)}
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  )
}
