import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Map, BookOpen, FlaskConical, Swords, FileText, Settings, Terminal, Shield, Zap, X, ChevronRight, Activity, Wifi, Target, Layers, GraduationCap, BarChart3, Trophy, Flame, BarChart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useProgressStore } from '@/store/useProgressStore'
import { TOTAL_CHALLENGES, TOTAL_LABS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_LEARNING_PATHS, AVAILABLE_LEARNING_PATHS } from '@/content/stats'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null, desc: 'Platform overview • compact', section: 'platform' },
  { to: '/paths', icon: Map, label: 'Learning Paths', badge: `${TOTAL_LEARNING_PATHS}`, desc: `${AVAILABLE_LEARNING_PATHS} available • ${TOTAL_LEARNING_PATHS} total`, section: 'learn' },
  { to: '/modules', icon: BookOpen, label: 'Modules', badge: `${TOTAL_MODULES}`, desc: `Path-aware • ${TOTAL_MODULES} total`, section: 'learn' },
  { to: '/labs', icon: FlaskConical, label: 'Labs', badge: `${TOTAL_PCAPS}`, desc: `Artifacts • ${TOTAL_PCAPS} verified`, section: 'practice' },
  { to: '/challenges', icon: Swords, label: 'Challenges', badge: `${TOTAL_CHALLENGES}`, desc: 'Guided → Assessment', section: 'practice' },
  { to: '/daily', icon: Flame, label: 'Daily', badge: null, desc: 'Streak • goals • forge habits', section: 'track' },
  { to: '/achievements', icon: Trophy, label: 'Achievements', badge: null, desc: 'Badges • XP • levels', section: 'track' },
  { to: '/progress', icon: BarChart, label: 'Analytics', badge: null, desc: 'Progress • insights • path-aware', section: 'track' },
  { to: '/engagement', icon: Target, label: 'Engagements', badge: 'ENG-01', desc: 'Authorised assessment mode', section: 'assess' },
  { to: '/reference', icon: Terminal, label: 'Reference', badge: null, desc: 'Commands, filters, checklist', section: 'reference' },
  { to: '/reports', icon: FileText, label: 'Reports', badge: null, desc: 'Findings & evidence vault', section: 'track' },
  { to: '/settings', icon: Settings, label: 'Settings', badge: null, desc: 'Profile, theme, privacy', section: 'settings' },
]

const sectionLabels: Record<string, { label: string; icon: any }> = {
  learn: { label: 'Learn', icon: GraduationCap },
  practice: { label: 'Practice', icon: FlaskConical },
  assess: { label: 'Assess', icon: Target },
  track: { label: 'Track', icon: BarChart3 },
  reference: { label: 'Reference', icon: Terminal },
}

interface Props {
  onClose?: () => void
  isMobile?: boolean
  isOpen?: boolean
}

export function Sidebar({ onClose, isMobile, isOpen }: Props) {
  const location = useLocation()
  const overall = useProgressStore(s => s.getOverallProgress())
  const streak = useProgressStore(s => s.getStreak())
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const currentPath = learningPaths.find(p => p.id === currentPathId)

  return (
    <aside id="primary-navigation" data-tour="sidebar" aria-hidden={isMobile && !isOpen ? true : undefined} inert={Boolean(isMobile && !isOpen)} className="w-full h-screen h-[100dvh] bg-[#0a1020]/95 backdrop-blur-2xl border-r border-[#1e293b]/60 flex flex-col relative overflow-hidden sticky top-0">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      {/* SecCraft platform mark */}
      <div className="relative h-[64px] md:h-[72px] px-4 xs:px-5 flex items-center gap-3 border-b border-[#1e293b]/60 shrink-0 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#020617] border border-[#1e293b] flex items-center justify-center relative overflow-hidden shadow-soft group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-violet-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-center justify-center w-6 h-6">
            <div className="absolute w-3 h-4 bg-amber-500 rotate-12 rounded-[2px] -translate-x-1" style={{ clipPath: 'polygon(20% 0%, 100% 0%, 85% 100%, 0% 100%, 0% 40%)' }} />
            <div className="absolute w-3 h-4 bg-cyan-400 -rotate-12 rounded-[2px] translate-x-1" style={{ clipPath: 'polygon(0% 0%, 80% 0%, 100% 40%, 100% 100%, 15% 100%)' }} />
            <div className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-heading font-bold text-[16px] xs:text-[17px] leading-none tracking-tight truncate">
              <span className="text-slate-100">{platform.name}</span>
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="text-[8px] xs:text-[9px] tracking-[0.15em] text-slate-400 font-semibold uppercase truncate">Hands-on Cybersecurity</span>
            <span className="text-[7px] xs:text-[8px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono shrink-0">v{platform.version}</span>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-11 h-11 xs:w-8 xs:h-8 rounded-xl xs:rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] hover:border-[#475569] active:bg-[#1e293b] transition-all duration-200 group shrink-0 touch-manipulation"
          >
            <X className="w-5 h-5 xs:w-4 xs:h-4 text-slate-400 group-hover:text-slate-200 group-hover:rotate-90 transition-all duration-200" />
          </button>
        )}
      </div>

      {/* Current Learning Path — platform-level indicator, wireless as sub-brand */}
      <div className="relative px-4 xs:px-5 py-3 border-b border-[#1e293b]/40 shrink-0 bg-[#020617]/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> Current Path
          </span>
          <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{currentPath?.shortTitle || 'Wireless'}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-[16px]">{currentPath?.icon || '📡'}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-slate-200 truncate">{currentPath?.title || 'Wireless Pentesting'}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{currentPath?.category} • {currentPath?.estimatedHours}h</div>
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-mono">Overall</span>
            <span className="text-[10px] font-mono font-semibold text-cyan-400">{overall}%</span>
          </div>
          <div className="relative h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overall}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-cyan-400 to-violet-400 rounded-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
            </motion.div>
          </div>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono truncate">{streak}d streak</span>
            </div>
            <div className="hidden xs:flex h-3 w-px bg-[#1e293b] shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-mono truncate">{TOTAL_PCAPS} artifacts • offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav — grouped by platform sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
        {['platform', 'learn', 'practice', 'assess', 'track', 'reference', 'settings'].map(sectionKey => {
          const sectionItems = navItems.filter(i => i.section === sectionKey)
          if (sectionItems.length === 0) return null
          const sectionMeta = sectionLabels[sectionKey]
          return (
            <div key={sectionKey} className="space-y-1">
              {sectionMeta && (
                <div className="px-3 mb-2 flex items-center gap-2">
                  <sectionMeta.icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">{sectionMeta.label}</span>
                </div>
              )}
              {sectionItems.map((item, idx) => {
                const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
                return (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <NavLink
                      to={item.to}
                      onClick={isMobile ? onClose : undefined}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-[#1e293b] text-slate-100 border border-[#334155] shadow-soft'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-[#1e293b]/60 border border-transparent hover:border-[#1e293b]/60'
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-nav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-cyan-400 to-violet-400 rounded-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0
                        ${isActive
                          ? 'bg-[#020617] border border-[#334155] shadow-inner'
                          : 'bg-[#0f172a] border border-[#1e293b]/60 group-hover:bg-[#1e293b] group-hover:border-[#334155]/60'
                        }
                      `}>
                        <item.icon className={`w-[16px] h-[16px] transition-all duration-200 ${
                          isActive 
                            ? 'text-cyan-400' 
                            : 'text-slate-400 group-hover:text-slate-300 group-hover:scale-110'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{item.label}</span>
                          {item.badge && (
                            <span className={`
                              text-[9px] px-1.5 py-0.5 rounded-md font-mono font-semibold border transition-all duration-200
                              ${['/labs', '/challenges'].includes(item.to)
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/15'
                                : item.to === '/paths'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:bg-cyan-500/15'
                                : item.to === '/modules'
                                ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 group-hover:bg-violet-500/15'
                                : 'bg-[#1e293b] text-slate-400 border-[#334155] group-hover:bg-[#25354f]'
                              }
                            `}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`
                        w-3.5 h-3.5 transition-all duration-200 shrink-0
                        ${isActive ? 'text-slate-400 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-slate-400 group-hover:translate-x-0.5'}
                      `} />
                    </NavLink>
                  </motion.div>
                )
              })}
            </div>
          )
        })}

        <div className="pt-4 mt-4 border-t border-[#1e293b]/40">
          <div className="px-3 mb-3 flex items-center gap-2">
            <Target className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Methodology</span>
          </div>
          <div className="mx-1 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 backdrop-blur-sm relative overflow-hidden group hover:bg-[#020617]/80 hover:border-[#334155]/60 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono leading-relaxed">
                <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>{platform.philosophyShort}</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono leading-relaxed">
                {platform.tagline}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`w-1 h-1 rounded-full ${i <= 2 ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Platform • Generic VAPT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="mx-1 p-3 rounded-xl bg-gradient-to-br from-[#1e293b]/50 to-[#0f172a]/50 border border-[#334155]/50 relative overflow-hidden group hover:from-[#25354f]/60 hover:to-[#1e293b]/60 hover:border-[#475569]/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-medium text-slate-300">Lab Environment</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mode</span>
                  <span className="text-slate-300 font-mono text-[10px]">Zero-cost • Offline</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Artifacts</span>
                  <span className="text-cyan-400 font-mono text-[10px]">{TOTAL_PCAPS} verified • local-first</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer — platform brand */}
      <div className="p-4 border-t border-[#1e293b]/60 shrink-0 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#020617] border border-[#1e293b] flex items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono">{platform.name.slice(0,2).toUpperCase()}</span>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-300 leading-none">{platform.name}</div>
              <div className="text-[9px] text-slate-400 font-mono">{TOTAL_LEARNING_PATHS} paths • {TOTAL_MODULES} modules • {TOTAL_LABS} labs</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">v{platform.version}</div>
        </div>
        <div className="mt-3 text-[9px] text-slate-400 text-center font-mono tracking-wide">
          {platform.tagline} • Local-first • {platform.secondaryTagline}
        </div>
      </div>
    </aside>
  )
}