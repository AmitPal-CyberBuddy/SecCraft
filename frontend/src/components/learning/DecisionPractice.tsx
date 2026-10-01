import { useMemo, useState } from 'react'
import { Brain, CheckCircle2, XCircle, Lightbulb, ChevronDown, FileSearch, PenLine, ListChecks } from 'lucide-react'
import scenarios from '@/content/scenarios.json'

export interface Scenario {
  id: string
  module: string
  type: 'choice' | 'evidence' | 'free' | string
  title: string
  situation: string
  question: string
  options?: { id: string; text: string; analysis: string; correct: boolean }[]
  best?: string
  rationale: string
  evidence_note: string
  model_answer?: string
}

const TYPE_META: Record<string, { label: string; icon: typeof Brain; hint: string }> = {
  choice: { label: 'Decision', icon: Brain, hint: 'Pick the action a professional would take next.' },
  evidence: { label: 'Evidence', icon: FileSearch, hint: 'Pick the artefact that actually supports the claim.' },
  free: { label: 'Write it', icon: PenLine, hint: 'Write the answer, then compare with the model answer and rubric.' },
}

export function getScenariosForModule(moduleId: string): Scenario[] {
  return (scenarios as Scenario[]).filter(s => s.module === moduleId)
}

export function DecisionPractice({
  scenarioIds,
  moduleId,
  compact = false,
}: {
  scenarioIds?: string[]
  moduleId?: string
  compact?: boolean
}) {
  const list = useMemo(() => {
    const all = scenarios as Scenario[]
    if (scenarioIds?.length) return all.filter(s => scenarioIds.includes(s.id))
    if (moduleId) return all.filter(s => s.module === moduleId)
    return all
  }, [scenarioIds, moduleId])

  if (!list.length) return null

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {list.map(s => (
        <ScenarioCard key={s.id} scenario={s} />
      ))}
    </div>
  )
}

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const meta = TYPE_META[scenario.type] ?? TYPE_META.choice
  const Icon = meta.icon
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)

  const isChoice = scenario.type === 'choice' || scenario.type === 'evidence'
  const answeredCorrectly = isChoice && picked !== null && picked === scenario.best

  return (
    <div
      className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--panel-raised)] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[var(--owner)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[var(--owner)] uppercase tracking-widest">
              Decision practice
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-secondary)]">
              {meta.label}
            </span>
            <span className="text-[9px] font-mono text-[var(--ink-secondary)]">{scenario.id}</span>
          </div>
          <h4 className="mt-2 text-[14px] font-semibold text-[var(--ink-primary)] leading-snug">{scenario.title}</h4>
          <p className="mt-1 text-[12px] text-[var(--ink-muted)] leading-relaxed line-clamp-2">{meta.hint}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--ink-muted)] shrink-0 mt-1 sc-disclosure-cue ${open ? 'rotate-180' : ''}`} />
      </button>

      <>
        {open && (
          <div
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3.5 border-t border-[var(--line-normal)] pt-4">
              <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">Situation</div>
                <p className="text-[12.5px] text-[var(--ink-secondary)] leading-relaxed">{scenario.situation}</p>
                <p className="mt-3 text-[12.5px] text-[var(--ink-primary)] font-medium leading-relaxed">{scenario.question}</p>
              </div>

              {isChoice && scenario.options && (
                <div className="space-y-2">
                  {scenario.options.map(opt => {
                    const isPicked = picked === opt.id
                    const correct = opt.id === scenario.best
                    const showState = picked !== null && (isPicked || revealed)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setPicked(opt.id)}
                        className={`w-full text-left rounded-xl border p-3 sc-surface-transition ${
                          showState && correct
                            ? 'border-[var(--success-border)] bg-[var(--success-bg)]'
                            : showState && isPicked && !correct
                              ? 'border-[var(--danger-border)] bg-[var(--danger-bg)]'
                              : isPicked
                                ? 'border-[var(--accent-border)] bg-[var(--accent-bg)]'
                                : 'border-[var(--line-normal)] bg-[var(--panel-inset)] hover:border-[var(--line-strong)]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 font-mono text-[10px] text-[var(--ink-muted)] uppercase shrink-0">{opt.id}</span>
                          <div className="min-w-0">
                            <p className="text-[12.5px] text-[var(--ink-primary)] leading-relaxed">{opt.text}</p>
                            {showState && (
                              <p className={`mt-1.5 text-[11.5px] leading-relaxed ${correct ? 'text-[var(--success)]' : 'text-[var(--ink-secondary)]'}`}>
                                {correct && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
                                {!correct && isPicked && <XCircle className="inline w-3 h-3 mr-1 -mt-0.5 text-[var(--danger)]" />}
                                {opt.analysis}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {picked && (
                    <button
                      onClick={() => setRevealed(true)}
                      className="text-[11px] font-mono text-[var(--learning)] hover:text-[var(--learning)]"
                    >
                      {revealed ? 'rationale shown below' : 'show the rationale →'}
                    </button>
                  )}
                </div>
              )}

              {scenario.type === 'free' && (
                <div className="space-y-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={5}
                    placeholder="Write your answer before revealing the model answer — the act of writing is the exercise."
                    className="w-full rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3 text-[12.5px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)] leading-relaxed"
                  />
                  <button
                    onClick={() => setRevealed(true)}
                    className="px-3 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[11.5px] text-[var(--ink-primary)] hover:bg-[var(--panel-raised)] transition-colors"
                  >
                    Reveal model answer
                  </button>
                </div>
              )}

              {(revealed || answeredCorrectly) && (
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--accent-border)] p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--learning)] mb-1.5">
                      <Lightbulb className="w-3 h-3" /> Model reasoning
                    </div>
                    <p className="text-[12.5px] text-[var(--ink-secondary)] leading-relaxed">{scenario.model_answer ?? scenario.rationale}</p>
                    {scenario.model_answer && (
                      <p className="mt-2 text-[12px] text-[var(--ink-secondary)] leading-relaxed">{scenario.rationale}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                      <ListChecks className="w-3 h-3" /> Evidence discipline
                    </div>
                    <p className="text-[12px] text-[var(--ink-secondary)] leading-relaxed">{scenario.evidence_note}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    </div>
  )
}
