import { useState } from 'react'
import { FileText, Download, Save, Eye, Code, Sparkles, Shield, Target, Award, CheckCircle, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

export function ReportEditor() {
  const [finding, setFinding] = useState<Finding>(emptyFinding)
  const [preview, setPreview] = useState(false)
  const [exampleState, setExampleState] = useState<'idle' | 'loading' | 'error'>('idle')

  /** Fill the form from the real beacon-only.pcapng in this build — no invented values. */
  const loadWorkedExample = async () => {
    setExampleState('loading')
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}lab-data/beacon-only.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { frames: LabFrame[] }
      const beacon = data.frames.find(f => f.bssid) || data.frames[0]
      const akms = beacon.akm_names?.join(' + ') || 'none advertised'
      const ciphers = beacon.cipher_names?.join(' + ') || 'none advertised'
      const pmf = beacon.mfpr ? 'required (MFPR=1)' : beacon.mfpc ? 'capable only (MFPC=1, MFPR=0)' : 'not advertised'
      setFinding({
        title: `PMF capable but not required on ${beacon.ssid || '(hidden SSID)'}`,
        severity: 'Medium',
        description: `The beacon for ${beacon.ssid || '(hidden)'} (BSSID ${beacon.bssid}, channel ${beacon.channel}) advertises RSN with ${akms} / ${ciphers} and PMF ${pmf}. Because management frames are not protected, deauthentication and disassociation frames can be spoofed against clients of this BSS.`,
        technicalDetails: `Decoded from beacon-only.pcapng frame ${beacon.number}: RSNE AKM list ${akms}, pairwise/group ciphers ${ciphers}, RSN capabilities MFPC=${beacon.mfpc ? 1 : 0} MFPR=${beacon.mfpr ? 1 : 0}. The capture is a passive beacon sample, so no client authentication is present in it.`,
        affectedComponent: `SSID: ${beacon.ssid || '(hidden)'}, BSSID: ${beacon.bssid}, Channel: ${beacon.channel}`,
        evidence: `PCAP: beacon-only.pcapng (SHA-256 in frontend/public/pcaps/MANIFEST.md)\nFrame ${beacon.number} Beacon — SSID ${beacon.ssid || '(empty)'}, BSSID ${beacon.bssid}, Ch ${beacon.channel}\nDisplay filter: wlan.fc.type_subtype==8 && wlan.rsn.capabilities\nLimit of this evidence: PMF capability is read from the beacon; whether clients negotiate PMF requires the association frames.`,
        impact: 'Spoofed deauthentication/disassociation frames can disrupt client connectivity (availability impact) and are used to force handshake capture during an authorised test.',
        recommendation: 'If clients support it, set ieee80211w=2 (PMF required) in hostapd; otherwise document the capability gap and the compensating controls (WIDS, MFP-capable clients, WPA3-only where possible).',
        references: 'IEEE 802.11-2020 §9.4.2.24 (RSN capabilities), hostapd.conf ieee80211w, NIST SP 800-153',
        retest: 'Re-capture a beacon and an association exchange after the change: MFPR must be 1 and the association response must show PMF negotiated; confirm a spoofed deauth no longer terminates the session in the RF lab.',
      })
      setExampleState('idle')
    } catch {
      setExampleState('error')
    }
  }

  const update = (field: keyof Finding, value: string) => {
    setFinding({...finding, [field]: value})
  }

  const markdown = `# Finding: ${finding.title}

**Severity:** ${finding.severity}
**Module:** Wi-Fi Fundamentals
**Type:** Wireless Configuration

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
  }

  const save = () => {
    try { localStorage.setItem('platform-report-draft', JSON.stringify(finding)); localStorage.setItem('wififorge-report-draft', JSON.stringify(finding)) } catch { /* storage blocked */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-[16px] text-slate-100">Finding Editor</h3>
            <p className="text-[11px] text-slate-500 font-mono">VAPT finding structure • your words, your evidence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPreview(!preview)}
            className={`px-4 py-2 rounded-xl border text-[12px] font-medium flex items-center gap-2 transition-all duration-200 ${
              preview 
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-glow-cyan' 
                : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#25354f]'
            }`}
          >
            {preview ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            {preview ? 'Preview' : 'Edit'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loadWorkedExample}
            title="Fill the form from the beacon-only.pcapng that ships with this build"
            className="px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:text-slate-100 hover:bg-[#25354f] flex items-center gap-2 transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            {exampleState === 'loading' ? 'Loading…' : exampleState === 'error' ? 'Example unavailable' : 'Load worked example (lab data)'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={save}
            className="px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:text-slate-100 hover:bg-[#25354f] flex items-center gap-2 transition-all duration-200"
          >
            <Save className="w-4 h-4" /> Save
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={download}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white text-[12px] font-bold flex items-center gap-2 shadow-glow-cyan hover:shadow-glow-violet transition-all duration-300"
          >
            <Download className="w-4 h-4" /> Export MD
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 space-y-4 hover:border-[#334155]/60 transition-all duration-300">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-5 h-5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-cyan-400" />
                  </div>
                  Basic Info
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Title</label>
                    <input value={finding.title} onChange={e => update('title', e.target.value)} placeholder="Finding title — state the weakness, not the tool" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:bg-[#0a1020] focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Severity</label>
                    <select value={finding.severity} onChange={e => update('severity', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Description</label>
                  <textarea value={finding.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="What is the weakness, on which BSSID/SSID, observed how?" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Technical Details</label>
                  <textarea value={finding.technicalDetails} onChange={e => update('technicalDetails', e.target.value)} rows={3} placeholder="Protocol detail: frame numbers, fields, config lines" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Affected Component</label>
                  <input value={finding.affectedComponent} onChange={e => update('affectedComponent', e.target.value)} placeholder="SSID / BSSID / channel / hostapd.conf line" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[12px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 space-y-4 hover:border-[#334155]/60 transition-all duration-300">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-emerald-400" />
                  </div>
                  Evidence & Remediation
                </div>
                
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Evidence</label>
                  <textarea value={finding.evidence} onChange={e => update('evidence', e.target.value)} rows={4} placeholder="Artifact + SHA-256 + filter + frame numbers + what it does NOT prove" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] font-mono text-slate-300 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Impact</label>
                  <textarea value={finding.impact} onChange={e => update('impact', e.target.value)} rows={2} placeholder="What an attacker gains — data, access, availability" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Recommendation</label>
                  <textarea value={finding.recommendation} onChange={e => update('recommendation', e.target.value)} rows={2} placeholder="Exact change plus the standard/property it maps to" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">References</label>
                    <input value={finding.references} onChange={e => update('references', e.target.value)} placeholder="Spec section, vendor doc, framework control" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] text-slate-400 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Retest</label>
                    <input value={finding.retest} onChange={e => update('retest', e.target.value)} placeholder="The exact check that proves the fix (command, filter, expected output)" className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] text-slate-400 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-8 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-[13px] font-bold text-slate-200">Markdown Preview</span>
                <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">Professional Report</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[12px] text-slate-300 leading-relaxed p-6 rounded-xl bg-[#020617] border border-[#1e293b]/60 overflow-x-auto scrollbar-thin">{markdown}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-400">Template:</span> Title, Severity, Description, Technical Details, Affected Component, Evidence, Impact, Recommendation, References, Retest — Professional VAPT structure. Export as MD for report. Always include PCAP frame numbers, config snippets, BSSID, SSID, channel for reproducibility.
          </div>
        </div>
      </div>
    </div>
  )
}
