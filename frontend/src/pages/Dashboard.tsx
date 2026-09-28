import { useProgressStore } from '@/store/useProgressStore'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { ContinueCard } from '@/components/dashboard/ContinueCard'
import { LevelBadge, CertificationPayoff, XpProgressBar } from '@/components/gamification/LevelBadge'
import { Link } from 'react-router-dom'
import { BookOpen, FlaskConical, Swords, Trophy, Radio, Shield, Zap, Target, Clock, Activity, Wifi, TrendingUp, Award, Users, ChevronRight, Sparkles, ArrowRight, Star, Flame, Crown, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import { lazy, Suspense } from 'react'

const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })))
const DailyChallenges = lazy(() => import('@/components/gamification/DailyChallenges').then(m => ({ default: m.DailyChallenges })))
const BadgesShowcase = lazy(() => import('@/components/gamification/BadgesShowcase').then(m => ({ default: m.BadgesShowcase })))
const RealtimeLeaderboard = lazy(() => import('@/components/analytics/RealtimeLeaderboard').then(m => ({ default: m.RealtimeLeaderboard })))

export function Dashboard() {
  const getOverall = useProgressStore(s => s.getOverallProgress())
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const currentModuleId = useProgressStore(s => s.currentModule) || '02-wifi-fundamentals'
  const completedLessons = useProgressStore(s => s.completedLessons)
  const completedLabs = useProgressStore(s => s.completedLabs)
  const quizScores = useProgressStore(s => s.quizScores)
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const xpToNext = useProgressStore(s => s.getXpToNextLevel())
  const achievements = useProgressStore(s => s.achievements)

  const currentModule = modules.find(m => m.id === currentModuleId) || modules[1]
  const currentProgress = getModuleProgress(currentModule.id)

  const recentActivity = [
    { id: '1', type: 'lesson', title: 'SSID vs BSSID vs ESSID', module: '02-wifi-fundamentals', time: '2h ago', progress: 100 },
    { id: '2', type: 'lab', title: 'Beacon Frame Analysis', module: '02-wifi-fundamentals', time: '5h ago', progress: 100 },
    { id: '3', type: 'challenge', title: 'Beacon Recon', module: '05-wireless-recon', time: '1d ago', progress: 75 },
  ]

  const stats = [
    { label: 'XP Earned', value: `${totalXp}`, total: '2450', icon: Zap, color: 'amber', trend: `${level.title} Lv.${level.level}` },
    { label: 'Lessons', value: `${completedLessons.length}`, total: '80', icon: BookOpen, color: 'cyan', trend: `${Math.round((completedLessons.length/80)*100)}% complete` },
    { label: 'Labs', value: `${completedLabs.length}`, total: '20', icon: FlaskConical, color: 'emerald', trend: '16 PCAPs live' },
  ]

  return (
    <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-8 max-w-[1400px] mx-auto min-w-0 w-full min-w-0 w-full px-0" data-tour="dashboard-stats">
      {/* Header — production ready responsive */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 xs:gap-4 min-w-0"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 xs:gap-3 min-w-0">
            <h1 className="font-heading font-bold text-[22px] xs:text-[26px] sm:text-[28px] md:text-[32px] text-slate-100 tracking-tight leading-none truncate">
              Dashboard
            </h1>
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-cyan-400 tracking-wide">LIVE LAB</span>
            </div>
          </div>
          <p className="text-[13px] md:text-[14px] text-slate-400 mt-2 flex items-center gap-2">
            <span>Forge. Break. Fix. Retest.</span>
            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-600" />
            <span className="hidden sm:inline text-slate-500">Your wireless PT journey • 20 modules • Zero-cost</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="px-3 md:px-4 py-2 rounded-xl bg-[#0f172a]/80 border border-[#1e293b]/60 backdrop-blur-sm flex items-center gap-2.5 hover:bg-[#111d33]/80 hover:border-[#334155]/60 transition-all duration-200"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
            <span className="text-[11px] md:text-[12px] font-medium text-slate-300">Local Lab</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">KALI</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Top Stats Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-w-0 gap-4 md:gap-6">
        {/* Overall Progress - Large */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-1 lg:col-span-5 min-w-0 rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-7 relative overflow-hidden group hover:border-[#334155] hover:bg-[#111d33] transition-all duration-300 ease-smooth"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors duration-500" />
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="font-heading font-bold text-[16px] text-slate-100">Overall Progress</h3>
                </div>
                <p className="text-[12px] text-slate-500 mt-2">Your journey through 20 modules</p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Completion</div>
                <div className="text-[20px] font-bold text-slate-100 font-mono">{getOverall}%</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <ProgressRing value={getOverall} size={88} strokeWidth={6} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-slate-400 font-mono">{getOverall}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
                    <div className="text-[18px] font-bold text-slate-100 font-mono">{completedLessons.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Lessons</div>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
                    <div className="text-[18px] font-bold text-slate-100 font-mono">{completedLabs.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Labs</div>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
                    <div className="text-[18px] font-bold text-slate-100 font-mono">{quizScores.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Quizzes</div>
                  </div>
                </div>
                <div className="relative h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getOverall}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-cyan-400 to-violet-400 rounded-full overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid + Level */}
        <div className="col-span-1 lg:col-span-4 min-w-0 grid grid-cols-1 gap-4">
          <LevelBadge />
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2, scale: 1.01 }}
              className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 relative overflow-hidden group hover:border-[#334155] hover:bg-[#111d33] transition-all duration-300 ease-smooth cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                stat.color === 'cyan' ? 'from-cyan-500/5 to-transparent' :
                stat.color === 'emerald' ? 'from-emerald-500/5 to-transparent' :
                stat.color === 'amber' ? 'from-amber-500/5 to-transparent' :
                'from-violet-500/5 to-transparent'
              }`} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                  <div className={`
                    w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110
                    ${stat.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/15' :
                      stat.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15' :
                      stat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/15' :
                      'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15'
                    }
                  `}>
                    <stat.icon className={`w-4 h-4 ${
                      stat.color === 'cyan' ? 'text-cyan-400' :
                      stat.color === 'emerald' ? 'text-emerald-400' :
                      stat.color === 'amber' ? 'text-amber-400' :
                      'text-violet-400'
                    }`} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">{stat.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{stat.trend}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold text-slate-100 font-mono leading-none">{stat.value}</div>
                  <div className="text-[10px] text-slate-500 font-mono">/ {stat.total}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Methodology + Skills + Payoff */}
        <div className="col-span-1 lg:col-span-3 min-w-0 space-y-4">
          <CertificationPayoff />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#0a1020] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155]/80 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-xl group-hover:bg-violet-500/15 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors duration-500" />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-[13px] font-bold text-slate-100">VAPT Loop</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              </div>
              <div className="text-[11px] font-mono text-slate-400 leading-relaxed bg-[#020617]/40 rounded-lg p-2.5 border border-[#1e293b]/30">
                Learn → Observe → Enum → Test → Evidence → Remediate → Retest → Report
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <Target className="w-3 h-3 text-cyan-400" />
                <span className="text-slate-400">Current:</span>
                <span className="text-cyan-400 font-medium">Attack Labs</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 relative overflow-hidden group hover:border-[#334155] hover:bg-[#111d33] transition-all duration-300"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[13px] font-bold text-slate-100">Skills</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">6/18</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ssid', 'bssid', '802.11', 'wireshark', 'wpa2', 'eap'].map((skill, idx) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + idx * 0.05 }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  className="px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-[11px] font-mono text-slate-300 hover:bg-[#25354f] hover:border-[#475569] hover:text-slate-100 transition-all duration-200 cursor-pointer"
                >
                  {skill}
                </motion.span>
              ))}
              <span className="px-2.5 py-1 rounded-full bg-[#020617] border border-dashed border-[#334155] text-[11px] text-slate-500 font-mono">+12</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Continue + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-w-0 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-1 lg:col-span-8 min-w-0"
        >
          <ContinueCard
            moduleId={currentModule.id}
            title={currentModule.title}
            description={currentModule.description}
            progress={currentProgress}
            lessonsCompleted={completedLessons.filter(l => l.moduleId === currentModule.id).length}
            totalLessons={4}
            estimatedTime={`${currentModule.estimated_hours}h`}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="col-span-1 lg:col-span-4 min-w-0 rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 relative overflow-hidden group hover:border-[#334155]/80 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-[14px] text-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                Recent Activity
              </h3>
              <span className="text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">{recentActivity.length} recent</span>
            </div>
            <div className="space-y-3">
              {recentActivity.map((act, idx) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  className="flex gap-3 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:bg-[#020617]/80 hover:border-[#334155]/40 transition-all duration-200 cursor-pointer group/item"
                >
                  <div className={`
                    w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-200
                    ${act.type === 'lesson' 
                      ? 'bg-cyan-500/10 border-cyan-500/20 group-hover/item:bg-cyan-500/15 group-hover/item:scale-110' 
                      : act.type === 'lab'
                      ? 'bg-emerald-500/10 border-emerald-500/20 group-hover/item:bg-emerald-500/15 group-hover/item:scale-110'
                      : 'bg-violet-500/10 border-violet-500/20 group-hover/item:bg-violet-500/15 group-hover/item:scale-110'
                    }
                  `}>
                    {act.type === 'lesson' ? <BookOpen className="w-4 h-4 text-cyan-400" /> : 
                     act.type === 'lab' ? <FlaskConical className="w-4 h-4 text-emerald-400" /> :
                     <Swords className="w-4 h-4 text-violet-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-200 truncate group-hover/item:text-slate-100 transition-colors">{act.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 font-mono truncate">{act.module}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <div className="flex items-center gap-1">
                        <div className="w-8 h-1 bg-[#1e293b] rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${act.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{act.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono shrink-0">{act.time}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Learning Path */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 md:p-7 relative overflow-hidden group hover:border-[#334155]/60 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-violet-500/[0.02] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[15px] text-slate-100">Learning Path</h3>
                <p className="text-[11px] text-slate-500 font-mono">20 modules • 6 phases • Zero-cost</p>
              </div>
            </div>
            <Link to="/path" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:bg-[#25354f] hover:border-[#475569] hover:text-slate-100 transition-all duration-200 group/link">
              View full path
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-thin">
            {modules.slice(0, 10).map((m, idx) => {
              const prog = getModuleProgress(m.id)
              const isActive = m.id === currentModuleId
              return (
                <div key={m.id} className="flex items-center gap-2 flex-shrink-0">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`
                      relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all duration-300 cursor-pointer
                      ${prog === 100 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-glow-emerald' 
                        : prog > 0 
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-glow-cyan' 
                        : isActive 
                        ? 'bg-[#1e293b] border-cyan-500/50 text-cyan-400 shadow-glow-cyan' 
                        : 'bg-[#020617] border-[#1e293b] text-slate-600 hover:border-[#334155] hover:text-slate-400'
                      }
                    `}
                  >
                    {prog === 100 ? '✓' : idx + 1}
                    {isActive && prog !== 100 && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-cyan-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  <div className="hidden md:block min-w-0">
                    <div className={`text-[11px] font-medium max-w-[90px] truncate transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{m.title.split(' ').slice(0,2).join(' ')}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-8 h-1 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
                        <div className={`h-full rounded-full ${prog === 100 ? 'bg-emerald-400' : prog > 0 ? 'bg-cyan-400' : 'bg-slate-600'}`} style={{ width: `${prog}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{prog}%</span>
                    </div>
                  </div>
                  {idx < 9 && <div className="w-8 h-px bg-gradient-to-r from-[#1e293b] to-[#1e293b]/30 mx-1 hidden md:block" />}
                </div>
              )
            })}
            <div className="flex items-center gap-2 ml-2 text-[11px] text-slate-500 font-mono">
              <span>+10 more</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { to: '/modules', icon: BookOpen, title: 'Browse Modules', desc: '20 modules • 6 phases', color: 'cyan', stats: '20 total' },
          { to: '/labs', icon: FlaskConical, title: 'Hands-on Labs', desc: 'PCAP • Config • Simulated', color: 'emerald', stats: '16 PCAPs' },
          { to: '/challenges', icon: Swords, title: 'Challenges', desc: 'Guided → Assessment', color: 'violet', stats: '15 total' },
        ].map((action, idx) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Link
              to={action.to}
              className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] p-5 flex items-center gap-4 hover:bg-[#111d33] transition-all duration-300 ease-smooth overflow-hidden block"
            >
              <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                action.color === 'cyan' ? 'from-cyan-500/5 to-transparent' :
                action.color === 'emerald' ? 'from-emerald-500/5 to-transparent' :
                'from-violet-500/5 to-transparent'
              }`} />
              <div className={`
                relative w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-1
                ${action.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/15' :
                  action.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/15' :
                  'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/15'
                }
              `}>
                <action.icon className={`w-6 h-6 ${
                  action.color === 'cyan' ? 'text-cyan-400' :
                  action.color === 'emerald' ? 'text-emerald-400' :
                  'text-violet-400'
                }`} />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                  <span className="text-[14px] font-semibold text-slate-100 group-hover:text-white transition-colors">{action.title}</span>
                  <Sparkles className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
                <div className="text-[12px] text-slate-500 group-hover:text-slate-400 transition-colors">{action.desc}</div>
              </div>
              <div className="relative flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono group-hover:bg-[#25354f] group-hover:text-slate-400 transition-all duration-200">
                  {action.stats}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="min-w-0 w-full" data-tour="daily">
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Daily Challenges…</div>}>
          <DailyChallenges />
        </Suspense>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="min-w-0 w-full">
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Badges…</div>}>
          <BadgesShowcase />
        </Suspense>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="min-w-0 w-full">
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading Realtime Leaderboard…</div>}>
          <RealtimeLeaderboard />
        </Suspense>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0" data-tour="reports">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="font-heading font-bold text-[16px] text-slate-100">Enterprise Analytics — Classroom Ready</h3>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">Instructor View</span>
        </div>
        <Suspense fallback={<div className="p-6 text-center text-[13px] text-slate-500 font-mono">Loading Analytics…</div>}>
          <AnalyticsDashboard />
        </Suspense>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-slate-600 font-mono pt-2 pb-4 min-w-0"
      >
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Enterprise • Zero-cost • Local-first • Offline • Kali-ready • Production</span>
        </div>
        <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-700" />
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <Users className="w-3 h-3 text-slate-500" />
          <span>20 modules • 18 labs • 15 challenges • 16 PCAPs • Cmd+K search • Terminal • Vault • Certificate</span>
        </div>
      </motion.div>
    </div>
  )
}
