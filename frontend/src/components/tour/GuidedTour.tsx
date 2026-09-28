import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, Map, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
        { element: 'header', popover: { title: 'Enterprise Topbar — XP & Level', description: 'Track XP, level, streak, current module. Cmd+K search 50+ items, theme toggle, notifications 3 unread, ? shortcuts', side: 'bottom', align: 'start' } },
        { element: '[data-tour=\"sidebar\"]', popover: { title: 'Learning Path — 20 Modules', description: '20 modules × 4 lessons = 80 lessons, 49572 lines. Progress ring, continue card, phases C+D+E+F. Click to start.', side: 'right', align: 'start' } },
        { element: '[data-tour=\"dashboard-stats\"]', popover: { title: 'Dashboard Stats — XP & Streak', description: 'XP earned, lessons 80, labs 20, streak days, achievements 20. Level Initiate → Forge Master 2450 XP max', side: 'bottom', align: 'start' } },
        { element: '[data-tour=\"daily\"]', popover: { title: 'Daily Challenges — Retention', description: '4 tasks daily: 2 lessons, 1 PCAP with 3 filters, perfect quiz, 5 terminal cmds. Weekly bonus +100 XP streak freeze', side: 'top', align: 'start' } },
        { element: '[data-tour=\"labs\"]', popover: { title: 'Labs — PCAP + Terminal + Vault', description: '16 Scapy real PCAPs, custom upload drag-drop 50MB, terminal 50+ cmds simulated Kali, evidence vault SHA256 chain, production parser', side: 'top', align: 'start' } },
        { element: '[data-tour=\"reports\"]', popover: { title: 'Reports & Certificate — Audit Ready', description: 'VAPT structure, evidence-based, Attack→Defense→Retest, PDF/A jsPDF real CVSS risk matrix compliance, certificate QR verified flag WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}', side: 'top', align: 'start' } },
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
                  <div className="text-[13px] font-bold text-slate-100">Welcome to WiFiForge Enterprise!</div>
                  <div className="text-[11px] text-slate-500">Take 60s guided tour — 20 modules, labs, terminal, vault, cert</div>
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
            <div className="mt-2 text-[10px] text-slate-600 font-mono">Enterprise • Zero-cost • Local-first • Offline • 20 modules • 80 lessons • 16 PCAPs • 50+ cmds • Cmd+K • Terminal • Vault • Cert • Daily • Teams • JWT • PWA</div>
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
