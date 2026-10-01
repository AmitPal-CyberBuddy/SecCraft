import { CERT_PROGRESS_THRESHOLD, MAX_XP, useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS, getStatsForPath } from '@/content/stats'

import { Award, Trophy, Shield, Zap, CheckCircle, Crown, Star, Download, Share2, QrCode, Map as MapIcon } from 'lucide-react'
import { useState, useMemo } from 'react'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { Link } from 'react-router-dom'
import { useLocalProfile } from '@/components/profile/LocalProfile'
import { useSession } from '@/lib/session'
import { allows, CERTIFICATE_DISABLED_NOTE } from '@/lib/access'
import { ShieldAlert } from 'lucide-react'

/**
 * Certificate entry point.
 *
 * Issuance is switched off for every user state. A certificate built from browser-local XP would
 * assert a verified achievement that nothing on the platform has confirmed, which is a worse
 * failure than not having one. The `certificate` capability in `lib/access.ts` is the single
 * switch: when the platform issues verified XP and a completion record, adding a state that
 * satisfies it restores the document below with no change to this component.
 */
export function Certificate({ className = '' }: { className?: string }) {
  const { userState } = useSession()
  if (!allows(userState, 'certificate')) return <CertificateUnavailable className={className} />
  return <CertificateDocument className={className} />
}

function CertificateUnavailable({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-6 xs:p-8 ${className}`}
      role="status"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)]">
          <ShieldAlert className="h-5 w-5 text-[var(--attention)]" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-[16px] font-semibold text-[var(--ink-primary)]">Certificates are not issued yet</h2>
          <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-[var(--ink-secondary)]">{CERTIFICATE_DISABLED_NOTE}</p>
          <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-[var(--ink-muted)]">
            We would rather show nothing than hand out a document that looks like proof of
            something the platform has not checked. Your practice achievements, levels, and module
            progress all still count — they are simply not awards of record yet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/achievements"
              className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-bg)] px-3.5 text-[12px] font-semibold text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] focus-ring"
            >
              See your achievements
            </Link>
            <Link
              to="/app"
              className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-bg)] px-3.5 text-[12px] font-semibold text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] focus-ring"
            >
              Back to the dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CertificateDocument({ className = '' }: { className?: string }) {
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
    <div className={`relative rounded-2xl bg-gradient-to-br from-[var(--panel-bg)] via-[var(--panel-bg)] to-[var(--panel-raised)] border-2 ${isCertified ? 'border-[var(--owner-border)]' : 'border-[var(--line-normal)]'} p-6 xs:p-8 overflow-hidden min-w-0 w-full ${className}`}>
      {/* Background effects */}




      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[var(--owner-border)] rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[var(--owner-border)] rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[var(--owner-border)] rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[var(--owner-border)] rounded-br-lg" />

      <div className="relative">
        {/* Header — platform + path */}
        <div className="text-center mb-6 xs:mb-8">
          <div className="w-16 h-16 xs:w-20 xs:h-20 rounded-2xl bg-gradient-to-br from-[var(--owner-bg)] to-[var(--warning-bg)] border-2 border-[var(--owner-border)] flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Crown className="w-8 h-8 xs:w-10 xs:h-10 text-[var(--owner)]" />
          </div>
          <h1 className="font-heading font-black text-[20px] xs:text-[26px] sm:text-[32px] tracking-tight leading-none">
            <span className="bg-gradient-to-r from-[var(--owner)] via-[var(--action-fill)] to-[var(--attention)] bg-clip-text text-transparent">{platform.name}</span>
            <span className="text-[var(--ink-primary)]"> Learning Record</span>
          </h1>
          <p className="text-[11px] xs:text-[12px] tracking-[0.2em] text-[var(--ink-muted)] font-semibold uppercase mt-2 flex items-center justify-center gap-2 flex-wrap">
            <span>{platform.fullName} • {platform.tagline}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
            <span className="inline-flex items-center gap-1"><MapIcon className="w-3 h-3" />{currentPath.icon} {currentPath.title} Path</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--owner-bg)]" />
            <Star className="w-4 h-4 text-[var(--attention)]" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--owner-bg)]" />
          </div>
          <div className="mt-3 text-[11px] font-mono text-[var(--ink-muted)]">
            Local practice record • {currentPath.title} • {pathStats.modules} modules • {pathStats.lessons} lessons • {pathStats.labs} labs • {pathProgress}% path progress
          </div>
        </div>

        {/* Recipient */}
        <div className="text-center mb-6">
          <div className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-widest">Local activity record for</div>
          <div className="mt-2 text-[22px] xs:text-[28px] font-heading font-bold text-[var(--ink-primary)] tracking-tight">{profile?.displayName || 'Learner'}</div>
          <div className="text-[12px] xs:text-[13px] text-[var(--ink-secondary)] mt-1">Local practice • offline-capable static build • {platform.name} • {currentPath.title}{profile ? ' • browser-local display name' : ''}</div>
        </div>

        {/* Achievement — path-aware */}
        <div className="text-center mb-6">
          <div className="text-[13px] xs:text-[14px] text-[var(--ink-secondary)] leading-relaxed max-w-[600px] mx-auto">
            This record summarizes activities marked complete in this browser: lessons, lab reviews (only three are answer-validated), knowledge checks and local challenge checkpoints. It does not attest mastery, independently verify skill, or certify professional competence.
          </div>
        </div>

        {/* Stats — platform + path */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-[var(--learning)]">{completedLessons}/{TOTAL_LESSONS}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">Lessons • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-[var(--success)]">{totalXp}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">XP Earned • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-[var(--owner)]">Lv.{level.level}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">{level.title} • Platform</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] xs:text-[20px] font-bold font-mono text-[var(--attention)]">{pathProgress}%</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">{currentPath.shortTitle} Path • {pathStats.modules} mods</div>
          </div>
        </div>

        {/* Verification — platform */}
        <div className="flex flex-col xs:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[var(--success)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-wide">Local record • self-issued • {issueDate} • {platform.name} • {currentPath.title}</div>
              <div className="text-[12px] font-mono font-bold text-[var(--ink-primary)] truncate">{certId}</div>
              <div className="text-[11px] text-[var(--ink-muted)] font-mono truncate">
                Not accredited — a printable local progress record • Platform {platform.name} • Path {currentPath.id} • {platform.tagline}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowQr(!showQr)}
              title="Show the exact numbers behind this record"
              className="w-10 h-10 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] transition-colors touch-manipulation"
            >
              <QrCode className="w-5 h-5 text-[var(--ink-secondary)]" />
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(`${platform.name} local record ${certId} — ${totalXp} XP, ${overall}% overall, ${pathProgress}% path ${currentPath.title}, ${completedLessons} lessons, ${achievements} achievements (not accredited) • ${platform.tagline}`)}
              className="px-4 py-2.5 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[12px] font-medium text-[var(--ink-secondary)] hover:bg-[var(--panel-raised)] flex items-center gap-2 touch-manipulation min-h-[44px]"
            >
              <Share2 className="w-4 h-4" /> Copy summary
            </button>
            <button
              onClick={() => window.print()}
              className="sc-learning-action px-4 py-2.5 rounded-xl font-semibold text-[12px] flex items-center gap-2 shadow-soft touch-manipulation min-h-[44px]"
            >
              <Download className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {showQr && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
            <div className="text-[11px] font-mono text-[var(--ink-secondary)] leading-relaxed">
              Record details (all values stored in this browser — platform-progress + wififorge-progress fallback):<br/>
              {certId}<br/>
              {totalXp} XP of a {MAX_XP} XP ceiling ({TOTAL_LESSONS} lessons, {TOTAL_PCAPS} bundled captures, {TOTAL_MODULES} modules)<br/>
              Platform overall {overall}% • Path {currentPath.title} {pathProgress}% • {completedLessons} lessons • {achievements} achievements • generated locally {issueDate}<br/>
              Platform: {platform.name} • {platform.tagline} • {platform.secondaryTagline}<br/>
              Philosophy: {platform.philosophy}
            </div>
          </div>
        )}

        {!isCertified && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-center">
            <div className="text-[13px] font-bold text-[var(--attention)] flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> {Math.max(0, CERT_PROGRESS_THRESHOLD - overall)}% platform activity completion • Path {currentPath.title} {pathProgress}% • {Math.max(0, CERT_PROGRESS_THRESHOLD - pathProgress)}% to path completion
            </div>
            <div className="text-[11px] text-[var(--attention)] mt-1">
              Unlocks when all shipped platform activities and all activities in this path are recorded ({CERT_PROGRESS_THRESHOLD}% each). XP is a separate local reward counter, not a mastery threshold. Current: {overall}% platform, {pathProgress}% path {currentPath.shortTitle}
            </div>
            <div className="mt-3 w-full h-2 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--warning-border)]">
              <div className="h-full bg-gradient-to-r from-[var(--attention)] to-[var(--owner)] rounded-full" style={{ width: `${Math.min(overall, 100)}%` }} />
            </div>
            <div className="mt-2 text-[10px] font-mono text-[var(--ink-muted)]">
              Platform: {platform.name} • Path: {currentPath.title} • <Link to={`/paths/${currentPathId}`} className="text-[var(--learning)] hover:text-[var(--learning)]">View path</Link> • <Link to="/paths" className="text-[var(--learning)] hover:text-[var(--learning)]">All paths</Link>
            </div>
          </div>
        )}

        {isCertified && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-[var(--success)] shrink-0" />
            <div>
              <div className="text-[14px] font-bold text-[var(--success)]">All activity records are marked complete • {platform.name} local record • {currentPath.title} {pathProgress}%</div>
              <div className="text-[12px] text-[var(--success)] mt-1">
                This browser has a record for {TOTAL_LESSONS} authored lessons, {TOTAL_PCAPS} bundled captures, and {TOTAL_MODULES} modules (path: {pathStats.modules}). Lab reviews and challenge flags are local self-report; only three lab activities have answer validation. This printable record is not accredited, proctored, or independently verified.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
