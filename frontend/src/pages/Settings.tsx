import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useProgressStore, LEVELS } from '@/store/useProgressStore'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, TOTAL_SCENARIOS } from '@/content/stats'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Download, Trash2, FlaskConical, Award, Target, Trophy, Star, Moon, Sun, LogOut, Users, Lock, BarChart3, Keyboard } from 'lucide-react'
import { LevelBadge, CertificationPayoff } from '@/components/gamification/LevelBadge'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useLocalProfile } from '@/components/profile/LocalProfile'
import { LocalDataPanel } from '@/components/security/LocalDataPanel'
import { ProgressSyncPanel } from '@/components/progress/ProgressSyncPanel'
import { SecurityPosture } from '@/components/security/SecurityPosture'
import { useState, lazy, Suspense } from 'react'
const AccessibilityPanel = lazy(() => import('@/components/accessibility/AccessibilityPanel').then(m => ({ default: m.AccessibilityPanel })))

export function Settings() {
  const reset = useProgressStore(s => s.resetProgress)
  const overall = useProgressStore(s => s.getOverallProgress())
  const lessons = useProgressStore(s => s.completedLessons)
  const labs = useProgressStore(s => s.completedLabs)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const achievements = useProgressStore(s => s.achievements)
  const xpToNext = useProgressStore(s => s.getXpToNextLevel())
  const { theme, resolved, setTheme } = useTheme()
  const { profile, hasProfile, save, clear } = useLocalProfile()
  const [profileForm, setProfileForm] = useState<{ displayName: string }>({ displayName: '' })

  return (
    <div className="max-w-[800px] mx-auto space-y-4 xs:space-y-6 md:space-y-8 min-w-0 w-full">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/15 to-slate-600/10 border border-slate-500/20 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-[22px] xs:text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none truncate sc-page-title">Settings</h1>
          <p className="text-[12px] xs:text-[13px] text-slate-400 mt-1.5 leading-relaxed">Guest-first • Optional hosted account sync • Theme • Accessibility • Offline learning</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-violet-400" />Guest profile — local display name
          {hasProfile && <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">saved locally</span>}
        </h3>
        <p className="text-[11.5px] text-slate-400 leading-relaxed mb-4">
          This display name is stored only in this browser and does not control account access. Optional hosted accounts
          use Supabase Auth and require email verification followed by owner approval; user-selectable roles and classrooms
          are not part of SecCraft. You can keep using the learning workspace as a guest.
        </p>
        {!hasProfile ? (
          <div className="space-y-3">
            <input
              value={profileForm.displayName}
              onChange={e => setProfileForm({ displayName: e.target.value })}
              placeholder="Display name (optional)"
              maxLength={64}
              className="w-full px-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-500/30"
            />
            <button
              onClick={() => save({ displayName: profileForm.displayName || 'Guest learner' })}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              <Users className="w-4 h-4" />Save local profile
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-slate-100 truncate">{profile?.displayName}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    Guest profile • {achievements.length} local achievements • {totalXp} local XP • stored in this browser only
                  </div>
                </div>
              </div>
              <button onClick={clear} className="px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-300 flex items-center gap-2 hover:bg-[#25354f] transition-colors shrink-0 touch-manipulation min-h-[36px]">
                <LogOut className="w-4 h-4" />Clear
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-4 flex items-center gap-2">
          <Moon className="w-4 h-4 text-cyan-400" />Appearance — theme • light/dark/system
        </h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {[
            { id: 'dark', label: 'Dark', icon: Moon, desc: 'Default • low-light friendly' },
            { id: 'light', label: 'Light', icon: Sun, desc: 'High contrast • Day mode' },
            { id: 'system', label: 'System', icon: SettingsIcon, desc: 'Auto • Prefers-color-scheme' },
          ].map(t => (
            <button key={t.id} onClick={() => setTheme(t.id as any)} className={`flex-1 min-w-[120px] p-3 rounded-xl border text-left transition-all touch-manipulation ${theme === t.id ? 'bg-[#1e293b] border-[#334155] shadow-soft' : 'bg-[#020617]/60 border-[#1e293b]/40 hover:bg-[#020617]/80'}`}>
              <div className="flex items-center gap-2 mb-1">
                <t.icon className={`w-4 h-4 ${theme === t.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className={`text-[13px] font-medium ${theme === t.id ? 'text-slate-100' : 'text-slate-400'}`}>{t.label}</span>
                {theme === t.id && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <div className="text-[11px] text-slate-400">{t.desc}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">Resolved: {resolved}</div>
            </button>
          ))}
        </div>
      </motion.div>

      <SecurityPosture />

      <LocalDataPanel />

      <ProgressSyncPanel />

      <Suspense fallback={<LoadingPanel label="Loading Accessibility…" />}>
        <AccessibilityPanel />
      </Suspense>

      <LevelBadge />
      <CertificationPayoff />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300 min-w-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative min-w-0">
          <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-5 flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-cyan-400" />
            </div>
            <span>Progress & XP — Consistent Completion Marks & Payoff</span>
            <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono shrink-0">{totalXp} XP • Lv.{level.level} {level.title}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 xs:gap-4 min-w-0">
            <div className="p-3 xs:p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2"><Target className="w-3 h-3" />Overall</div>
              <div className="flex items-baseline gap-2"><div className="text-[22px] xs:text-[24px] font-bold text-slate-100 font-mono">{overall}%</div><div className="text-[11px] text-slate-400">complete</div></div>
              <div className="mt-2 h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30"><div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${overall}%` }} /></div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2"><FlaskConical className="w-3 h-3" />Lessons</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-slate-100 font-mono">{lessons.length}/{TOTAL_LESSONS}</div>
              <div className="text-[11px] text-slate-400 mt-1">{Math.round((lessons.length/TOTAL_LESSONS)*100)}% • {lessons.length*10} XP</div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2"><Trophy className="w-3 h-3" />Labs</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-slate-100 font-mono">{labs.length}/{TOTAL_LABS}</div>
              <div className="text-[11px] text-slate-400 mt-1">{labs.length*25} XP • {TOTAL_PCAPS} captures</div>
            </div>
            <div className="p-3 xs:p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 backdrop-blur-sm min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-2"><Star className="w-3 h-3" />Achievements</div>
              <div className="text-[22px] xs:text-[24px] font-bold text-slate-100 font-mono">{achievements.length}/20</div>
              <div className="text-[11px] text-slate-400 mt-1">{achievements.reduce((a,b)=>a+b.points,0)} XP bonus</div>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Level Progress — {level.title} → {xpToNext.nextLevel?.title || 'MAX'}</span>
              <span className="text-[11px] font-mono text-slate-400">{xpToNext.needed} XP to next</span>
            </div>
            <div className="h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${xpToNext.percent}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-4 xs:grid-cols-8 gap-1">
              {LEVELS.map(l => (
                <div key={l.level} className={`p-1.5 rounded-lg border text-center ${level.level >= l.level ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[#020617]/40 border-[#1e293b]/30'}`}>
                  <div className="text-[10px]">{l.icon}</div>
                  <div className={`text-[9px] font-mono font-bold ${level.level >= l.level ? 'text-amber-300' : 'text-slate-400'}`}>Lv{l.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="w-4 h-4 text-violet-400" />
            <h4 className="font-bold text-[13px] text-slate-100">Shortcuts</h4>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between"><span className="text-slate-400">Search</span><span className="text-slate-300">⌘K</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Shortcuts</span><span className="text-slate-300">?</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Labs</span><span className="text-slate-300">G L</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Dashboard</span><span className="text-slate-300">G D</span></div>
          </div>
        </div>
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-[13px] text-slate-100">Runtime</h4>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">static</span>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between"><span className="text-slate-400">Offline (PWA)</span><span className="text-emerald-400">service worker</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Accounts</span><span className="text-slate-300">optional • Supabase</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Storage</span><span className="text-cyan-400">local + opt-in sync</span></div>
            <div className="flex justify-between"><span className="text-slate-400">API</span><span className="text-amber-400">proxy or configured host</span></div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => { const data = JSON.stringify({ lessons, labs, achievements, totalXp, level, overall }, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `platform-progress-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url) }} className="flex-1 py-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-[13px] font-medium text-slate-300 flex items-center justify-center gap-2 hover:bg-[#1e293b] hover:border-[#334155] transition-all touch-manipulation min-h-[44px]">
          <Download className="w-4 h-4" />Export Progress JSON
        </button>
        <button onClick={() => { if (confirm('Reset learning progress? This clears lesson completions, lab reviews, knowledge-check passes, challenge checkpoints, streaks, achievements, and XP. Notes, drafts, profile, theme, and reports are kept.')) reset() }} className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] font-medium text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/15 hover:border-red-500/30 transition-all touch-manipulation min-h-[44px]">
          <Trash2 className="w-4 h-4" />Reset All Progress
        </button>
      </motion.div>

      <div className="text-[11px] text-slate-400 font-mono text-center pb-4">
        SecCraft — guest-first, offline-capable • {totalXp} local XP (unverified) • Lv.{level.level} {level.title} • {TOTAL_MODULES} modules • {TOTAL_LESSONS} lessons • {TOTAL_PCAPS} supplied capture artifacts • {TOTAL_SCENARIOS} decision scenarios • account sync is optional and requires hosted services
      </div>
    </div>
  )
}
