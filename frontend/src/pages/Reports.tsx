import { ReportEditor } from '@/components/report/ReportEditor'
import { FileText, Shield, Target, Sparkles, Award, Zap, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'

export function Reports() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
      >
        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Reports</h1>
            <p className="text-[13px] text-slate-400 mt-1.5">Practice writing professional wireless findings — Title, Severity, Evidence, Impact, Recommendation, Retest</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 px-3 py-2 rounded-xl bg-[#0f172a]/60 border border-[#1e293b]/40">
          <Sparkles className="w-3 h-3 text-violet-400" />
          Professional VAPT structure
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
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
            className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 hover:border-[#334155]/60 hover:bg-[#111d33] hover:shadow-soft transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              card.color === 'violet' ? 'from-violet-500/[0.03] to-transparent' :
              card.color === 'cyan' ? 'from-cyan-500/[0.03] to-transparent' :
              'from-emerald-500/[0.03] to-transparent'
            }`} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                  card.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' :
                  card.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' :
                  'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <card.icon className={`w-4 h-4 ${
                    card.color === 'violet' ? 'text-violet-400' :
                    card.color === 'cyan' ? 'text-cyan-400' :
                    'text-emerald-400'
                  }`} />
                </div>
                <span className="text-[13px] font-bold text-slate-200">{card.title}</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                {card.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <ReportEditor />
      </motion.div>
    </div>
  )
}
