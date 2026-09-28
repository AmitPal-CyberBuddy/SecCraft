import { useState } from 'react'
import { FileCode, AlertTriangle, CheckCircle, XCircle, Shield, Sparkles, Zap, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfigIssue {
  line: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  message: string
  recommendation: string
}

interface Props {
  title: string
  config: string
  issues?: ConfigIssue[]
  onFix?: (fixedConfig: string) => void
}

export function ConfigViewer({ title, config, issues = [], onFix }: Props) {
  const [showFixed, setShowFixed] = useState(false)

  const severityConfig = (sev: string) => {
    switch(sev) {
      case 'critical': return { bg: 'bg-red-500/[0.04]', border: 'border-red-500/15', text: 'text-red-400', badge: 'bg-red-500/10 border-red-500/20 text-red-400', icon: 'bg-red-500/10 border-red-500/20' }
      case 'high': return { bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/15', text: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400', icon: 'bg-amber-500/10 border-amber-500/20' }
      case 'medium': return { bg: 'bg-amber-500/[0.03]', border: 'border-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/15 text-amber-400', icon: 'bg-amber-500/10 border-amber-500/15' }
      case 'low': return { bg: 'bg-cyan-500/[0.03]', border: 'border-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/10 border-cyan-500/15 text-cyan-400', icon: 'bg-cyan-500/10 border-cyan-500/15' }
      default: return { bg: 'bg-[#1e293b]/30', border: 'border-[#334155]/30', text: 'text-slate-400', badge: 'bg-[#1e293b] border-[#334155] text-slate-400', icon: 'bg-[#1e293b] border-[#334155]' }
    }
  }

  const fixedConfig = config
    .replace('WPS: ENABLED', 'WPS: DISABLED')
    .replace('wps_state=2', 'wps_state=0')
    .replace('PMF: DISABLED', 'PMF: REQUIRED')
    .replace('ieee80211w=0', 'ieee80211w=2')
    .replace('HT: 40MHz in 2.4GHz', 'HT: 20MHz in 2.4GHz')
    .replace('wpa=1', 'wpa=2')
    .replace('rsn_pairwise=TKIP', 'rsn_pairwise=CCMP')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden hover:border-[#334155]/60 transition-all duration-300 relative group min-w-0 w-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] via-transparent to-cyan-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex flex-col xs:flex-row xs:items-center justify-between gap-3 p-4 xs:p-5 border-b border-[#1e293b]/60 bg-[#020617]/40 min-w-0">
        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <span className="text-[13px] font-bold text-slate-100">{title}</span>
              {issues.length > 0 ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-medium tracking-widest flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {issues.length} ISSUES
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  SECURE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">Config audit • Security analysis • Hardening</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFixed(!showFixed)}
            className={`px-4 py-2 rounded-xl text-[11px] font-medium border transition-all duration-200 flex items-center gap-2 ${
              showFixed 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-glow-emerald' 
                : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-slate-200 hover:bg-[#25354f] hover:border-[#475569]'
            }`}
          >
            {showFixed ? <><EyeOff className="w-3.5 h-3.5" /> Show Original</> : <><Eye className="w-3.5 h-3.5" /> Show Fixed</>}
          </motion.button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
        <div className="p-5 bg-[#020617]/60 border-r border-[#1e293b]/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                <span className="text-[8px]">#</span>
              </div>
              {showFixed ? 'Fixed Config' : 'Current Config'}
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">
              {showFixed ? fixedConfig.split('\n').length : config.split('\n').length} lines
            </div>
          </div>
          <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-[#020617] border border-[#1e293b]/60 overflow-x-auto scrollbar-thin">
            {showFixed ? fixedConfig : config}
          </pre>
        </div>

        <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Security Audit
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">
              {issues.length} findings
            </div>
          </div>
          
          {issues.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/15 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-emerald-400">No issues — good configuration</div>
                <div className="text-[11px] text-slate-500 mt-1">Config follows security best practices</div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, idx) => {
                const sev = severityConfig(issue.severity)
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-xl border backdrop-blur-sm hover:scale-[1.01] transition-all duration-200 ${sev.bg} ${sev.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${sev.icon}`}>
                        <XCircle className={`w-4 h-4 ${sev.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[12px] font-mono font-medium text-slate-200 truncate">{issue.line}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border font-bold tracking-widest shrink-0 ${sev.badge}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] mt-2 leading-relaxed text-slate-400">{issue.message}</div>
                        <div className="mt-3 p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 flex gap-2">
                          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-bold text-emerald-400">Fix:</span>
                            <span className="text-slate-300 ml-1.5">{issue.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          <AnimatePresence>
            {showFixed && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/15 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">✓ Fixed Config</div>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  WPS disabled, PMF required, 20MHz in 2.4GHz, CCMP only. Retest: verify beacon no WPS IE, PMF required in RSN, 20MHz.
                </div>
                {onFix && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onFix(fixedConfig)}
                    className="mt-3 w-full px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2 shadow-glow-emerald"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Apply Fix & Retest
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
