import { useState, useEffect } from 'react'
import { useProgressStore } from '@/store/useProgressStore'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, Trophy, FileText, Flag, Lightbulb, CheckCircle, XCircle, Target, Sparkles, Award, BookOpen, FlaskConical } from 'lucide-react'
import { PcapInspector } from '@/components/lab/PcapInspector'
import { motion, AnimatePresence } from 'framer-motion'
import challenges from '@/content/challenges.json'

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>()
  const challenge = challenges.find(c => c.id === id)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(`challenge-draft:${id}`) || '{}') } catch { return {} }
  })
  const [showHints, setShowHints] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [flagInput, setFlagInput] = useState('')
  const [flagCorrect, setFlagCorrect] = useState<boolean | null>(null)
  const completeChallenge = useProgressStore(s => s.completeChallenge)
  const completedChallenges = useProgressStore(s => s.completedChallenges)
  const checkpointSaved = completedChallenges.some(item => item.challengeId === id)

  useEffect(() => {
    try { setAnswers(JSON.parse(localStorage.getItem(`challenge-draft:${id}`) || '{}')) } catch { setAnswers({}) }
    setSubmitted(false); setFlagInput(''); setFlagCorrect(null); setPointsAwarded(0)
  }, [id])

  useEffect(() => {
    try { localStorage.setItem(`challenge-draft:${id}`, JSON.stringify(answers)) } catch {}
  }, [id, answers])

  if (!challenge) {
    return (
      <div className="ws-legacy max-w-[800px] mx-auto p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-500" />
        </div>
        <div className="text-slate-400 font-heading text-[16px]">Challenge not found: {id}</div>
        <Link to="/challenges" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] text-[13px] text-slate-300 hover:bg-[#25354f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to challenges
        </Link>
      </div>
    )
  }

  const handleFlagSubmit = () => {
    if (!submitted) { alert('Complete your written task responses, then reveal the answer key for self-review before submitting the local checkpoint.'); return }
    if (challenge.tasks.some((task: any) => !answers[task.id]?.trim())) { alert('Add a response to every task before submitting the checkpoint.'); return }
    if (flagInput.trim() === challenge.flag) {
      const result = completeChallenge(challenge.id)
      setPointsAwarded(result.points)
      setFlagCorrect(true)
    } else setFlagCorrect(false)
  }

  // Free-response tasks are not machine-graded. The progress indicator reflects drafts entered,
  // not correctness; learners compare their reasoning with the authored answer key themselves.
  const answeredTasks = challenge.tasks.filter((task: any) => Boolean(answers[task.id]?.trim())).length
  const taskProgress = challenge.tasks.length ? Math.round((answeredTasks / challenge.tasks.length) * 100) : 0

  return (
    <div className="ws-legacy ws-challenge-task max-w-[1200px] mx-auto space-y-6">
      <nav className="ws-breadcrumb" aria-label="Breadcrumb"><Link to="/challenges">Challenges</Link><span aria-hidden="true">/</span><span aria-current="page">{challenge.title}</span></nav>
      <header className="sc-task-header"><div><p className="sc-library-domain">{challenge.module} / {challenge.level.replace('-', ' ')} / {challenge.status === 'simulated' ? 'Local simulation' : 'Authorized environment required'}</p><h1>{challenge.title}</h1><p>{challenge.description}</p><div className="sc-unit-meta"><span>{challenge.difficulty}</span><span>{challenge.estimated_time} estimated</span><span>{challenge.tasks.length} tasks</span><span>{challenge.points} browser-local practice XP</span></div></div><aside><span>Written responses</span><strong>{answeredTasks} / {challenge.tasks.length}</strong><div role="progressbar" aria-label="Task responses entered, not graded" aria-valuemin={0} aria-valuemax={challenge.tasks.length} aria-valuenow={answeredTasks} className="ws-progress"><span style={{ width: `${taskProgress}%` }} /></div><small>{checkpointSaved ? 'Checkpoint saved locally' : 'Not yet recorded'} · self-review, not trusted grading</small></aside></header>

      <section className="sc-investigation-guide" aria-label="Investigation workflow"><h2>Investigation workflow</h2><p>Read the objective and scope below, inspect only the supplied evidence, answer each task with your reasoning, then compare against the answer key. Submit saves a local self-review checkpoint, not a graded result.</p><ol><li>Objective & scope</li><li>Available evidence</li><li>Written responses</li><li>Reasoning & self-review</li></ol></section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Objectives */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-cyan-400" />
                </div>
                Objectives
              </h3>
              <ul className="space-y-2.5">
                {challenge.objectives.map((obj: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-[13px] text-slate-300 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Artifacts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                </div>
                Artifacts
                <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-slate-500 font-mono">{challenge.artifacts.length} files</span>
              </h3>
              <div className="space-y-4">
                {challenge.artifacts.map((artifact: string) => {
                  if (artifact.endsWith('.pcapng')) {
                    const pcapId = artifact.replace('.pcapng', '')
                    return (
                      <div key={artifact}>
                        <div className="text-[11px] font-mono text-slate-500 mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)]">{artifact}</span>
                        </div>
                        <PcapInspector pcapId={pcapId} />
                      </div>
                    )
                  } else if (artifact.endsWith('.conf')) {
                    return <div key={artifact} className="sc-task-artifact"><strong>{artifact}</strong><p>Configuration reference named by this exercise. No configuration file is bundled here; use the authored task context and do not infer findings from a placeholder.</p></div>
                  } else {
                    return <div key={artifact} className="text-[12px] text-slate-400 font-mono p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">{artifact}</div>
                  }
                })}
              </div>
            </div>
          </motion.div>

          {/* Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                </div>
                Tasks
                <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-slate-500 font-mono">{challenge.tasks.length} tasks</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mb-5 px-11">
                {challenge.level === 'guided' ? 'Guided (steps provided)' : challenge.level === 'semi-guided' ? 'Semi-guided (objective + tools, no exact command)' : 'Assessment (only scope + artifacts)'}
              </p>
              {submitted && <div className="challenge-review-summary mb-5" aria-live="polite">
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-slate-200">Answer key revealed · self-review</span><span className="text-[10px] font-mono text-slate-400">{answeredTasks} / {challenge.tasks.length} responses entered · not graded</span></div>
                <div className="challenge-review-track" role="progressbar" aria-label="Task responses entered" aria-valuemin={0} aria-valuemax={challenge.tasks.length} aria-valuenow={answeredTasks}><span style={{ width: `${taskProgress}%` }} /></div>
              </div>}
              <div className="space-y-4">
                {challenge.tasks.map((task: any) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/60 p-4  hover:bg-[var(--panel-inset)]/80 hover:border-[var(--line-strong)]/50 transition-all duration-200"
                  >
                    <label htmlFor={`challenge-response-${task.id}`} className="block text-[13px] font-medium text-slate-200 mb-3 leading-relaxed">{task.question}</label>
                    <textarea id={`challenge-response-${task.id}`} rows={3}
                      value={answers[task.id] || ''}
                      onChange={e => { setAnswers({...answers, [task.id]: e.target.value}); setFlagCorrect(null) }}
                      placeholder="Your answer..."
                      className="w-full px-4 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 placeholder:text-slate-400 focus:border-cyan-500/30 focus:bg-[#111d33]/80 focus:outline-none hover:border-[var(--line-strong)]/60 transition-all duration-200"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2 mt-3">
                      <button onClick={() => setShowHints({...showHints, [task.id]: !showHints[task.id]})} className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--panel-bg)]/60 border border-[var(--line-normal)]/40 hover:bg-[#1e293b]/60 hover:border-[var(--line-strong)]/40 transition-all duration-200">
                        <Lightbulb className="w-3 h-3" /> {showHints[task.id] ? 'Hide hint' : 'Show hint'}
                      </button>
                      {submitted && (
                        <div className="text-[11px] px-2.5 py-1 rounded-full border font-mono bg-amber-500/10 text-amber-300 border-amber-500/20" aria-live="polite">
                          Compare with answer key (not machine-graded): {task.answer}
                        </div>
                      )}
                    </div>
                    <AnimatePresence>
                      {showHints[task.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          className="mt-3 p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/15 text-[11px] text-cyan-300 leading-relaxed flex gap-2"
                        >
                          <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>Hint: {task.hint}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                <motion.button
                  onClick={() => setSubmitted(true)}
                  className={`w-full py-3 rounded-xl font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 ${
                    submitted
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-[#1e293b] border border-[var(--line-strong)] text-slate-200 hover:bg-[#25354f] hover:border-[#475569] hover:text-[var(--ink-primary)] shadow-soft'
                  }`}
                >
                  {submitted ? <><CheckCircle className="w-4 h-4" /> Answers Revealed — Compare with expected</> : <><Target className="w-4 h-4" /> Check Answers</>}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Flag */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-violet-500/20 p-6 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-violet-400" />
                </div>
                Local Practice Checkpoint
                <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">WIFIFORGE{`{...}`}</span>
              </h3>
              <div className="flex gap-3">
                <label htmlFor="local-checkpoint" className="sr-only">Local practice checkpoint flag</label>
                <input id="local-checkpoint"
                  value={flagInput}
                  onChange={e => { setFlagInput(e.target.value); setFlagCorrect(null) }}
                  placeholder="WIFIFORGE{...}"
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 placeholder:text-slate-400 focus:border-violet-500/30 focus:bg-[#0a1020] focus:outline-none hover:border-[var(--line-strong)]/60 transition-all duration-200"
                />
                <motion.button
                  onClick={handleFlagSubmit}
                  className="px-6 py-3 rounded-xl bg-[var(--learning)] text-slate-950 text-[13px] font-bold transition-all duration-300 flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Submit
                </motion.button>
              </div>
              <AnimatePresence>
                {(flagCorrect === true || (checkpointSaved && flagCorrect !== false)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[13px] text-emerald-400 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">{flagCorrect === true && pointsAwarded > 0 ? 'Local practice checkpoint recorded.' : 'Checkpoint was already recorded on this device.'}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{pointsAwarded > 0 ? `+${pointsAwarded} XP (first completion only)` : 'No additional XP for a repeat submission'} • Not graded, proctored or a verified skill credential.</div>
                    </div>
                  </motion.div>
                )}
                {flagCorrect === false && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">Incorrect flag</div>
                      <div className="text-[11px] opacity-80 mt-0.5">Check tasks and evidence</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4 text-[11px] text-slate-500 leading-relaxed p-3 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40">
                Local-first practice only: task responses are self-reviewed against the answer key, and flags/checkpoint rules are shipped in this browser app. This is not a secure/proctored assessment or independent proof of skill.
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >
            <div className="text-[12px] font-bold text-slate-200 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
              </div>
              Challenge Info
            </div>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40"><span className="text-slate-500">Type</span><span className="text-slate-300 font-medium capitalize">{challenge.type.replace('_', ' ')}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40"><span className="text-slate-500">Level</span><span className="text-slate-300 font-medium capitalize">{challenge.level}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40"><span className="text-slate-500">Difficulty</span><span className="text-slate-300 font-medium">{challenge.difficulty}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40"><span className="text-slate-500">Time</span><span className="text-slate-300 font-medium font-mono">{challenge.estimated_time}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15"><span className="text-slate-500">Local practice XP</span><span className="text-amber-400 font-bold font-mono flex items-center gap-1"><Trophy className="w-3 h-3" />{challenge.points}</span></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >
            <div className="text-[12px] font-bold text-slate-200 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {challenge.skills.map((skill: string) => (
                <span key={skill} className="px-3 py-1.5 rounded-full bg-[#1e293b]/60 border border-[var(--line-strong)]/60 text-[11px] font-mono text-slate-300 hover:bg-[#25354f]/60 hover:border-[#475569]/60 hover:text-slate-200 transition-all duration-200">{skill}</span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40 p-5 "
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-[11px] font-mono text-slate-500 leading-relaxed">
                {challenge.level === 'guided' && "Guided: Step 1 Run..., Step 2 Observe..., Step 3 Analyze... — for learning"}
                {challenge.level === 'semi-guided' && "Semi-guided: Objective + tools, no exact command — you figure methodology"}
                {challenge.level === 'assessment' && "Assessment: Only scope + artifacts — you determine methodology like real engagement"}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)]/60 transition-all duration-300"
          >
            <div className="text-[12px] font-bold text-slate-200 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
              </div>
              Reporting
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed p-3 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40">
              After solving, practice writing finding: Title, Severity, Description, Evidence (PCAP frame numbers, config snippet), Impact, Recommendation, Retest. Use Reports → Finding Editor.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
