import { useProgressStore } from '@/store/useProgressStore'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Download, Trash2, FlaskConical, Wifi, Shield, Zap, Sparkles, Award, Target } from 'lucide-react'

export function Settings() {
  const reset = useProgressStore(s => s.resetProgress)
  const overall = useProgressStore(s => s.getOverallProgress())
  const lessons = useProgressStore(s => s.completedLessons)
  const labs = useProgressStore(s => s.completedLabs)

  return (
    <div className="max-w-[800px] mx-auto space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/15 to-slate-600/10 border border-slate-500/20 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none">Settings</h1>
          <p className="text-[13px] text-slate-400 mt-1.5">Local-first • No cloud • Your data stays in browser + SQLite</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-cyan-400" />
            </div>
            Progress
            <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono">Local storage</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200 group/card">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                <Target className="w-3 h-3" />
                Overall
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-[24px] font-bold text-slate-100 font-mono">{overall}%</div>
                <div className="text-[11px] text-slate-500">complete</div>
              </div>
              <div className="mt-3 w-full h-1.5 bg-[#020617] rounded-full border border-[#1e293b]/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overall}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                <Shield className="w-3 h-3" />
                Lessons
              </div>
              <div className="text-[24px] font-bold text-slate-100 font-mono">{lessons.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">completed</div>
            </div>
            <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm hover:bg-[#020617]/80 hover:border-[#334155]/50 transition-all duration-200">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                <FlaskConical className="w-3 h-3" />
                Labs
              </div>
              <div className="text-[24px] font-bold text-slate-100 font-mono">{labs.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">completed</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const data = localStorage.getItem('wififorge-progress')
                if (data) {
                  const blob = new Blob([data], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'wififorge-progress.json'
                  a.click()
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:text-slate-100 hover:bg-[#25354f] hover:border-[#475569] flex items-center gap-2 transition-all duration-200 shadow-soft"
            >
              <Download className="w-4 h-4" />
              Export Progress JSON
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (confirm('Reset all progress? This cannot be undone.')) reset()
              }}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] font-medium text-red-400 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300 flex items-center gap-2 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Reset Progress
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
            </div>
            Lab Mode
          </h3>
          <div className="space-y-3">
            <label className="group flex items-center justify-between p-4 rounded-xl bg-[#020617]/60 border border-emerald-500/15 hover:bg-[#020617]/80 hover:border-emerald-500/20 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Simulated Labs Only (Recommended)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">PCAPs, configs, logs — no hardware • Zero-cost</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">ACTIVE</span>
                <input type="checkbox" defaultChecked className="accent-emerald-400 w-4 h-4" />
              </div>
            </label>
            <label className="group flex items-center justify-between p-4 rounded-xl bg-[#020617]/40 border border-[#1e293b]/40 hover:bg-[#020617]/60 hover:border-[#334155]/40 transition-all duration-200 cursor-pointer opacity-60 hover:opacity-80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-300">Hardware Labs (Requires RF adapter)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Monitor mode, injection, real AP — ALFA AWUS036ACHM</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">SOON</span>
                <input type="checkbox" className="accent-amber-400 w-4 h-4" />
              </div>
            </label>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-[#020617]/60 border border-[#1e293b]/40 p-5 backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono leading-relaxed">
            <div className="font-bold text-slate-400">WiFiForge v2.0 — Premium Edition</div>
            <div className="mt-1">Phase A • Local • Zero-cost • MIT • 20 modules • 16 PCAPs • 15 challenges</div>
            <div className="mt-1">Stack: Vite + React + FastAPI + SQLite • Theme: Technical Premium • Framer Motion</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-[10px]">Forge</span>
              <span className="text-slate-700">→</span>
              <span className="px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-[10px]">Break</span>
              <span className="text-slate-700">→</span>
              <span className="px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-[10px]">Fix</span>
              <span className="text-slate-700">→</span>
              <span className="px-2 py-1 rounded-full bg-[#0f172a] border border-[#1e293b] text-[10px]">Retest</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
