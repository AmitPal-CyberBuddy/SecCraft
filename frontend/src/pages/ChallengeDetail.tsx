import { PracticeAvailability } from '@/components/common/PracticeAvailability'
import { Notice } from '@/components/common/Controls'
import { useState, useEffect } from 'react'
import { useProgressStore } from '@/store/useProgressStore'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, FileText, Flag, Lightbulb, CheckCircle, XCircle, Target, Sparkles, Award, BookOpen, FlaskConical } from 'lucide-react'
import { PcapInspector } from '@/components/lab/PcapInspector'
import challenges from '@/content/challenges.json'

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>()
  return <ChallengeSession key={id} id={id} />
}

function ChallengeSession({ id }: { id?: string }) {
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

  const [draftStatus, setDraftStatus] = useState('Saving draft…')
  useEffect(() => {
    if (!id) return
    try {
      localStorage.setItem(`challenge-draft:${id}`, JSON.stringify(answers))
      setDraftStatus('Draft saved in this browser · not submitted or graded')
    } catch {
      setDraftStatus('Draft could not be saved. Keep this page open and copy your responses before leaving.')
    }
  }, [id, answers])

  if (!challenge) {
    return (
      <div className="ws-legacy max-w-[800px] mx-auto p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[var(--ink-muted)]" />
        </div>
        <div className="text-[var(--ink-secondary)] font-heading text-[16px]">Challenge not found: {id}</div>
        <Link to="/challenges" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[13px] text-[var(--ink-secondary)] hover:bg-[var(--panel-raised)] transition-colors">
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
      <header className="sc-task-header"><div><p className="sc-library-domain">{challenge.module} / {challenge.level.replace('-', ' ')} / {challenge.status === 'simulated' ? 'Offline evidence' : 'Offline reasoning; RF validation not supplied'}</p><h1>{challenge.title}</h1><p>{challenge.description}</p><div className="sc-unit-meta"><span>{challenge.difficulty}</span><span>{challenge.estimated_time} estimated</span><span>{challenge.tasks.length} tasks</span><span>{challenge.points} browser-local practice XP</span></div></div><aside><span>Written responses</span><strong>{answeredTasks} / {challenge.tasks.length}</strong><div role="progressbar" aria-label="Task responses entered, not graded" aria-valuemin={0} aria-valuemax={challenge.tasks.length} aria-valuenow={answeredTasks} className="ws-progress"><span style={{ width: `${taskProgress}%` }} /></div><small>{checkpointSaved ? 'Checkpoint saved locally' : 'Not yet recorded'} · self-review, not trusted grading</small></aside></header>

      <section className="sc-investigation-guide" aria-label="Investigation workflow"><h2>Investigation workflow</h2><p>Read the objective and scope below, inspect only the supplied evidence, answer each task with your reasoning, then compare against the answer key. Submit saves a local self-review checkpoint, not a graded result.</p><ol><li>Objective & scope</li><li>Available evidence</li><li>Written responses</li><li>Reasoning & self-review</li></ol></section>
      <PracticeAvailability />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Objectives */}
          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center">
                  <Target className="w-4 h-4 text-[var(--learning)]" />
                </div>
                Objectives
              </h3>
              <ul className="space-y-2.5">
                {challenge.objectives.map((obj: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-[13px] text-[var(--ink-secondary)] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-fill)]" />
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Artifacts */}
          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-[var(--success)]" />
                </div>
                Artifacts
                <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono">{challenge.artifacts.length} files</span>
              </h3>
              <div className="space-y-4">
                {challenge.artifacts.map((artifact: string) => {
                  if (artifact.endsWith('.pcapng')) {
                    const pcapId = artifact.replace('.pcapng', '')
                    return (
                      <div key={artifact}>
                        <div className="text-[11px] font-mono text-[var(--ink-muted)] mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)]">{artifact}</span>
                        </div>
                        <PcapInspector pcapId={pcapId} />
                      </div>
                    )
                  } else if (artifact.endsWith('.conf')) {
                    return <div key={artifact} className="sc-task-artifact"><strong>{artifact}</strong><p>Configuration reference named by this exercise. No configuration file is bundled here; use the authored task context and do not infer findings from a placeholder.</p></div>
                  } else {
                    return <div key={artifact} className="text-[12px] text-[var(--ink-secondary)] font-mono p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">{artifact}</div>
                  }
                })}
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden group hover:border-[var(--line-strong)] sc-surface-transition"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[var(--owner)]" />
                </div>
                Tasks
                <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono">{challenge.tasks.length} tasks</span>
              </h3>
              <p className="text-[11px] text-[var(--ink-muted)] font-mono mb-5 px-11">
                {challenge.level === 'guided' ? 'Guided (steps provided)' : challenge.level === 'semi-guided' ? 'Semi-guided (objective + tools, no exact command)' : 'Assessment (only scope + artifacts)'}
              </p>
              <div className="mb-4"><Notice live>{draftStatus}</Notice></div>
              {submitted && <div className="challenge-review-summary mb-5" aria-live="polite">
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-[var(--ink-primary)]">Answer key revealed · self-review</span><span className="text-[10px] font-mono text-[var(--ink-secondary)]">{answeredTasks} / {challenge.tasks.length} responses entered · not graded</span></div>
                <div className="challenge-review-track" role="progressbar" aria-label="Task responses entered" aria-valuemin={0} aria-valuemax={challenge.tasks.length} aria-valuenow={answeredTasks}><span style={{ width: `${taskProgress}%` }} /></div>
              </div>}
              <div className="space-y-4">
                {challenge.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4  hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] sc-surface-transition"
                  >
                    <label htmlFor={`challenge-response-${task.id}`} className="block text-[13px] font-medium text-[var(--ink-primary)] mb-3 leading-relaxed">{task.question}</label>
                    <textarea id={`challenge-response-${task.id}`} rows={3}
                      value={answers[task.id] || ''}
                      onChange={e => { setAnswers({...answers, [task.id]: e.target.value}); setFlagCorrect(null) }}
                      placeholder="Your answer..."
                      className="w-full px-4 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[13px] font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:border-[var(--accent-border)] focus:bg-[var(--panel-raised)] focus:outline-none hover:border-[var(--line-strong)] sc-surface-transition"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2 mt-3">
                      <button onClick={() => setShowHints({...showHints, [task.id]: !showHints[task.id]})} className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--panel-bg)] border border-[var(--line-normal)] hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] sc-surface-transition">
                        <Lightbulb className="w-3 h-3" /> {showHints[task.id] ? 'Hide hint' : 'Show hint'}
                      </button>
                      {submitted && (
                        <div className="text-[11px] px-2.5 py-1 rounded-full border font-mono bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]" aria-live="polite">
                          Compare with answer key (not machine-graded): {task.answer}
                        </div>
                      )}
                    </div>
                    <>
                      {showHints[task.id] && (
                        <div
                          className="mt-3 p-3 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[11px] text-[var(--learning)] leading-relaxed flex gap-2"
                        >
                          <Lightbulb className="w-4 h-4 text-[var(--learning)] shrink-0 mt-0.5" />
                          <span>Hint: {task.hint}</span>
                        </div>
                      )}
                    </>
                  </div>
                ))}

                <button
                  onClick={() => setSubmitted(true)}
                  className={`w-full py-3 rounded-xl font-semibold text-[13px] sc-surface-transition flex items-center justify-center gap-2 ${
                    submitted
                      ? 'bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)]'
                      : 'bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-primary)] hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] hover:text-[var(--ink-primary)] shadow-soft'
                  }`}
                >
                  {submitted ? <><CheckCircle className="w-4 h-4" /> Answers Revealed — Compare with expected</> : <><Target className="w-4 h-4" /> Check Answers</>}
                </button>
              </div>
            </div>
          </div>

          {/* Flag */}
          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--owner-border)] p-6 relative overflow-hidden group hover:border-[var(--owner-border)] sc-surface-transition"
          >

            <div className="relative">
              <h3 className="font-heading font-bold text-[14px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                  <Flag className="w-4 h-4 text-[var(--owner)]" />
                </div>
                Local Practice Checkpoint
                <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-[var(--owner-bg)] text-[var(--owner)] border border-[var(--owner-border)] font-mono">WIFIFORGE{`{...}`}</span>
              </h3>
              <div className="flex gap-3">
                <label htmlFor="local-checkpoint" className="sr-only">Local practice checkpoint flag</label>
                <input id="local-checkpoint"
                  value={flagInput}
                  onChange={e => { setFlagInput(e.target.value); setFlagCorrect(null) }}
                  placeholder="WIFIFORGE{...}"
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:border-[var(--owner-border)] focus:bg-[var(--panel-inset)] focus:outline-none hover:border-[var(--line-strong)] sc-surface-transition"
                />
                <button
                  onClick={handleFlagSubmit}
                  className="px-6 py-3 rounded-xl sc-learning-action text-[13px] font-bold sc-surface-transition flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Submit
                </button>
              </div>
              <>
                {(flagCorrect === true || (checkpointSaved && flagCorrect !== false)) && (
                  <div
                    className="mt-4 p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[13px] text-[var(--success)] flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">{flagCorrect === true && pointsAwarded > 0 ? 'Local practice checkpoint recorded.' : 'Checkpoint was already recorded on this device.'}</div>
                      <div className="text-[11px]  mt-0.5">{pointsAwarded > 0 ? `+${pointsAwarded} XP (first completion only)` : 'No additional XP for a repeat submission'} • Not graded, proctored or a verified skill credential.</div>
                    </div>
                  </div>
                )}
                {flagCorrect === false && (
                  <div
                    className="mt-4 p-4 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[13px] text-[var(--danger)] flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold">Incorrect flag</div>
                      <div className="text-[11px]  mt-0.5">Check tasks and evidence</div>
                    </div>
                  </div>
                )}
              </>
              <div className="mt-4 text-[11px] text-[var(--ink-muted)] leading-relaxed p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                Local-first practice only: task responses are self-reviewed against the answer key, and flags/checkpoint rules are shipped in this browser app. This is not a secure/proctored assessment or independent proof of skill.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)] sc-surface-transition"
          >
            <div className="text-[12px] font-bold text-[var(--ink-primary)] mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[var(--owner)]" />
              </div>
              Challenge Info
            </div>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]"><span className="text-[var(--ink-muted)]">Type</span><span className="text-[var(--ink-secondary)] font-medium capitalize">{challenge.type.replace('_', ' ')}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]"><span className="text-[var(--ink-muted)]">Level</span><span className="text-[var(--ink-secondary)] font-medium capitalize">{challenge.level}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]"><span className="text-[var(--ink-muted)]">Difficulty</span><span className="text-[var(--ink-secondary)] font-medium">{challenge.difficulty}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]"><span className="text-[var(--ink-muted)]">Time</span><span className="text-[var(--ink-secondary)] font-medium font-mono">{challenge.estimated_time}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)]"><span className="text-[var(--ink-muted)]">Local practice XP</span><span className="text-[var(--attention)] font-bold font-mono flex items-center gap-1"><Trophy className="w-3 h-3" />{challenge.points}</span></div>
            </div>
          </div>

          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)] sc-surface-transition"
          >
            <div className="text-[12px] font-bold text-[var(--ink-primary)] mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-[var(--success)]" />
              </div>
              Skills
            </div>
            <div className="flex flex-wrap gap-2">
              {challenge.skills.map((skill: string) => (
                <span key={skill} className="px-3 py-1.5 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[11px] font-mono text-[var(--ink-secondary)] hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] hover:text-[var(--ink-primary)] sc-surface-transition">{skill}</span>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-5 "
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--learning)]" />
              </div>
              <div className="text-[11px] font-mono text-[var(--ink-muted)] leading-relaxed">
                {challenge.level === 'guided' && "Guided: Step 1 Run..., Step 2 Observe..., Step 3 Analyze... — for learning"}
                {challenge.level === 'semi-guided' && "Semi-guided: Objective + tools, no exact command — you figure methodology"}
                {challenge.level === 'assessment' && "Assessment: Only scope + artifacts — you determine methodology like real engagement"}
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)] sc-surface-transition"
          >
            <div className="text-[12px] font-bold text-[var(--ink-primary)] mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[var(--owner)]" />
              </div>
              Reporting
            </div>
            <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
              After solving, practice writing finding: Title, Severity, Description, Evidence (PCAP frame numbers, config snippet), Impact, Recommendation, Retest. Use Reports → Finding Editor.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
