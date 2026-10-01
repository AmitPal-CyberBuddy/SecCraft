import { Link } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import modules from '@/content/modules.json'
import { TOTAL_MODULES } from '@/content/stats'
import { CheckCircle, Circle, Loader2, Lock, Sparkles, Target, BookOpen, Award, Zap, ChevronRight } from 'lucide-react'

export function LearningPath() {
  const getProgress = useProgressStore(s => s.getModuleProgress)

  const phases = [
    { id: 1, name: 'Foundations', desc: 'Wireless fundamentals & 802.11 architecture', color: 'cyan', gradient: 'from-[var(--accent-bg)] to-[var(--accent-bg)]', border: 'border-[var(--accent-border)]', text: 'text-[var(--learning)]', shadow: 'shadow-soft', modules: modules.filter(m => m.phase === 1) },
    { id: 2, name: 'Reconnaissance', desc: 'Wireless recon & traffic analysis', color: 'violet', gradient: 'from-[var(--owner-bg)] to-[var(--owner-bg)]', border: 'border-[var(--owner-border)]', text: 'text-[var(--owner)]', shadow: 'shadow-soft', modules: modules.filter(m => m.phase === 2) },
    { id: 3, name: 'Wi-Fi Security', desc: 'WEP, WPA/WPA2, WPS, WPA3 deep dive', color: 'amber', gradient: 'from-[var(--warning-bg)] to-[var(--warning-bg)]', border: 'border-[var(--warning-border)]', text: 'text-[var(--attention)]', shadow: '', modules: modules.filter(m => m.phase === 3) },
    { id: 4, name: 'Attack Techniques', desc: 'Deauth, Rogue AP, Captive Portals', color: 'emerald', gradient: 'from-[var(--success-bg)] to-[var(--success-bg)]', border: 'border-[var(--success-border)]', text: 'text-[var(--success)]', shadow: 'shadow-soft', modules: modules.filter(m => m.phase === 4) },
    { id: 5, name: 'Enterprise Wi-Fi', desc: 'Enterprise, EAP, RADIUS, Corporate', color: 'pink', gradient: 'from-[var(--owner-bg)] to-[var(--owner-bg)]', border: 'border-[var(--owner-border)]', text: 'text-[var(--owner)]', shadow: '', modules: modules.filter(m => m.phase === 5) },
    { id: 6, name: 'Professional', desc: 'Methodology & Final Assessment', color: 'slate', gradient: 'from-[var(--panel-raised)] to-[var(--panel-raised)]', border: 'border-[var(--line-strong)]', text: 'text-[var(--ink-secondary)]', shadow: '', modules: modules.filter(m => m.phase === 6) },
  ]

  return (
    <div className="ws-legacy max-w-[1000px] mx-auto space-y-6 md:space-y-8">
      <div
        className="flex items-center gap-2 xs:gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--owner-bg)] to-[var(--accent-bg)] border border-[var(--owner-border)] flex items-center justify-center">
          <Target className="w-5 h-5 text-[var(--owner)]" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-[28px] md:text-[32px] text-[var(--ink-primary)] tracking-tight leading-none sc-page-title">Learning Path</h1>
          <p className="text-[13px] text-[var(--ink-secondary)] mt-1.5">{TOTAL_MODULES} modules • 6 phases • From fundamentals to professional assessment • Zero-cost</p>
        </div>
      </div>

      <div
        className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 md:p-8 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition"
      >

        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[var(--owner)]" />
              </div>
              <div>
                <div className="font-heading font-bold text-[16px] text-[var(--ink-primary)]">Visual Progression</div>
                <div className="text-[11px] font-mono text-[var(--ink-muted)] tracking-widest uppercase">Simplified • Interactive • Premium</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span>Complete</span>
              <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
              <div className="w-2 h-2 rounded-full bg-[var(--action-fill)] " />
              <span>In Progress</span>
              <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
              <div className="w-2 h-2 rounded-full bg-[var(--panel-raised)]" />
              <span>Not Started</span>
            </div>
          </div>

          <div className="space-y-8">
            {phases.map(phase => (
              <div
                key={phase.id}
                className="relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold border backdrop-blur-sm sc-surface-transition  bg-gradient-to-br ${phase.gradient} ${phase.border} ${phase.text} ${phase.shadow}`}>
                    {phase.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                      <span className="text-[14px] font-bold text-[var(--ink-primary)]">Phase {phase.id} — {phase.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${phase.border} ${phase.text} bg-[var(--panel-inset)]`}>
                        {phase.modules.length} modules
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">{phase.desc}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-16 h-1 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]">
                      <div className={`h-full bg-gradient-to-r rounded-full ${phase.color === 'cyan' ? 'from-[var(--action-fill)] to-[var(--action-fill)]' : phase.color === 'violet' ? 'from-[var(--owner)] to-[var(--owner)]' : phase.color === 'amber' ? 'from-[var(--attention)] to-[var(--attention)]' : phase.color === 'emerald' ? 'from-[var(--success)] to-[var(--success)]' : phase.color === 'pink' ? 'from-[var(--owner)] to-[var(--owner)]' : 'from-[var(--panel-raised)] to-[var(--panel-raised)]'}`} style={{ width: `${(phase.modules.filter(m => getProgress(m.id) === 100).length / phase.modules.length) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-[var(--ink-muted)]">{phase.modules.filter(m => getProgress(m.id) === 100).length}/{phase.modules.length}</span>
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-[var(--line-normal)] pl-6 space-y-2.5 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b opacity-30 ${phase.color === 'cyan' ? 'from-[var(--accent-bg)] to-transparent' : phase.color === 'violet' ? 'from-[var(--owner-bg)] to-transparent' : phase.color === 'amber' ? 'from-[var(--warning-bg)] to-transparent' : phase.color === 'emerald' ? 'from-[var(--success-bg)] to-transparent' : phase.color === 'pink' ? 'from-[var(--owner-bg)] to-transparent' : 'from-[var(--panel-raised)] to-transparent'}`} />
                  {phase.modules.map(m => {
                    const prog = getProgress(m.id)
                    const isLocked = phase.id > 1 && m.id !== '05-wireless-recon' && prog === 0 && getProgress(modules[0].id) === 0
                    return (
                      <div
                        key={m.id}
                      >
                        <Link
                          to={`/modules/${m.id}`}
                          className={`group/module flex items-center gap-3 p-3 rounded-xl border sc-surface-transition backdrop-blur-sm ${
                            isLocked
                              ? 'bg-[var(--panel-inset)] border-[var(--line-normal)] '
                              : prog === 100
                                ? 'bg-[var(--success-bg)] border-[var(--success-border)] hover:bg-[var(--success-bg)] hover:border-[var(--success-border)]'
                                : prog > 0
                                  ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] hover:bg-[var(--accent-bg)] hover:border-[var(--accent-border)]'
                                  : 'bg-[var(--panel-inset)] border-[var(--line-normal)] hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] hover:shadow-soft'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {prog === 100 ? <div className="w-6 h-6 rounded-full bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center"><CheckCircle className="w-4 h-4 text-[var(--success)]" /></div> :
                             prog > 0 ? <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 text-[var(--learning)] " /></div> :
                             isLocked ? <div className="w-6 h-6 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center"><Lock className="w-3 h-3 text-[var(--ink-secondary)]" /></div> :
                             <div className="w-6 h-6 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center group-hover/module:bg-[var(--panel-raised)] group-hover/module:border-[var(--line-strong)] transition-colors"><Circle className="w-3.5 h-3.5 text-[var(--ink-secondary)] group-hover/module:text-[var(--ink-secondary)] transition-colors" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-[var(--ink-primary)] truncate group-hover/module:text-[var(--ink-primary)] transition-colors">{m.title}</div>
                            <div className="text-[11px] text-[var(--ink-muted)] font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{m.id}</span>
                              <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
                              <span>{m.difficulty}</span>
                              <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
                              <span>{m.estimated_hours}h</span>
                              <span className={`hidden sm:inline-flex px-1.5 py-0 rounded-full border text-[9px] font-mono ml-1 ${m.status === 'simulated' ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]' : 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]'}`}>{m.status.toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-[11px] text-[var(--ink-secondary)] font-mono px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] group-hover/module:border-[var(--line-strong)] transition-colors">{prog}%</div>
                            <ChevronRight className="w-4 h-4 text-[var(--ink-secondary)] group-hover/module:text-[var(--ink-secondary)]  sc-surface-transition" />
                          </div>
                        </Link>
                      </div>
                    )
                  })}
                </div>

                {phase.id < 6 && (
                  <div className="ml-5 mt-6 flex items-center gap-3">
                    <div className="w-px h-8 bg-gradient-to-b from-[var(--panel-raised)] to-transparent ml-5" />
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-secondary)] px-3 py-1.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--panel-raised)] " />
                      next phase
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-5 backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[var(--ink-muted)]">
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><CheckCircle className="w-4 h-4 text-[var(--success)]" /> Completed</span>
          <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Loader2 className="w-4 h-4 text-[var(--learning)]" /> In Progress</span>
          <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Circle className="w-4 h-4 text-[var(--ink-secondary)]" /> Not Started</span>
          <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
          <span className="flex items-center gap-1.5 xs:gap-2 min-w-0"><Lock className="w-4 h-4 text-[var(--ink-secondary)]" /> Locked</span>
          <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
          <span className="text-[var(--success)]">SIMULATED</span> = No hardware
          <span className="w-1 h-1 rounded-full bg-[var(--panel-raised)]" />
          <span className="text-[var(--attention)]">HARDWARE</span> = RF adapter
        </div>
      </div>
    </div>
  )
}
