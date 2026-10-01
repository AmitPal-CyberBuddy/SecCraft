import { PageHeader } from '@/components/common/Workspace'
import { Notice, ViewSwitcher } from '@/components/common/Controls'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { ReportEditor } from '@/components/report/ReportEditor'
import { FileText, Shield, Target, Download, BarChart3, Layout, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, lazy, Suspense } from 'react'

const EvidenceVault = lazy(() => import('@/components/evidence/EvidenceVault').then(m => ({ default: m.EvidenceVault })))
const ReportPdfExport = lazy(() => import('@/components/pdf/ReportPdfExport').then(m => ({ default: m.ReportPdfExport })))
const CvssCalculator = lazy(() => import('@/components/security/CvssCalculator').then(m => ({ default: m.CvssCalculator })))
const ReportTemplates = lazy(() => import('@/components/report/ReportTemplates').then(m => ({ default: m.ReportTemplates })))
const TimelineViz = lazy(() => import('@/components/report/TimelineViz').then(m => ({ default: m.TimelineViz })))

export function Reports() {
  const [activeTab, setActiveTab] = useState<'editor' | 'vault' | 'pdf' | 'cvss' | 'templates' | 'timeline'>('editor')

  return (
    <div className="sc-technical-surface ws-legacy max-w-[1200px] mx-auto space-y-4 xs:space-y-6 md:space-y-8 min-w-0 w-full">
      <PageHeader eyebrow="Practice / Reporting" title="Findings & evidence" description="Explain an observation, cite evidence, assess impact, recommend a fix and describe how to retest. A report is not an award or a verified assessment." action={<Link to="/engagement" className="ws-action ws-action-secondary">Explore assessment briefs →</Link>} />

      <Notice>Start with an authorized exercise or supplied artifact. The editor does not automatically import lab evidence or verify your conclusions; review every statement before sharing a draft. <Link to="/labs">Explore labs</Link>.</Notice>

      <ViewSwitcher label="Reporting tools" value={activeTab} onChange={setActiveTab} options={[
        { id: 'editor', label: 'Report editor', icon: <FileText size={16} /> },
        { id: 'vault', label: 'Evidence vault', icon: <Shield size={16} /> },
        { id: 'pdf', label: 'PDF export', icon: <Download size={16} /> },
        { id: 'cvss', label: 'CVSS', icon: <BarChart3 size={16} /> },
        { id: 'templates', label: 'Templates', icon: <Layout size={16} /> },
        { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
      ]} />

      {activeTab === 'vault' && <Suspense fallback={<LoadingPanel label="Loading Vault…" />}><EvidenceVault /></Suspense>}
      {activeTab === 'pdf' && <Suspense fallback={<LoadingPanel label="Loading PDF/A Export…" />}><ReportPdfExport /></Suspense>}
      {activeTab === 'cvss' && <Suspense fallback={<LoadingPanel label="Loading CVSS…" />}><CvssCalculator /></Suspense>}
      {activeTab === 'templates' && <Suspense fallback={<LoadingPanel label="Loading Templates…" />}><ReportTemplates /></Suspense>}
      {activeTab === 'timeline' && <Suspense fallback={<LoadingPanel label="Loading Timeline…" />}><TimelineViz /></Suspense>}

      <div hidden={activeTab !== 'editor'} className="space-y-6">
          <details className="ws-workflow-help"><summary>How to write an evidence-based finding</summary>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 xs:gap-4 min-w-0"
          >
            {[
              { icon: Shield, title: 'VAPT Structure', desc: 'Title, Severity, Description, Technical Details, Affected Component, Evidence, Impact, Recommendation, References, Retest', color: 'violet' },
              { icon: FileText, title: 'Evidence-Based', desc: 'Always include PCAP frame numbers, config snippets, logs, BSSID, SSID, channel — not just "WPS enabled"', color: 'cyan' },
              { icon: Target, title: 'Attack→Defense→Retest', desc: 'For each finding, show attack, then defense, then retest verification — professional loop', color: 'emerald' },
            ].map(card => (
              <div
                key={card.title}
                className="group relative rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] hover:shadow-soft sc-technical-transition overflow-hidden min-w-0"
              >
                <div className="relative min-w-0">
                  <div className="flex items-center gap-2 mb-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center   shrink-0 ${card.color === 'violet' ? 'bg-[var(--owner-bg)] border-[var(--owner-border)]' : card.color === 'cyan' ? 'bg-[var(--accent-bg)] border-[var(--accent-border)]' : 'bg-[var(--success-bg)] border-[var(--success-border)]'}`}>
                      <card.icon className={`w-4 h-4 ${card.color === 'violet' ? 'text-[var(--owner)]' : card.color === 'cyan' ? 'text-[var(--learning)]' : 'text-[var(--success)]'}`} />
                    </div>
                    <h3 className="font-heading font-semibold text-[13px] xs:text-[14px] text-[var(--ink-primary)] truncate">{card.title}</h3>
                  </div>
                  <p className="text-[11px] xs:text-[12px] text-[var(--ink-secondary)] leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          </details>
          <div>
            <ReportEditor />
          </div>
      </div>
    </div>
  )
}
