import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, Map, X, LayoutDashboard, GraduationCap, FlaskConical, Swords, FileText, Search, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_CHALLENGES, TOTAL_LEARNING_PATHS, AVAILABLE_LEARNING_PATHS } from '@/content/stats'
import { ACHIEVEMENTS_DEF } from '@/content/achievements'
import { MAX_XP } from '@/store/useProgressStore'
import platform from '@/content/platform.json'
import learningPaths from '@/content/learning-paths.json'

export function GuidedTour() {
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    try { return (localStorage.getItem('platform-tour-seen') || localStorage.getItem('wififorge-tour-seen')) === 'true' } catch { return false }
  })
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShowPrompt(true), 2500)
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
      popoverClass: 'platform-tour-popover',
      steps: [
        {
          popover: {
            title: `Welcome to ${platform.name} — Hands-on Cybersecurity Platform`,
            description: `${platform.name} is local-first, zero-cost, offline-capable. ${platform.tagline} — ${platform.secondaryTagline} Wireless Pentesting is Path #1 (${TOTAL_MODULES} modules, ${TOTAL_LESSONS} lessons, ${TOTAL_PCAPS} verified captures, ${TOTAL_CHALLENGES} challenges). This 90s tour shows where everything lives.`,
          }
        },
        {
          element: '[data-tour="topbar"]',
          popover: {
            title: 'Topbar — Platform Status & Navigation',
            description: `Left: Operator status (local-first, no account) + XP ${MAX_XP} ceiling + level. Center: Current module + Search (Cmd+K). Right: Theme toggle + Activity (real completions from this browser, not fake) + shortcuts. Sticky header — stays visible while you scroll.`,
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Sidebar — Platform Navigation (Learn / Practice / Assess / Track)',
            description: `Platform-level navigation, not Wi-Fi-only: Dashboard (platform overview), Learning Paths (${TOTAL_LEARNING_PATHS} total, ${AVAILABLE_LEARNING_PATHS} available), Modules (path-aware), Labs (${TOTAL_PCAPS} artifacts), Challenges (${TOTAL_CHALLENGES} guided→assessment), Engagements (ENG-01 authorised assessment), Reference (commands/filters/checklist), Reports (findings + evidence vault), Settings (profile, theme, privacy). Current path: ${learningPaths[0]?.title}.`,
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="dashboard-stats"]',
          popover: {
            title: 'Dashboard — Platform Overview',
            description: `Platform stats: ${TOTAL_LEARNING_PATHS} learning paths, ${TOTAL_MODULES} modules, ${TOTAL_LESSONS} authored lessons, ${TOTAL_PCAPS} verified PCAPs, ${TOTAL_LABS} labs, ${TOTAL_CHALLENGES} challenges, ${ACHIEVEMENTS_DEF.length} achievements. All counted from your local completions. Featured path: Wireless Pentesting (20 modules, reference implementation). No placeholder content for future paths — one excellent path first.`,
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '[data-tour="learning-paths"]',
          popover: {
            title: 'Learning Paths — Platform → Paths → Modules → Lessons → Labs → Challenges',
            description: `Platform hierarchy: Platform (${platform.name}) → Learning Paths (8 total) → Modules (20 for Wireless) → Lessons (27) → Labs (16 verified captures) → Challenges (15) → Assessments (ENG-01). Wireless is Path #1, not entire platform. Future: Web, API, Android, Network, AD, Cloud, AI/LLM — architecture ready, content later.`,
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="daily"]',
          popover: {
            title: 'Daily Goals & Progress — Your Local Progress',
            description: `Three practice goals counted from your own completions today: 2 lessons, 1 capture analysed, 1 perfect quiz. Progress bar shows overall % + XP + level + streak. All stored in platform-progress (fallback wififorge-progress) — this browser only, no server.`,
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="labs"]',
          popover: {
            title: 'Labs — Reusable Lab Engine (PCAP, Config, HTTP, APK, Logs)',
            description: `Lab engine is generic, not Wi-Fi-only: artifact analysis (PCAP ${TOTAL_PCAPS} for Wireless), config audit, scenario, terminal (operator@seccraft simulated shell, ${platform.name} generic), evidence vault (hash+claim+filter+frames), scoring. Tiers: SIMULATION (bundled offline dataset) • HYBRID • REAL (requires authorized env). For Wireless: beacon-only, WPA2 handshake, PMKID, WPS, EAP/RADIUS, etc.`,
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="challenges"]',
          popover: {
            title: 'Challenges — Guided → Semi-guided → Assessment',
            description: `15 challenges, 45 tasks, flags WIFIFORGE{...} retained for Wireless legacy. Guided = step-by-step with commands, Semi-guided = objective+tools, Assessment = only scope+artifacts (like real engagement). Path-aware filter — shows challenges for current path. Platform-level engine will support Web, API, Android later.`,
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="reports"]',
          popover: {
            title: 'Reports & Evidence — Professional VAPT Workflow',
            description: `Finding editor, evidence vault (platform-evidence-vault generic, hashes files in browser, nothing uploaded), CVSS 3.1 calculator, timeline viz built from your own artefacts, certificate (platform + path certificate, local-first LOCAL- id, not accredited, printable). Methodology: ${platform.philosophyShort} — ${platform.tagline}`,
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '[data-tour="search"]',
          popover: {
            title: 'Global Search — Generic Index (Paths, Modules, Labs, Challenges, Skills)',
            description: `Cmd+K opens generic search: 8 learning paths, ${TOTAL_MODULES} modules + ${TOTAL_LESSONS} lessons, ${TOTAL_PCAPS} labs, ${TOTAL_CHALLENGES} challenges, skills (generic + domain-specific), commands, filters, platform pages. Path-aware — search in Wireless path or all paths. No server, works offline.`,
            side: 'bottom',
            align: 'start'
          }
        },
      ],
      onDestroyStarted: () => {
        try { localStorage.setItem('platform-tour-seen', 'true'); try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}; } catch {}
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
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-20 right-4 z-[80] w-[360px] rounded-2xl bg-[#0f172a] border border-violet-500/30 shadow-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Map className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-100">Welcome to {platform.name}</div>
                  <div className="text-[11px] text-slate-500">90s tour — platform, paths, labs, challenges, evidence, reports</div>
                </div>
              </div>
              <button onClick={() => { setShowPrompt(false); try { localStorage.setItem('platform-tour-seen', 'true'); try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}; } catch {}; setHasSeenTour(true) }} className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors">
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div className="mt-3 space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5"><LayoutDashboard className="w-3 h-3" /> Dashboard — platform overview + featured path</div>
              <div className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Learning Paths — {TOTAL_LEARNING_PATHS} paths, {AVAILABLE_LEARNING_PATHS} available</div>
              <div className="flex items-center gap-1.5"><FlaskConical className="w-3 h-3" /> Labs — {TOTAL_PCAPS} verified captures + terminal + vault</div>
              <div className="flex items-center gap-1.5"><Swords className="w-3 h-3" /> Challenges — {TOTAL_CHALLENGES} guided→assessment</div>
              <div className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Reports — evidence + CVSS + certificate</div>
              <div className="flex items-center gap-1.5"><Search className="w-3 h-3" /> Search — Cmd+K generic index</div>
              <div className="flex items-center gap-1.5"><Bell className="w-3 h-3" /> Activity — real completions, not fake</div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={startTour} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 shadow-glow-violet touch-manipulation">
                <Sparkles className="w-4 h-4" />Start Tour — 90s
              </button>
              <button onClick={() => { setShowPrompt(false); try { localStorage.setItem('platform-tour-seen', 'true'); try { localStorage.setItem('wififorge-tour-seen', 'true') } catch {}; } catch {}; setHasSeenTour(true) }} className="px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-400 hover:text-slate-200 transition-colors">Skip</button>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-mono">Zero-cost • local-first • offline • {platform.name} • {TOTAL_LEARNING_PATHS} paths • {TOTAL_MODULES} modules • {TOTAL_LESSONS} lessons • {TOTAL_PCAPS} captures • {platform.tagline}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={startTour} data-tour="tour-button" className="fixed bottom-4 left-4 z-30 w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-medium hover:bg-[#1e293b] hover:border-[#334155] transition-all touch-manipulation" aria-label="Start guided tour">
        <Map className="w-5 h-5 text-violet-400" />
      </button>

      <style>{`
        .platform-tour-popover { background: #0f172a !important; border: 1px solid #334155 !important; border-radius: 16px !important; color: #f1f5f9 !important; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5) !important; max-width: 380px !important; }
        .platform-tour-popover .driver-popover-title { color: #f1f5f9 !important; font-family: Inter, ui-sans-serif, system-ui, sans-serif !important; font-weight: 700 !important; font-size: 14px !important; line-height: 1.3 !important; }
        .platform-tour-popover .driver-popover-description { color: #94a3b8 !important; font-size: 12px !important; line-height: 1.6 !important; }
        .platform-tour-popover .driver-popover-progress-text { color: #64748b !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; font-size: 11px !important; }
        .platform-tour-popover .driver-popover-next-btn, .platform-tour-popover .driver-popover-prev-btn, .platform-tour-popover .driver-popover-close-btn { background: #1e293b !important; border: 1px solid #334155 !important; color: #e2e8f0 !important; border-radius: 8px !important; font-size: 12px !important; padding: 6px 12px !important; }
        .platform-tour-popover .driver-popover-next-btn { background: linear-gradient(to right, #8b5cf6, #06b6d4) !important; border: none !important; color: white !important; }
        .platform-tour-popover .driver-popover-footer { gap: 8px !important; }
      `}</style>
    </>
  )
}
