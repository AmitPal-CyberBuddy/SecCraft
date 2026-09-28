import { motion } from 'framer-motion'
import { CERT_PROGRESS_THRESHOLD, CERT_XP_THRESHOLD, MAX_XP, useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS } from '@/content/stats'
import { ACHIEVEMENTS_DEF } from '@/content/achievements'
import { Award, Trophy, Shield, Zap, CheckCircle, Crown, Star, Download, Share2, QrCode } from 'lucide-react'
import { useState } from 'react'

export function Certificate({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const overall = useProgressStore(s => s.getOverallProgress())
  const completedLessons = useProgressStore(s => s.completedLessons.length)
  const achievements = useProgressStore(s => s.achievements.length)
  const [showQr, setShowQr] = useState(false)

  const isCertified = totalXp >= CERT_XP_THRESHOLD && overall >= CERT_PROGRESS_THRESHOLD
  // A local record number for your own tracking — it is not registered anywhere, because this build
  // has no server and no issuer.
  const certId = `LOCAL-${overall}-${totalXp}-${new Date().toISOString().slice(0, 10)}`
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
        {/* Header */}
        <div className="text-center mb-6 xs:mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="w-16 h-16 xs:w-20 xs:h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-amber-500/20 border-2 border-violet-500/30 flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
            <Crown className="w-8 h-8 xs:w-10 xs:h-10 text-violet-300" />
          </motion.div>
          <h1 className="font-heading font-black text-[20px] xs:text-[26px] sm:text-[32px] tracking-tight leading-none">
            <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent">WiFiForge</span>
            <span className="text-slate-100"> Certified</span>
          </h1>
          <p className="text-[11px] xs:text-[12px] tracking-[0.2em] text-slate-500 font-semibold uppercase mt-2">Wireless Penetration Testing Academy • Professional</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500/50" />
            <Star className="w-4 h-4 text-amber-400" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500/50" />
          </div>
        </div>

        {/* Recipient */}
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">This certifies that</div>
          <div className="mt-2 text-[22px] xs:text-[28px] font-heading font-bold text-slate-100 tracking-tight">Operator</div>
          <div className="text-[12px] xs:text-[13px] text-slate-400 mt-1">Kali Linux • Local Lab • Zero-cost • Offline</div>
        </div>

        {/* Achievement */}
        <div className="text-center mb-6">
          <div className="text-[13px] xs:text-[14px] text-slate-300 leading-relaxed max-w-[600px] mx-auto">
            Has successfully completed the <span className="font-bold text-violet-300">Wireless PT Academy</span> with mastery in 802.11 architecture, recon, traffic analysis, WEP/WPA2/WPA3, WPS, deauth, rogue AP, captive portals, Enterprise 802.1X/EAP/RADIUS, corporate attacks, and full VAPT methodology.
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-cyan-300">{completedLessons}/{TOTAL_LESSONS}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Lessons</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-emerald-300">{totalXp}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">XP Earned</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-violet-300">Lv.{level.level}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">{level.title}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-amber-300">{achievements}/{ACHIEVEMENTS_DEF.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Achievements</div>
          </div>
        </div>

        {/* Verification */}
        <div className="flex flex-col xs:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#020617]/80 border border-[#1e293b]/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wide">Local record • self-issued • {issueDate}</div>
              <div className="text-[12px] font-mono font-bold text-slate-200 truncate">{certId}</div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                Not accredited — a printable record of the work you completed on this device
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
              onClick={() => navigator.clipboard?.writeText(`WiFiForge local record ${certId} — ${totalXp} XP, ${overall}% overall, ${completedLessons} lessons, ${achievements} achievements (not accredited)`)}
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
              Record details (all values stored in this browser):<br/>
              {certId}<br/>
              {totalXp} XP of a {MAX_XP} XP ceiling ({TOTAL_LESSONS} lessons, {TOTAL_PCAPS} verified captures, {TOTAL_MODULES} modules)<br/>
              {overall}% overall • {completedLessons} lessons • {achievements} achievements • issued {issueDate}
            </div>
          </motion.div>
        )}

        {!isCertified && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-[13px] font-bold text-amber-300 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> {Math.max(0, CERT_XP_THRESHOLD - totalXp)} XP to unlock the record
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              Unlocks at {CERT_XP_THRESHOLD} XP ({Math.round((CERT_XP_THRESHOLD / MAX_XP) * 100)}% of the {MAX_XP} XP ceiling)
              and {CERT_PROGRESS_THRESHOLD}% overall • Current: {totalXp} XP, {overall}%
            </div>
            <div className="mt-3 w-full h-2 bg-[#020617] rounded-full overflow-hidden border border-amber-500/20">
              <div className="h-full bg-gradient-to-r from-amber-400 to-violet-400 rounded-full" style={{ width: `${Math.min((totalXp / CERT_XP_THRESHOLD) * 100, 100)}%` }} />
            </div>
          </div>
        )}

        {isCertified && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[14px] font-bold text-emerald-300">Coursework complete — record unlocked</div>
              <div className="text-[12px] text-emerald-400/80 mt-1">
                You have worked through the {TOTAL_LESSONS} authored lessons, {TOTAL_PCAPS} verified captures and the
                {TOTAL_MODULES}-module path on this device. Keep the printout as your own evidence of practice — it is
                not an accredited certification and no third party validates it.
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
