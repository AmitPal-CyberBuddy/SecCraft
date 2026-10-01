import { UnsavedChangesGuard } from '@/components/common/UnsavedChangesGuard'
import { ViewSwitcher, Notice } from '@/components/common/Controls'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useRef, useState } from 'react'
import { FileText, Download, Save, Sparkles, Shield } from 'lucide-react'

interface Finding {
  title: string
  severity: string
  description: string
  technicalDetails: string
  affectedComponent: string
  evidence: string
  impact: string
  recommendation: string
  references: string
  retest: string
}

/**
 * The editor starts empty on purpose: a report containing someone else's sample BSSID and findings is
 * the fastest way to send a wrong report. "Load worked example" fills the form from the capture that
 * actually ships in this build (public/pcaps/beacon-only.pcapng, decoded in public/lab-data/), so the
 * example values are demonstrably true for that file.
 */
const emptyFinding: Finding = {
  title: '',
  severity: 'Medium',
  description: '',
  technicalDetails: '',
  affectedComponent: '',
  evidence: '',
  impact: '',
  recommendation: '',
  references: '',
  retest: '',
}

interface LabFrame {
  number: number
  ssid?: string
  bssid?: string
  channel?: number
  akm_names?: string[]
  cipher_names?: string[]
  mfpc?: boolean
  mfpr?: boolean
}

function readSavedFinding(): Finding {
  try {
    const raw = localStorage.getItem('platform-report-draft') ?? localStorage.getItem('wififorge-report-draft')
    if (!raw) return emptyFinding
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Object.keys(emptyFinding).some(key => typeof parsed[key] !== 'string')) return emptyFinding
    return parsed as unknown as Finding
  } catch { return emptyFinding }
}

export function ReportEditor() {
  const [finding, setFinding] = useState<Finding>(readSavedFinding)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(readSavedFinding()))
  const [saveMessage, setSaveMessage] = useState('')
  const dirty = JSON.stringify(finding) !== savedSnapshot

  const latestFinding = useRef(finding)
  const latestSaved = useRef(savedSnapshot)
  const exampleRequest = useRef<AbortController | null>(null)
  useEffect(() => () => exampleRequest.current?.abort(), [])
  const [preview, setPreview] = useState(false)
  const [exampleState, setExampleState] = useState<'idle' | 'loading' | 'error'>('idle')

  /** Fill the form from the real beacon-only.pcapng in this build — no invented values. */
  const loadWorkedExample = async () => {
    if (exampleRequest.current) return
    const controller = new AbortController()
    exampleRequest.current = controller
    const startedSnapshot = JSON.stringify(latestFinding.current)
    setExampleState('loading')
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}lab-data/beacon-only.json`, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { frames: LabFrame[] }
      const beacon = data.frames.find(f => f.bssid) || data.frames[0]
      const akms = beacon.akm_names?.join(' + ') || 'none advertised'
      const ciphers = beacon.cipher_names?.join(' + ') || 'none advertised'
      const pmf = beacon.mfpr ? 'required (MFPR=1)' : beacon.mfpc ? 'capable only (MFPC=1, MFPR=0)' : 'not advertised'
      if (controller.signal.aborted) return
      if (JSON.stringify(latestFinding.current) !== startedSnapshot) {
        setSaveMessage('The worked example was not applied because you edited the finding while it loaded. Your edits are preserved.')
        setExampleState('idle'); return
      }
      if (JSON.stringify(latestFinding.current) !== latestSaved.current && !window.confirm('Replace unsaved finding changes with the worked example?')) { setExampleState('idle'); return }
      const example: Finding = {
        title: `PMF capable but not required on ${beacon.ssid || '(hidden SSID)'}`,
        severity: 'Medium',
        description: `The beacon for ${beacon.ssid || '(hidden)'} (BSSID ${beacon.bssid}, channel ${beacon.channel}) advertises RSN with ${akms} / ${ciphers} and PMF ${pmf}. The beacon alone does not establish whether a client negotiated PMF or whether spoofed management frames affected a client.`,
        technicalDetails: `Decoded from beacon-only.pcapng frame ${beacon.number}: RSNE AKM list ${akms}, pairwise/group ciphers ${ciphers}, RSN capabilities MFPC=${beacon.mfpc ? 1 : 0} MFPR=${beacon.mfpr ? 1 : 0}. The capture is a passive beacon sample, so no client authentication is present in it.`,
        affectedComponent: `SSID: ${beacon.ssid || '(hidden)'}, BSSID: ${beacon.bssid}, Channel: ${beacon.channel}`,
        evidence: `PCAP: beacon-only.pcapng (SHA-256 in frontend/public/pcaps/MANIFEST.md)\nFrame ${beacon.number} Beacon — SSID ${beacon.ssid || '(empty)'}, BSSID ${beacon.bssid}, Ch ${beacon.channel}\nDisplay filter: wlan.fc.type_subtype==8 && wlan.rsn.capabilities\nLimit of this evidence: PMF capability is read from the beacon; whether clients negotiate PMF requires the association frames.`,
        impact: 'Potential availability risk if an associated client does not negotiate PMF; this passive beacon sample does not demonstrate client impact.',
        recommendation: 'If clients support it, set ieee80211w=2 (PMF required) in hostapd; otherwise document the capability gap and the compensating controls (WIDS, MFP-capable clients, WPA3-only where possible).',
        references: 'IEEE 802.11-2020 §9.4.2.24 (RSN capabilities), hostapd.conf ieee80211w, NIST SP 800-153',
        retest: 'Re-capture a beacon and an association exchange after the change: MFPR must be 1 and the association response must show PMF negotiated; confirm a spoofed deauth no longer terminates the session in the RF lab.',
      }
      latestFinding.current = example
      setFinding(example)
      setExampleState('idle')
    } catch {
      if (!controller.signal.aborted) setExampleState('error')
    } finally { exampleRequest.current = null }
  }

  const update = (field: keyof Finding, value: string) => {
    setSaveMessage('')
    const next = { ...latestFinding.current, [field]: value }
    latestFinding.current = next
    setFinding(next)
  }

  const markdown = `# Finding: ${finding.title}

**Severity:** ${finding.severity}

## Description
${finding.description}

## Technical Details
${finding.technicalDetails}

## Affected Component
${finding.affectedComponent}

## Evidence
\`\`\`
${finding.evidence}
\`\`\`

## Impact
${finding.impact}

## Recommendation
${finding.recommendation}

## References
${finding.references}

## Retest Result
${finding.retest}

---
*Generated via SecCraft — Learn. Practice. Investigate. Improve.*
`

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finding-${finding.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    setSaveMessage(`Download requested: ${a.download}. Your browser chooses where to save it; this does not submit the finding for review.`)
  }

  const save = () => {
    try {
      localStorage.setItem('platform-report-draft', JSON.stringify(finding))
      localStorage.setItem('wififorge-report-draft', JSON.stringify(finding))
      latestSaved.current = JSON.stringify(finding)
      setSavedSnapshot(latestSaved.current)
      setSaveMessage('Draft saved in this browser only. It is not synced to your account or independently reviewed.')
    } catch {
      setSaveMessage('Could not save in this browser. Export the draft before leaving this page.')
    }
  }

  return (
    <div className="sc-technical-surface ws-report-editor space-y-5">
      <UnsavedChangesGuard when={dirty} message="Your finding has unsaved changes. Leave without saving?" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--owner)]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-[16px] text-[var(--ink-primary)]">Finding Editor</h3>
            <p className="text-sm text-[var(--ink-muted)] font-mono">VAPT finding structure • your words, your evidence</p>
          </div>
        </div>
        <div className="ws-tool-actions">
          <ViewSwitcher label="Finding view" value={preview ? 'preview' : 'edit'} onChange={value => setPreview(value === 'preview')} options={[{ id: 'edit', label: 'Edit' }, { id: 'preview', label: 'Preview' }]} />
          <button
            onClick={loadWorkedExample}
            disabled={exampleState === 'loading'}
            title="Fill the form from the beacon-only.pcapng that ships with this build"
            className="px-4 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--panel-raised)] flex items-center gap-2 sc-technical-transition"
          >
            <Sparkles className="w-4 h-4" />
            {exampleState === 'loading' ? 'Loading…' : exampleState === 'error' ? 'Example unavailable' : 'Load worked example (lab data)'}
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--panel-raised)] flex items-center gap-2 sc-technical-transition"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button
            onClick={download}
            className="ws-action"
          >
            <Download className="w-4 h-4" /> Export MD
          </button>
        </div>
      </div>

      <Notice live>{saveMessage || (dirty ? 'Unsaved changes in this browser. Save or export before leaving.' : 'Draft loaded from this browser or ready to edit.')}</Notice>
          <div
            hidden={preview} inert={preview}
            key="edit"
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 space-y-4 hover:border-[var(--line-strong)] sc-technical-transition">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink-secondary)] uppercase tracking-widest">
                  <div className="w-5 h-5 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
                    <FileText className="w-3 h-3 text-[var(--learning)]" />
                  </div>
                  Basic Info
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="finding-title" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Title</label>
                    <input id="finding-title" value={finding.title} onChange={e => update('title', e.target.value)} placeholder="Finding title — state the weakness, not the tool" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:bg-[var(--panel-inset)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition" />
                  </div>
                  <div>
                    <label htmlFor="finding-severity" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Severity</label>
                    <select id="finding-severity" value={finding.severity} onChange={e => update('severity', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="finding-description" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Description</label>
                  <textarea id="finding-description" value={finding.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="What is the weakness, on which BSSID/SSID, observed how?" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none resize-none hover:border-[var(--line-strong)] sc-technical-transition leading-relaxed" />
                </div>

                <div>
                  <label htmlFor="finding-technical-details" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Technical Details</label>
                  <textarea id="finding-technical-details" value={finding.technicalDetails} onChange={e => update('technicalDetails', e.target.value)} rows={3} placeholder="Protocol detail: frame numbers, fields, config lines" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none resize-none hover:border-[var(--line-strong)] sc-technical-transition leading-relaxed" />
                </div>

                <div>
                  <label htmlFor="finding-affected-component" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Affected Component</label>
                  <input id="finding-affected-component" value={finding.affectedComponent} onChange={e => update('affectedComponent', e.target.value)} placeholder="SSID / BSSID / channel / hostapd.conf line" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm font-mono text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 space-y-4 hover:border-[var(--line-strong)] sc-technical-transition">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink-secondary)] uppercase tracking-widest">
                  <div className="w-5 h-5 rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                    <Shield className="w-3 h-3 text-[var(--success)]" />
                  </div>
                  Evidence & Remediation
                </div>

                <div>
                  <label htmlFor="finding-evidence" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Evidence</label>
                  <textarea id="finding-evidence" value={finding.evidence} onChange={e => update('evidence', e.target.value)} rows={4} placeholder="Artifact + SHA-256 + filter + frame numbers + what it does NOT prove" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm font-mono text-[var(--ink-secondary)] focus:border-[var(--accent-border)] focus:outline-none resize-none hover:border-[var(--line-strong)] sc-technical-transition leading-relaxed" />
                </div>

                <div>
                  <label htmlFor="finding-impact" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Impact</label>
                  <textarea id="finding-impact" value={finding.impact} onChange={e => update('impact', e.target.value)} rows={2} placeholder="What an attacker gains — data, access, availability" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none resize-none hover:border-[var(--line-strong)] sc-technical-transition leading-relaxed" />
                </div>

                <div>
                  <label htmlFor="finding-recommendation" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Recommendation</label>
                  <textarea id="finding-recommendation" value={finding.recommendation} onChange={e => update('recommendation', e.target.value)} rows={2} placeholder="Exact change plus the standard/property it maps to" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-primary)] focus:border-[var(--accent-border)] focus:outline-none resize-none hover:border-[var(--line-strong)] sc-technical-transition leading-relaxed" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="finding-references" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">References</label>
                    <input id="finding-references" value={finding.references} onChange={e => update('references', e.target.value)} placeholder="Spec section, vendor doc, framework control" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-secondary)] focus:border-[var(--accent-border)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition" />
                  </div>
                  <div>
                    <label htmlFor="finding-retest" className="text-sm font-medium text-[var(--ink-muted)] uppercase tracking-widest">Retest</label>
                    <input id="finding-retest" value={finding.retest} onChange={e => update('retest', e.target.value)} placeholder="The exact check that proves the fix (command, filter, expected output)" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-sm text-[var(--ink-secondary)] focus:border-[var(--accent-border)] focus:outline-none hover:border-[var(--line-strong)] sc-technical-transition" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        {preview && (
          <div
            key="preview"
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition"
          >

            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[var(--owner)]" />
                </div>
                <span className="text-sm font-bold text-[var(--ink-primary)]">Finding preview</span>
                <span className="ml-auto text-sm px-2.5 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono">Unverified draft</span>
              </div>
              <div className="ws-reading-prose ws-report-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: ({ children }) => <pre tabIndex={0}>{children}</pre>, table: ({ children }) => <table tabIndex={0} aria-label="Finding data table">{children}</table> }}>{markdown}</ReactMarkdown></div>
            </div>
          </div>
        )}

      <div className="rounded-2xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[var(--learning)]" />
          </div>
          <div className="text-sm text-[var(--ink-muted)] leading-relaxed">
            <span className="font-bold text-[var(--ink-secondary)]">Template:</span> Title, Severity, Description, Technical Details, Affected Component, Evidence, Impact, Recommendation, References, Retest — Professional VAPT structure. Export as MD for report. Always include PCAP frame numbers, config snippets, BSSID, SSID, channel for reproducibility.
          </div>
        </div>
      </div>
    </div>
  )
}
