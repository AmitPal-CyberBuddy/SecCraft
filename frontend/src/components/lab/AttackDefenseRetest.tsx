import { Shield, Swords, RotateCcw, CheckCircle, Zap, Target, Sparkles } from 'lucide-react'

interface Props {
  attack: {
    title: string
    description: string
    evidence: string
    impact: string
  }
  defense: {
    title: string
    description: string
    config: string
  }
  retest: {
    title: string
    description: string
    verification: string
  }
}

export function AttackDefenseRetest({ attack, defense, retest }: Props) {
  return (
    <div
      className="sc-technical-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-technical-transition"
    >


      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--owner-bg)] to-[var(--accent-bg)] border border-[var(--owner-border)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[var(--owner)]" />
            </div>
            Attack → Defense → Retest — VAPT Loop
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--owner-bg)] text-[var(--owner)] border border-[var(--owner-border)] font-mono">
              <Sparkles className="w-3 h-3" />
              METHODOLOGY
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attack */}
          <div
            className="group/card relative rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] p-5 hover:bg-[var(--danger-bg)] hover:border-[var(--danger-border)] sc-technical-transition overflow-hidden"
          >

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center justify-center ">
                  <Swords className="w-4 h-4 text-[var(--danger)]" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--danger)] uppercase">Attack</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--danger)] " />
              </div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)] mb-2 leading-tight">{attack.title}</div>
              <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed mb-3">{attack.description}</div>
              <div className="text-[11px] font-mono text-[var(--ink-muted)] bg-[var(--panel-inset)] p-3 rounded-xl border border-[var(--line-normal)] ">{attack.evidence}</div>
              <div className="mt-3 p-2.5 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex gap-2">
                <Zap className="w-3.5 h-3.5 text-[var(--danger)] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[var(--danger)] leading-relaxed">
                  <span className="font-bold">Impact:</span> {attack.impact}
                </div>
              </div>
            </div>
          </div>

          {/* Defense */}
          <div
            className="group/card relative rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] p-5 hover:bg-[var(--success-bg)] hover:border-[var(--success-border)] sc-technical-transition overflow-hidden"
          >

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center ">
                  <Shield className="w-4 h-4 text-[var(--success)]" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--success)] uppercase">Defense</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--success)] " />
              </div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)] mb-2 leading-tight">{defense.title}</div>
              <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed mb-3">{defense.description}</div>
              <div className="text-[11px] font-mono text-[var(--success)] bg-[var(--panel-inset)] p-3 rounded-xl border border-[var(--success-border)]  whitespace-pre-wrap">{defense.config}</div>
            </div>
          </div>

          {/* Retest */}
          <div
            className="group/card relative rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] p-5 hover:bg-[var(--accent-bg)] hover:border-[var(--accent-border)] sc-technical-transition overflow-hidden"
          >

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center ">
                  <RotateCcw className="w-4 h-4 text-[var(--learning)]" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-[var(--learning)] uppercase">Retest</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--action-fill)] " />
              </div>
              <div className="text-[13px] font-bold text-[var(--ink-primary)] mb-2 leading-tight">{retest.title}</div>
              <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed mb-3">{retest.description}</div>
              <div className="text-[11px] text-[var(--learning)] bg-[var(--panel-inset)] p-3 rounded-xl border border-[var(--accent-border)]  flex gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--learning)]" />
                <span className="leading-relaxed">{retest.verification}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-mono text-[var(--ink-secondary)] px-4 py-2 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] ">
          <Target className="w-3 h-3 text-[var(--owner)]" />
          <span>Learn → Observe → Enumerate → Test → Validate → Evidence → Impact → Remediate → Retest → Report</span>
        </div>
      </div>
    </div>
  )
}
