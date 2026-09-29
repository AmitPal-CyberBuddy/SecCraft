import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Shield, Award, Target, Download, Eye, Copy, Zap, Crown } from 'lucide-react'

interface Template {
  id: string
  name: string
  desc: string
  sections: string[]
  compliance: string[]
  icon: any
  color: string
}

const templates: Template[] = [
  { id: 'executive', name: 'Executive Summary', desc: 'For decision makers — risk, impact, timeline', sections: ['Executive Summary', 'Risk Matrix', 'Business Impact', 'Remediation Roadmap', 'Cost Estimate'], compliance: ['PCI-DSS', 'ISO 27001'], icon: Crown, color: 'amber' },
  { id: 'technical', name: 'Technical Deep Dive', desc: 'For engineers — configs, captures, CVSS, evidence', sections: ['Scope', 'Methodology', 'Findings + CVSS', 'Evidence (your vault records)', 'Configs', 'Timeline', 'Retest'], compliance: ['NIST 800-153', 'OWASP WSTG', 'PTES'], icon: Shield, color: 'violet' },
  { id: 'compliance', name: 'Compliance Mapping', desc: 'For auditors — structure for mapping findings to the control frameworks you are assessed against', sections: ['Scope of Assessment', 'Control Mapping (you fill the control ids)', 'Evidence Index', 'Gap Analysis', 'Remediation Plan'], compliance: ['PCI-DSS 11.1', 'NIST 800-153', 'OWASP WSTG v4.2', 'PTES', 'ISO 27001'], icon: Award, color: 'emerald' },
  { id: 'retest', name: 'Retest Verification', desc: 'For validation — before/after, Attack→Defense→Retest', sections: ['Original Finding', 'Remediation Applied', 'Retest Evidence', 'Verification', 'Sign-off'], compliance: ['PTES'], icon: Target, color: 'cyan' },
]

export function ReportTemplates({ className = '' }: { className?: string }) {
  const [selected, setSelected] = useState<string>('technical')
  const [preview, setPreview] = useState<Template | null>(null)

  const sel = templates.find(t => t.id === selected) || templates[1]

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Report templates — executive, technical, compliance, retest</h3>
          <p className="text-[11px] text-slate-500 font-mono">Structure only • your findings • export with the evidence vault</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {templates.map((tpl, idx) => (
          <motion.div key={tpl.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -2, scale: 1.02 }} onClick={() => setSelected(tpl.id)} className={`p-4 rounded-xl border cursor-pointer transition-all min-w-0 ${selected === tpl.id ? 'bg-[#1e293b] border-[#334155] shadow-soft' : 'bg-[#020617]/60 border-[#1e293b]/40 hover:bg-[#020617]/80 hover:border-[#334155]/40'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tpl.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : tpl.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : tpl.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                <tpl.icon className={`w-4 h-4 ${tpl.color === 'amber' ? 'text-amber-400' : tpl.color === 'violet' ? 'text-violet-400' : tpl.color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`} />
              </div>
              <span className="text-[12px] font-bold text-slate-100 truncate">{tpl.name}</span>
              {selected === tpl.id && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{tpl.desc}</div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">{tpl.sections.length} sections</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 font-mono">{tpl.compliance.length} compliance</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-slate-100 flex items-center gap-2"><Eye className="w-4 h-4 text-violet-400" />{sel.name} — section outline</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(sel)} className="px-3 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] text-slate-300 flex items-center gap-1.5 hover:bg-[#25354f] transition-colors"><Eye className="w-3 h-3" />Preview</button>
            <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-glow-violet"><Download className="w-3 h-3" />Use Template</button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sections</div>
          <div className="flex flex-wrap gap-1.5">
            {sel.sections.map(s => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400">{s}</span>
            ))}
          </div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-3">Compliance</div>
          <div className="flex flex-wrap gap-1.5">
            {sel.compliance.map(c => (
              <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-[#020617] border border-[#1e293b] font-mono text-[11px] text-slate-400 leading-relaxed">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-300">{preview.name} — outline preview</span>
            <button onClick={() => setPreview(null)} className="text-slate-500 hover:text-slate-300">✕</button>
          </div>
          <div className="space-y-1">
            {preview.sections.map((section, i) => (
              <div key={section} className="flex items-start gap-2">
                <span className="text-slate-400 shrink-0">{i + 1}.</span>
                <span>{section}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#1e293b] text-slate-500">
            The template is a structure, not content: fill each section from your own findings, evidence-vault
            records and the CVSS calculator. Mapped frameworks: {preview.compliance.join(', ')}. Nothing is
            pre-written with sample findings — a report with someone else&apos;s numbers is not evidence.
          </div>
        </motion.div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-violet-300">How to use these:</span> pick the structure your reader needs, write findings from your own evidence vault records, score them with the CVSS 3.1 calculator, then export the report and the vault JSON together in Reports → Report Editor / Evidence Vault. This report editor does not upload or sync report files; version your work with git or your own copy of the exported JSON.
      </div>
    </div>
  )
}
