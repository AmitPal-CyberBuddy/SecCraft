import { LoadingPanel } from '@/components/common/LoadingPanel'
import { ReportEditor } from '@/components/report/ReportEditor'
import { FileText, Shield, Target, Sparkles, Trophy, Download, Users, MessageSquare, BarChart3, Layout, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, lazy, Suspense } from 'react'

const Certificate = lazy(() => import('@/components/certificate/Certificate').then(m => ({ default: m.Certificate })))
const EvidenceVault = lazy(() => import('@/components/evidence/EvidenceVault').then(m => ({ default: m.EvidenceVault })))
const ReportPdfExport = lazy(() => import('@/components/pdf/ReportPdfExport').then(m => ({ default: m.ReportPdfExport })))
const CvssCalculator = lazy(() => import('@/components/security/CvssCalculator').then(m => ({ default: m.CvssCalculator })))
const ReportTemplates = lazy(() => import('@/components/report/ReportTemplates').then(m => ({ default: m.ReportTemplates })))
const TimelineViz = lazy(() => import('@/components/report/TimelineViz').then(m => ({ default: m.TimelineViz })))

export function Reports() {
  const [activeTab, setActiveTab] = useState<'editor' | 'certificate' | 'vault' | 'pdf' | 'cvss' | 'templates' | 'timeline'>('editor')

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 xs:space-y-6 md:space-y-8 min-w-0 w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 xs:gap-6 min-w-0"
      >
        <div className="flex items-center gap-2 xs:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-[22px] xs:text-[26px] sm:text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none truncate sc-page-title">Reports & Certification</h1>
            <p className="text-[12px] xs:text-[13px] text-slate-400 mt-1.5 leading-relaxed">VAPT findings from your own evidence • evidence vault • PDF export • local completion record</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 px-3 py-2 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40 shrink-0">
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span className="hidden xs:inline">Professional VAPT structure • your data only</span>
          <span className="xs:hidden">Local</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="w-full overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm w-fit">
          {[
            { id: 'editor', label: 'Report Editor', icon: FileText },
            { id: 'certificate', label: 'Certificates', icon: Trophy },
            { id: 'vault', label: 'Evidence Vault', icon: Shield },
            { id: 'pdf', label: 'PDF Export', icon: Download },
            { id: 'cvss', label: 'CVSS', icon: BarChart3 },
            { id: 'templates', label: 'Templates', icon: Layout },
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'forum', label: 'Forum', icon: MessageSquare },
            { id: 'teams', label: 'Teams', icon: Users },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 xs:px-4 py-2.5 rounded-lg text-[12px] xs:text-[13px] font-medium transition-all shrink-0 touch-manipulation min-h-[44px] ${activeTab === tab.id ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft' : 'text-slate-400 hover:text-slate-300 border border-transparent'}`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {activeTab === 'certificate' && <Suspense fallback={<LoadingPanel label="Loading certificate status…" />}><Certificate /></Suspense>}
      {activeTab === 'vault' && <Suspense fallback={<LoadingPanel label="Loading Vault…" />}><EvidenceVault /></Suspense>}
      {activeTab === 'pdf' && <Suspense fallback={<LoadingPanel label="Loading PDF/A Export…" />}><ReportPdfExport /></Suspense>}
      {activeTab === 'cvss' && <Suspense fallback={<LoadingPanel label="Loading CVSS…" />}><CvssCalculator /></Suspense>}
      {activeTab === 'templates' && <Suspense fallback={<LoadingPanel label="Loading Templates…" />}><ReportTemplates /></Suspense>}
      {activeTab === 'timeline' && <Suspense fallback={<LoadingPanel label="Loading Timeline…" />}><TimelineViz /></Suspense>}
            
      {activeTab === 'editor' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 xs:gap-4 min-w-0"
          >
            {[
              { icon: Shield, title: 'VAPT Structure', desc: 'Title, Severity, Description, Technical Details, Affected Component, Evidence, Impact, Recommendation, References, Retest', color: 'violet' },
              { icon: FileText, title: 'Evidence-Based', desc: 'Always include PCAP frame numbers, config snippets, logs, BSSID, SSID, channel — not just "WPS enabled"', color: 'cyan' },
              { icon: Target, title: 'Attack→Defense→Retest', desc: 'For each finding, show attack, then defense, then retest verification — professional loop', color: 'emerald' },
            ].map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 hover:border-[#334155]/60 hover:bg-[#111d33] hover:shadow-soft transition-all duration-300 overflow-hidden min-w-0"
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${card.color === 'violet' ? 'from-violet-500/[0.03] to-transparent' : card.color === 'cyan' ? 'from-cyan-500/[0.03] to-transparent' : 'from-emerald-500/[0.03] to-transparent'}`} />
                <div className="relative min-w-0">
                  <div className="flex items-center gap-2 mb-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0 ${card.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : card.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                      <card.icon className={`w-4 h-4 ${card.color === 'violet' ? 'text-violet-400' : card.color === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'}`} />
                    </div>
                    <h3 className="font-heading font-semibold text-[13px] xs:text-[14px] text-slate-100 truncate">{card.title}</h3>
                  </div>
                  <p className="text-[11px] xs:text-[12px] text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <ReportEditor />
          </motion.div>
        </>
      )}
    </div>
  )
}
