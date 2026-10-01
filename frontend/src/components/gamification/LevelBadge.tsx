import { LearningProgress } from '@/components/learning/LearningProgress'
import { CERT_PROGRESS_THRESHOLD, LEVELS, MAX_XP, useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES } from '@/content/stats'
import { ACHIEVEMENTS_DEF } from '@/content/achievements'
import { Trophy, Zap, Target, Award, Crown, Star, Sprout, Search, Radio, Shield, Flame } from 'lucide-react'
import { useMemo } from 'react'

const levelIcons = [Sprout, Search, Radio, Zap, Shield, Target, Crown, Flame]
function LevelIcon({ level, size = 16 }: { level: number; size?: number }) {
  const Icon = levelIcons[level - 1] || Sprout
  return <Icon size={size} className="mx-auto" aria-hidden="true" />
}

export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const level = useProgressStore(s => s.getLevel())
  const totalXp = useProgressStore(s => s.getTotalXp())
  const xpInfo = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent }
  }, [totalXp, level])

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] backdrop-blur-sm">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--accent-bg)] to-[var(--owner-bg)] border border-[var(--accent-border)] flex items-center justify-center">
          <LevelIcon level={level.level} size={14} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[var(--ink-primary)]">{level.title}</span>
          <span className="text-[10px] font-mono text-[var(--ink-muted)]">Lv.{level.level}</span>
        </div>
        <div className="w-12 h-1 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)] ml-1">
          <LearningProgress value={xpInfo.percent} label="Local progress to next level" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition"
    >



      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-bg)] to-[var(--owner-bg)] border border-[var(--accent-border)] flex items-center justify-center shadow-soft">
              <LevelIcon level={level.level} size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[var(--ink-primary)]">{level.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--learning)] border border-[var(--accent-border)] font-mono">LVL {level.level}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] font-mono mt-0.5">{totalXp} XP total • {LEVELS.length} levels</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-wide font-medium">Next Level</div>
            <div className="text-[13px] font-bold text-[var(--ink-primary)] font-mono">
              {xpInfo.nextLevel ? `${xpInfo.needed} XP to ${xpInfo.nextLevel.title}` : 'MAX LEVEL!'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-muted)]">{level.minXp} XP</span>
            <span className="text-[var(--ink-secondary)]">{xpInfo.percent.toFixed(0)}% to next</span>
            <span className="text-[var(--ink-muted)]">{xpInfo.nextLevel?.minXp || level.maxXp} XP</span>
          </div>
          <div className="relative h-2.5 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]">
            <LearningProgress value={xpInfo.percent} label="Local progress to next level" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {LEVELS.slice(0, 4).map(l => {
            const isCurrent = l.level === level.level
            const isPast = l.level < level.level
            return (
              <div key={l.level} className={`p-2 rounded-xl border text-center sc-surface-transition ${isCurrent ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--learning)]' : isPast ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-[var(--ink-secondary)]'}`}>
                <LevelIcon level={l.level} size={14} />
                <div className="text-[10px] font-bold mt-1">{l.title}</div>
                <div className="text-[9px] font-mono ">Lv.{l.level}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function XpProgressBar() {
  const level = useProgressStore(s => s.getLevel())
  const totalXp = useProgressStore(s => s.getTotalXp())
  const xpInfo = useMemo(() => {
    const currentLevel = level
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
    if (!nextLevel) return { current: totalXp, needed: 0, nextLevel: null, percent: 100 }
    const needed = nextLevel.minXp - totalXp
    const range = nextLevel.minXp - currentLevel.minXp
    const progressInLevel = totalXp - currentLevel.minXp
    const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
    return { current: totalXp, needed: Math.max(0, needed), nextLevel, percent }
  }, [totalXp, level])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--warning-bg)] to-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center">
          <Zap className="w-4 h-4 text-[var(--attention)]" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-[var(--ink-primary)] font-mono">{totalXp} XP</div>
          <div className="text-[10px] text-[var(--ink-muted)] font-mono">{level.title} Lv.{level.level}</div>
        </div>
      </div>
      <div className="flex-1 max-w-[120px]">
        <div className="w-full h-1.5 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]">
          <LearningProgress value={xpInfo.percent} label="Local progress to next level" />
        </div>
      </div>
    </div>
  )
}

export function CertificationPayoff() {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const overall = useProgressStore(s => s.getOverallProgress())
  const completedLessons = useProgressStore(s => s.completedLessons.length)
  const completedLabs = useProgressStore(s => s.completedLabs.length)
  const achievements = useProgressStore(s => s.achievements.length)
  const level = useProgressStore(s => s.getLevel())

  const maxXp = MAX_XP
  const percentToCert = Math.min(overall, 100)
  const isCertified = overall >= CERT_PROGRESS_THRESHOLD

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[var(--panel-bg)] via-[var(--panel-bg)] to-[var(--panel-raised)] border border-[var(--owner-border)] p-6 relative overflow-hidden group hover:border-[var(--owner-border)] sc-surface-transition"
    >



      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--owner-bg)] to-[var(--warning-bg)] border border-[var(--owner-border)] flex items-center justify-center shadow-soft">
              <Crown className="w-5 h-5 text-[var(--owner)]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[15px] text-[var(--ink-primary)] flex items-center gap-2">
                Completion record
                {isCertified && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] font-mono">UNLOCKED</span>}
              </h3>
              <p className="text-[11px] text-[var(--ink-secondary)] mt-1">A printable record of your own work — not an accredited certification</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-bold text-[var(--ink-primary)] font-mono">{Math.round(percentToCert)}%</div>
            <div className="text-[10px] text-[var(--ink-muted)] font-mono uppercase tracking-wide">To record unlock</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] font-bold text-[var(--ink-primary)] font-mono">{completedLessons}/{TOTAL_LESSONS}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">Lessons</div>
            <div className="w-full h-1 bg-[var(--panel-raised)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[var(--action-fill)] rounded-full" style={{ width: `${(completedLessons/TOTAL_LESSONS)*100}%` }} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] font-bold text-[var(--ink-primary)] font-mono">{completedLabs}/{TOTAL_LABS}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">Labs</div>
            <div className="w-full h-1 bg-[var(--panel-raised)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${(completedLabs/TOTAL_LABS)*100}%` }} />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-center">
            <div className="text-[18px] font-bold text-[var(--ink-primary)] font-mono">{achievements}/{ACHIEVEMENTS_DEF.length}</div>
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wide mt-1">Achievements</div>
            <div className="w-full h-1 bg-[var(--panel-raised)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[var(--owner)] rounded-full" style={{ width: `${(achievements/ACHIEVEMENTS_DEF.length)*100}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-muted)] flex items-center gap-1.5"><Target className="w-3 h-3" /> Platform activity progress</span>
            <span className="text-[var(--ink-secondary)]">{overall}% recorded · {totalXp} XP</span>
          </div>
          <div className="relative h-2.5 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]">
            <LearningProgress value={percentToCert} label="Local curriculum progress, not certification" />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)]">
            <span>Initiate</span>
            <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {level.title} Lv.{level.level}</span>
            <span>Forge Master</span>
          </div>
        </div>

        {isCertified ? (
          <div
            className="mt-5 p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[var(--success)]" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-[var(--success)]">Practice milestone reached — activities recorded</div>
              <div className="text-[11px] text-[var(--success)] mt-1">This is a personal practice milestone kept in this browser. No certificate is issued, and no third party issues or validates it.</div>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-start gap-2.5">
            <Star className="w-4 h-4 text-[var(--attention)] mt-0.5 shrink-0" />
            <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--attention)]">Unlock condition:</span> {CERT_PROGRESS_THRESHOLD}% of the platform activities and current path activities recorded. Activities include {TOTAL_LESSONS} lessons, {TOTAL_LABS} available labs, knowledge checks and local challenge checkpoints across {TOTAL_MODULES} modules. XP ({totalXp}/{maxXp}) is a separate local reward counter; it is not a skill or certification threshold.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
