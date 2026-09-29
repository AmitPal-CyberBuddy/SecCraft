import { motion } from 'framer-motion'
import { CERT_PROGRESS_THRESHOLD, MAX_XP, useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, getStatsForPath } from '@/content/stats'
import { ACHIEVEMENTS_DEF } from '@/content/achievements'
import { Award, Trophy, Shield, Zap, CheckCircle, Crown, Star, Download, Share2, QrCode, Map as MapIcon } from 'lucide-react'
import { useState, useMemo } from 'react'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { Link } from 'react-router-dom'
import { useLocalProfile } from '@/components/profile/LocalProfile'

export function Certificate({ className = '' }: { className?: string }) {
  const { profile } = useLocalProfile()
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const overall = useProgressStore(s => s.getOverallProgress())
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const currentPathId = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const completedLessons = useProgressStore(s => s.completedLessons.length)
  const achievements = useProgressStore(s => s.achievements.length)
  const [showQr, setShowQr] = useState(false)

  const currentPath = learningPaths.find(p => p.id === currentPathId) || learningPaths[0]
  const pathProgress = getPathProgress(currentPathId)
  const pathStats = useMemo(() => getStatsForPath(currentPathId), [currentPathId])

  const isCertified = overall >= CERT_PROGRESS_THRESHOLD && pathProgress >= CERT_PROGRESS_THRESHOLD
  // A local record number for personal reference. It is not registered, signed, or issued by the account API.
  const certId = `LOCAL-RECORD-${platform.name.toUpperCase()}-${currentPath.shortTitle.toUpperCase()}-${overall}-${totalXp}-${new Date().toISOString().slice(0, 10)}`
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#1a1033] border-2 ${isCertified ? 'border-violet-500/40' : 'border-[#1e293b]'} p-6 xs:p-8 overflow-hidden min-w-0 w-full ${className}`}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.08] via-cyan-500/[0.04] to-amber-500/[0.03] opacity-80" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-violet-500/30 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-violet-500/30 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-violet-500/30 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-violet-500/30 rounded-br-lg" />

      <div className="relative">
        {/* Header — platform + path */}
        <div className="text-center mb-6 xs:mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="w-16 h-16 xs:w-20 xs:h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-amber-500/20 border-2 border-violet-500/30 flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
            <Crown className="w-8 h-8 xs:w-10 xs:h-10 text-violet-300" />
          </motion.div>
          <h1 className="font-heading font-black text-[20px] xs:text-[26px] sm:text-[32px] tracking-tight leading-none">
            <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">{platform.name}</span>
            <span className="text-slate-100"> Learning Record</span>
          </h1>
          <p className="text-[11px] xs:text-[12px] tracking-[0.2em] text-slate-500 font-semibold uppercase mt-2 flex items-center justify-center gap-2 flex-wrap">
            <span>{platform.fullName} • {platform.tagline}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="inline-flex items-center gap-1"><MapIcon className="w-3 h-3" />{currentPath.icon} {currentPath.title} Path</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500/50" />
            <Star className="w-4 h-4 text-amber-400" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500/50" />
          </div>
          <div className="mt-3 text-[11px] font-mono text-slate-500">
            Local practice record • {currentPath.title} • {pathStats.modules} modules • {pathStats.lessons} lessons • {pathStats.labs} labs • {pathProgress}% path progress
          </div>
        </div>

        {/* Recipient */}
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Local activity record for</div>
          <div className="mt-2 text-[22px] xs:text-[28px] font-heading font-bold text-slate-100 tracking-tight">{profile?.displayName || 'Learner'}</div>
          <div className="text-[12px] xs:text-[13px] text-slate-400 mt-1">Local practice • offline-capable static build • {platform.name} • {currentPath.title}{profile ? ' • browser-local display name' : ''}</div>
        </div>

        {/* Achievement — path-aware */}
        <div className="text-center mb-6">
          <div className="text-[13px] xs:text-[14px] text-slate-300 leading-relaxed max-w-[600px] mx-auto">
            This record summarizes activities marked complete in this browser: lessons, lab reviews (only three are answer-validated), knowledge checks and local challenge checkpoints. It does not attest mastery, independently verify skill, or certify professional competence.
          </div>
        </div>

        {/* Stats — platform + path */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-cyan-300">{completedLessons}/{TOTAL_LESSONS}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Lessons • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-emerald-300">{totalXp}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">XP Earned • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-violet-300">Lv.{level.level}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">{level.title} • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-amber-300">{pathProgress}%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">{currentPath.shortTitle} Path • {pathStats.modules} mods</div>
          </div>
        </div>

        {/* Verification — platform */}
        <div className="flex flex-col xs:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#020617]/80 border border-[#1e293b]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wide">Local record • self-issued • {issueDate} • {platform.name} • {currentPath.title}</div>
              <div className="text-[12px] font-mono font-bold text-slate-200 truncate">{certId}</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                Not accredited — a printable local progress record • Platform {platform.name} • Path {currentPath.id} • {platform.tagline}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowQr(!showQr)}
              title="Show the exact numbers behind this record"
              className="w-10 h-10 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation"
            >
              <QrCode className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(`${platform.name} local record ${certId} — ${totalXp} XP, ${overall}% overall, ${pathProgress}% path ${currentPath.title}, ${completedLessons} lessons, ${achievements} achievements (not accredited) • ${platform.tagline}`)}
              className="px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-slate-300 hover:bg-[#25354f] flex items-center gap-2 touch-manipulation min-h-[44px]"
            >
              <Share2 className="w-4 h-4" /> Copy summary
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center gap-2 shadow-glow-violet touch-manipulation min-h-[44px]"
            >
              <Download className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {showQr && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-[#020617] border border-[#1e293b]">
            <div className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Record details (all values stored in this browser — platform-progress + wififorge-progress fallback):<br/>
              {certId}<br/>
              {totalXp} XP of a {MAX_XP} XP ceiling ({TOTAL_LESSONS} lessons, {TOTAL_PCAPS} bundled captures, {TOTAL_MODULES} modules)<br/>
              Platform overall {overall}% • Path {currentPath.title} {pathProgress}% • {completedLessons} lessons • {achievements} achievements • generated locally {issueDate}<br/>
              Platform: {platform.name} • {platform.tagline} • {platform.secondaryTagline}<br/>
              Philosophy: {platform.philosophy}
            </div>
          </motion.div>
        )}

        {!isCertified && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-[13px] font-bold text-amber-300 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> {Math.max(0, CERT_PROGRESS_THRESHOLD - overall)}% platform activity completion • Path {currentPath.title} {pathProgress}% • {Math.max(0, CERT_PROGRESS_THRESHOLD - pathProgress)}% to path completion
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              Unlocks when all shipped platform activities and all activities in this path are recorded ({CERT_PROGRESS_THRESHOLD}% each). XP is a separate local reward counter, not a mastery threshold. Current: {overall}% platform, {pathProgress}% path {currentPath.shortTitle}
            </div>
            <div className="mt-3 w-full h-2 bg-[#020617] rounded-full overflow-hidden border border-amber-500/20">
              <div className="h-full bg-gradient-to-r from-amber-400 to-violet-400 rounded-full" style={{ width: `${Math.min(overall, 100)}%` }} />
            </div>
            <div className="mt-2 text-[10px] font-mono text-slate-500">
              Platform: {platform.name} • Path: {currentPath.title} • <Link to={`/paths/${currentPathId}`} className="text-cyan-400 hover:text-cyan-300">View path</Link> • <Link to="/paths" className="text-cyan-400 hover:text-cyan-300">All paths</Link>
            </div>
          </div>
        )}

        {isCertified && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[14px] font-bold text-emerald-300">All activity records are marked complete • {platform.name} local record • {currentPath.title} {pathProgress}%</div>
              <div className="text-[12px] text-emerald-400/80 mt-1">
                This browser has a record for {TOTAL_LESSONS} authored lessons, {TOTAL_PCAPS} bundled captures, and {TOTAL_MODULES} modules (path: {pathStats.modules}). Lab reviews and challenge flags are local self-report; only three lab activities have answer validation. This printable record is not accredited, proctored, or independently verified.
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
