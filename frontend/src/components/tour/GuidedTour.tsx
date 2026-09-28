import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, Map, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS } from '@/content/stats'
import { ACHIEVEMENTS_DEF } from '@/content/achievements'
import { MAX_XP } from '@/store/useProgressStore'

export function GuidedTour() {
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    try { return localStorage.getItem('wififorge-tour-seen') === 'true' } catch { return false }
  })
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasSeenTour])

  const startTour = () => {
    setShowPrompt(false)
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: '#020617',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'wififorge-tour-popover',
      steps: [
        { element: 'header', popover: { title: 'Topbar — XP & level', description: 'XP, level and streak counted from your local completions. Cmd+K or Ctrl+K for search, theme toggle, activity list, ? for the shortcut sheet', side: 'bottom', align: 'start' } },
        { element: '[data-tour=\"sidebar\"]', popover: { title: 'Learning path', description: `${TOTAL_MODULES} modules in 6 phases with ${TOTAL_LESSONS} authored lessons. Progress comes from what you complete on this device.`, side: 'right', align: 'start' } },
        { element: '[data-tour=\"dashboard-stats\"]', popover: { title: 'Dashboard Stats — XP & Streak', description: `${TOTAL_LESSONS} authored lessons, ${TOTAL_LABS} labs, ${ACHIEVEMENTS_DEF.length} achievements and ${MAX_XP} XP across ${TOTAL_MODULES} modules. Everything is counted from your own completions on this device.`, side: 'bottom', align: 'start' } },
        { element: '[data-tour=\"daily\"]', popover: { title: 'Daily goals', description: 'Three practice goals counted from your own completions today: two lessons, one capture analysed, one perfect quiz.', side: 'top', align: 'start' } },
        { element: '[data-tour=\"labs\"]', popover: { title: 'Labs — captures, terminal, vault', description: `${TOTAL_PCAPS} verified captures decoded offline, custom-capture hashing, a simulated shell with real syntax, and an evidence vault that records hash + claim + filter + frames.`, side: 'top', align: 'start' } },
        { element: '[data-tour=\"reports\"]', popover: { title: 'Reports & completion record', description: 'Finding editor, evidence vault export, CVSS 3.1 calculator, engagement timeline built from your own artefacts, and a local completion record you can print — not an accredited certificate.', side: 'top', align: 'start' } },
      ],
      onDestroyStarted: () => {
        try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}
        setHasSeenTour(true)
        driverObj.destroy()
      },
    })
    driverObj.drive()
  }

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-20 right-4 z-[80] w-[320px] rounded-2xl bg-[#0f172a] border border-violet-500/30 shadow-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Map className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-100">Welcome to WiFiForge</div>
                  <div className="text-[11px] text-slate-500">Take the 60s tour — modules, labs, terminal, evidence vault</div>
                </div>
              </div>
              <button onClick={() => { setShowPrompt(false); try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}; setHasSeenTour(true) }} className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors">
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={startTour} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 shadow-glow-violet touch-manipulation">
                <Sparkles className="w-4 h-4" />Start Tour — 60s
              </button>
              <button onClick={() => { setShowPrompt(false); try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}; setHasSeenTour(true) }} className="px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-400 hover:text-slate-200 transition-colors">Skip</button>
            </div>
            <div className="mt-2 text-[10px] text-slate-600 font-mono">Zero-cost • local-first • offline • {TOTAL_MODULES} modules • {TOTAL_LESSONS} lessons • {TOTAL_PCAPS} verified captures • Cmd+K • terminal • evidence vault • PWA</div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={startTour} className="fixed bottom-4 left-4 z-30 w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-medium hover:bg-[#1e293b] hover:border-[#334155] transition-all touch-manipulation" aria-label="Start guided tour">
        <Map className="w-5 h-5 text-violet-400" />
      </button>

      <style>{`
        .wififorge-tour-popover { background: #0f172a !important; border: 1px solid #334155 !important; border-radius: 16px !important; color: #f1f5f9 !important; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5) !important; }
        .wififorge-tour-popover .driver-popover-title { color: #f1f5f9 !important; font-family: Sora, sans-serif !important; font-weight: 700 !important; font-size: 14px !important; }
        .wififorge-tour-popover .driver-popover-description { color: #94a3b8 !important; font-size: 12px !important; line-height: 1.5 !important; }
        .wififorge-tour-popover .driver-popover-progress-text { color: #64748b !important; font-family: JetBrains Mono, monospace !important; font-size: 11px !important; }
        .wififorge-tour-popover .driver-popover-next-btn, .wififorge-tour-popover .driver-popover-prev-btn, .wififorge-tour-popover .driver-popover-close-btn { background: #1e293b !important; border: 1px solid #334155 !important; color: #e2e8f0 !important; border-radius: 8px !important; font-size: 12px !important; }
        .wififorge-tour-popover .driver-popover-next-btn { background: linear-gradient(to right, #8b5cf6, #06b6d4) !important; border: none !important; color: white !important; }
      `}</style>
    </>
  )
}
