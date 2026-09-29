import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#131f36] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 uppercase tracking-widest">
              Decision practice
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400">
              {meta.label}
            </span>
            <span className="text-[9px] font-mono text-slate-400">{scenario.id}</span>
          </div>
          <h4 className="mt-2 text-[14px] font-semibold text-slate-100 leading-snug">{scenario.title}</h4>
          <p className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-2">{meta.hint}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3.5 border-t border-[#1e293b] pt-4">
              <div className="rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 p-3.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Situation</div>
                <p className="text-[12.5px] text-slate-300 leading-relaxed">{scenario.situation}</p>
                <p className="mt-3 text-[12.5px] text-slate-100 font-medium leading-relaxed">{scenario.question}</p>
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
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          showState && correct
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : showState && isPicked && !correct
                              ? 'border-rose-500/30 bg-rose-500/5'
                              : isPicked
                                ? 'border-cyan-500/30 bg-cyan-500/5'
                                : 'border-[#1e293b] bg-[#020617]/40 hover:border-[#334155]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 font-mono text-[10px] text-slate-500 uppercase shrink-0">{opt.id}</span>
                          <div className="min-w-0">
                            <p className="text-[12.5px] text-slate-200 leading-relaxed">{opt.text}</p>
                            {showState && (
                              <p className={`mt-1.5 text-[11.5px] leading-relaxed ${correct ? 'text-emerald-300/90' : 'text-slate-400'}`}>
                                {correct && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
                                {!correct && isPicked && <XCircle className="inline w-3 h-3 mr-1 -mt-0.5 text-rose-400" />}
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
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
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
                    className="w-full rounded-xl bg-[#020617]/60 border border-[#1e293b] p-3 text-[12.5px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30 leading-relaxed"
                  />
                  <button
                    onClick={() => setRevealed(true)}
                    className="px-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[11.5px] text-slate-200 hover:bg-[#25354f] transition-colors"
                  >
                    Reveal model answer
                  </button>
                </div>
              )}

              {(revealed || answeredCorrectly) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                  <div className="rounded-xl bg-[#020617]/60 border border-cyan-500/20 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5">
                      <Lightbulb className="w-3 h-3" /> Model reasoning
                    </div>
                    <p className="text-[12.5px] text-slate-300 leading-relaxed">{scenario.model_answer ?? scenario.rationale}</p>
                    {scenario.model_answer && (
                      <p className="mt-2 text-[12px] text-slate-400 leading-relaxed">{scenario.rationale}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                      <ListChecks className="w-3 h-3" /> Evidence discipline
                    </div>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{scenario.evidence_note}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
