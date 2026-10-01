import { useState, useRef } from 'react'
import { FileText, Shield, Award, Target, Eye, Crown } from 'lucide-react'

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
  const previewTrigger = useRef<HTMLButtonElement>(null)
  const [selected, setSelected] = useState<string>('technical')
  const [preview, setPreview] = useState<Template | null>(null)

  const sel = templates.find(t => t.id === selected) || templates[1]

  return (
    <div className={`sc-technical-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-[var(--owner)]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)]">Report templates — executive, technical, compliance, retest</h3>
          <p className="text-[11px] text-[var(--ink-muted)] font-mono">Structure only • your findings • export with the evidence vault</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {templates.map(tpl => (
          <button type="button" aria-pressed={selected === tpl.id} key={tpl.id} onClick={() => { setSelected(tpl.id); setPreview(null) }} className={`sc-technical-choice text-left p-4 rounded-xl border cursor-pointer sc-technical-transition min-w-0 ${selected === tpl.id ? 'bg-[var(--panel-raised)] border-[var(--line-strong)] shadow-soft' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tpl.color === 'amber' ? 'bg-[var(--warning-bg)] border-[var(--warning-border)]' : tpl.color === 'violet' ? 'bg-[var(--owner-bg)] border-[var(--owner-border)]' : tpl.color === 'emerald' ? 'bg-[var(--success-bg)] border-[var(--success-border)]' : 'bg-[var(--accent-bg)] border-[var(--accent-border)]'}`}>
                <tpl.icon className={`w-4 h-4 ${tpl.color === 'amber' ? 'text-[var(--attention)]' : tpl.color === 'violet' ? 'text-[var(--owner)]' : tpl.color === 'emerald' ? 'text-[var(--success)]' : 'text-[var(--learning)]'}`} />
              </div>
              <span className="text-[12px] font-bold text-[var(--ink-primary)] truncate">{tpl.name}</span>
              {selected === tpl.id && <span className="ml-auto w-2 h-2 rounded-full bg-[var(--success)] " />}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)] leading-relaxed line-clamp-2">{tpl.desc}</div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono">{tpl.sections.length} sections</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-secondary)] font-mono">{tpl.compliance.length} compliance</span>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-[var(--ink-primary)] flex items-center gap-2"><Eye className="w-4 h-4 text-[var(--owner)]" />{sel.name} — section outline</span>
          <div className="flex items-center gap-2">
            <button ref={previewTrigger} onClick={() => setPreview(sel)} className="px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[11px] text-[var(--ink-secondary)] flex items-center gap-1.5 hover:bg-[var(--panel-raised)] transition-colors"><Eye className="w-3 h-3" />Preview</button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide">Sections</div>
          <div className="flex flex-wrap gap-1.5">
            {sel.sections.map(s => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-secondary)]">{s}</span>
            ))}
          </div>
          <div className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide mt-3">Compliance</div>
          <div className="flex flex-wrap gap-1.5">
            {sel.compliance.map(c => (
              <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[var(--owner)] font-mono">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {preview && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-[var(--ink-secondary)] leading-relaxed">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[var(--ink-secondary)]">{preview.name} — outline preview</span>
            <button type="button" aria-label="Close template preview" onClick={() => { setPreview(null); previewTrigger.current?.focus() }} className="text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">✕</button>
          </div>
          <div className="space-y-1">
            {preview.sections.map((section, i) => (
              <div key={section} className="flex items-start gap-2">
                <span className="text-[var(--ink-secondary)] shrink-0">{i + 1}.</span>
                <span>{section}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--line-normal)] text-[var(--ink-muted)]">
            The template is a structure, not content: fill each section from your own findings, evidence-vault
            records and the CVSS calculator. Mapped frameworks: {preview.compliance.join(', ')}. Nothing is
            pre-written with sample findings — a report with someone else&apos;s numbers is not evidence.
          </div>
        </div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[11px] text-[var(--ink-muted)] leading-relaxed">
        <span className="font-semibold text-[var(--owner)]">How to use these:</span> pick the structure your reader needs, write findings from your own evidence vault records, score them with the CVSS 3.1 calculator, then export the report and the vault JSON together in Reports → Report Editor / Evidence Vault. This report editor does not upload or sync report files; version your work with git or your own copy of the exported JSON.
      </div>
    </div>
  )
}
