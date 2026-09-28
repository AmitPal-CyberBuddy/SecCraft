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

const defaultFinding: Finding = {
  title: "Insecure Wi-Fi Configuration: WPS Enabled + PMF Disabled",
  severity: "Medium",
  description: "The wireless network LAB-WIFI (BSSID AA:BB:CC:DD:EE:FF, Channel 6) is configured with WPS enabled and PMF disabled. WPS introduces PIN brute-force risk (11k max), PMF disabled allows deauthentication spoofing.",
  technicalDetails: "WPS PIN 8-digit with halves flaw: first half 10^4 + second half 10^3 = 11k max, not 10^8. WPS IE 221 OUI 00:50:F2:04 present in beacon. PMF (802.11w) disabled, management frames unauthenticated, attacker can spoof deauth.",
  affectedComponent: "SSID: LAB-WIFI, BSSID: AA:BB:CC:DD:EE:FF, Channel: 6, Band: 2.4GHz, Security: WPA2-PSK CCMP",
  evidence: "PCAP: beacon-only.pcapng Frame 1 Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Open\nConfig: hostapd.conf wps_state=2, ieee80211w=0, ht_capab 40MHz\nWireshark: wlan.fc.type_subtype==8, wps filter shows WPS IE",
  impact: "WPS PIN brute-force → PSK recovery → network access. PMF disabled → DoS via deauth flood, handshake capture facilitation, Evil Twin facilitation. 40MHz in 2.4GHz → interference, bad practice.",
  recommendation: "Disable WPS: wps_state=0. Enable PMF required: ieee80211w=2. Use 20MHz only in 2.4GHz: ht_capab=[HT20]. Strong PSK 20+ chars random, not in wordlists. Consider WPA3-only with SAE and PMF required.",
  references: "802.11-2020 spec, OWASP Wireless, NIST SP 800-153, hostapd docs",
  retest: "After fix: Verify beacon no WPS IE (filter wps), verify RSN capabilities MFPR=1 PMF required, verify 20MHz only, verify offline audit with authorized wordlist fails, verify deauth spoof fails (hardware lab).",
}

export function ReportEditor() {
  const [finding, setFinding] = useState<Finding>(defaultFinding)
  const [preview, setPreview] = useState(false)

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
*Generated via WiFiForge — Forge. Break. Fix. Retest.*
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
    try { localStorage.setItem('wififorge-report-draft', JSON.stringify(finding)) } catch {}
    alert('Draft saved to localStorage')
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
            <p className="text-[11px] text-slate-500 font-mono">Professional Wireless Report • VAPT structure</p>
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
                    <input value={finding.title} onChange={e => update('title', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:bg-[#0a1020] focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
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
                  <textarea value={finding.description} onChange={e => update('description', e.target.value)} rows={3} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Technical Details</label>
                  <textarea value={finding.technicalDetails} onChange={e => update('technicalDetails', e.target.value)} rows={3} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Affected Component</label>
                  <input value={finding.affectedComponent} onChange={e => update('affectedComponent', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[12px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
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
                  <textarea value={finding.evidence} onChange={e => update('evidence', e.target.value)} rows={4} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] font-mono text-slate-300 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Impact</label>
                  <textarea value={finding.impact} onChange={e => update('impact', e.target.value)} rows={2} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Recommendation</label>
                  <textarea value={finding.recommendation} onChange={e => update('recommendation', e.target.value)} rows={2} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 focus:border-cyan-500/30 focus:outline-none resize-none hover:border-[#334155]/60 transition-all duration-200 leading-relaxed" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">References</label>
                    <input value={finding.references} onChange={e => update('references', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] text-slate-400 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Retest</label>
                    <input value={finding.retest} onChange={e => update('retest', e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-[#020617] border border-[#1e293b] text-[11px] text-slate-400 focus:border-cyan-500/30 focus:outline-none hover:border-[#334155]/60 transition-all duration-200" />
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
