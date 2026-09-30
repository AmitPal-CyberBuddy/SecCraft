import { useState } from 'react'
import cases from '@/content/androidCases.json'
import { useProgressStore } from '@/store/useProgressStore'

/** Source-only self-review; no device evidence or answer text is sent to the server. */
export function AndroidCaseLab({ moduleId, labId }: { moduleId: string; labId: string }) {
  const item = cases.cases.find(entry => entry.id === moduleId)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [showFeedback, setShowFeedback] = useState(false)
  const completeLab = useProgressStore(state => state.completeLab)
  const completed = useProgressStore(state => state.completedLabs.some(lab => lab.moduleId === moduleId && lab.labId === labId))
  if (!item) return <p>No authored Android case for this module.</p>
  const ready = item.questions.every((_, index) => (answers[index] ?? '').trim().length >= 20)
  return <section className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 space-y-5" aria-labelledby="android-case-heading">
    <div><h3 id="android-case-heading" className="font-heading font-bold text-lg text-[var(--ink-primary)]">{item.title} · source evidence clinic</h3>
      <p className="text-sm text-slate-400 mt-2">Original fictional code excerpts, not an installed app or measured dynamic result. Write your reasoning before revealing model feedback. Local review earns no graded XP or verified skill claim.</p></div>
    <p className="text-xs text-amber-300">{cases.notice}</p>
    <div className="grid gap-4 md:grid-cols-2">
      <div><h4 className="text-sm font-semibold text-slate-200">Candidate · {item.file}</h4><pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4 text-xs text-slate-300 overflow-x-auto">{item.vulnerable}</pre></div>
      <div><h4 className="text-sm font-semibold text-slate-200">Safer comparison (illustrative)</h4><pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4 text-xs text-slate-300 overflow-x-auto">{item.fixed}</pre></div>
    </div>
    <p className="text-sm text-slate-400">{item.runtime}</p>
    <p className="text-sm text-slate-400"><strong>Limit:</strong> {item.limit}</p>
    <div className="space-y-4">{item.questions.map((question, index) => <label key={question} className="block text-sm text-slate-200">{index + 1}. {question}
      <textarea className="mt-2 block w-full rounded-lg border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3 text-slate-200" rows={3} value={answers[index] ?? ''} onChange={event => setAnswers(current => current.map((value, i) => i === index ? event.target.value : value))} placeholder="State an observation, a limit, and a safe next test" />
    </label>)}</div>
    {!showFeedback ? <button type="button" disabled={!ready} onClick={() => setShowFeedback(true)} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-40">Compare with model reasoning</button> : <div className="space-y-4" aria-live="polite"><h4 className="font-semibold text-slate-100">Model reasoning — challenge your answers</h4>
      {item.feedback.map((text, index) => <p className="text-sm text-slate-300" key={text}><strong>Question {index + 1}:</strong> {text}</p>)}
      <button type="button" disabled={completed} onClick={() => completeLab(moduleId, labId)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50">{completed ? 'Reviewed locally · not graded' : 'Record self-review (0 XP)'}</button>
    </div>}
    <div className="text-sm text-slate-400">Download the <a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-cases/cases.json`}>source case pack</a> and <a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-cases/SHA256SUMS`}>hash</a>. The only buildable project is the separate <a className="text-cyan-400 underline" href={`${import.meta.env.BASE_URL}android-demos/notes-boundary-source.zip`}>Notes Boundary source ZIP</a>; it covers the training note/URI exercise, not these other excerpts. There is no prebuilt APK here.</div>
  </section>
}
