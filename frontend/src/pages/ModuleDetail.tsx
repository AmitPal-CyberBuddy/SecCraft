import { moduleOrdinal } from '@/content/module-ordinal'
import { AndroidCaseLab } from '@/components/learning/AndroidCaseLab'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useProgressStore } from '@/store/useProgressStore'
import { PcapInspector } from '@/components/lab/PcapInspector'
import { ConfigViewer } from '@/components/lab/ConfigViewer'
import { ReconMap } from '@/components/lab/ReconMap'
import { HandshakeDiagram } from '@/components/lab/HandshakeDiagram'
import { AttackDefenseRetest } from '@/components/lab/AttackDefenseRetest'
import { ReadingProgress, LessonReadingProgress } from '@/components/learning/ReadingProgress'
import { motion, AnimatePresence } from 'framer-motion'
import modules from '@/content/modules.json'
import { LEGACY_MODULE_MAP } from '@/content/legacy-module-map'
import { TierBadge } from '@/components/common/TierBadge'
import { DecisionPractice, getScenariosForModule } from '@/components/learning/DecisionPractice'
import { AVAILABLE_LABS, LABS } from '@/content/labs'

const NotesBookmarks = lazy(() => import('@/components/learning/NotesBookmarks').then(m => ({ default: m.NotesBookmarks })))
const ReadingExperience = lazy(() => import('@/components/learning/ReadingExperience').then(m => ({ default: m.ReadingExperience })))
import { ArrowLeft, BookOpen, FlaskConical, CheckCircle, Clock, Shield, FileText, Swords, Radio, AlertTriangle, Wifi, Target, Sparkles, ChevronRight, Layers, Award, Zap, List, Eye, Type, Maximize2 } from 'lucide-react'

import { quizData } from '@/content/quizData'


export function ModuleDetail() {
  const { id, pathId } = useParams<{ id: string; pathId?: string }>()
  const module = modules.find(m => m.id === id)
  const effectivePathId = pathId || (module as any)?.learningPathId || 'wireless-pentesting'
  const [activeTab, setActiveTab] = useState<'overview' | 'theory' | 'lab' | 'quiz' | 'report'>('overview')
  const [activeLesson, setActiveLesson] = useState(0)
  const [lessonContent, setLessonContent] = useState<string>('')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [labAnswers, setLabAnswers] = useState<Record<string, string>>({})
  const completedLabs = useProgressStore(s => s.completedLabs)
  const labCompleted = useMemo(() => Object.fromEntries(completedLabs.map(l => { const catalogueEntry = LABS.find(item => item.id === l.labId && item.module === l.moduleId); return [l.labId, catalogueEntry?.grading !== 'verified' || l.score === 100] })), [completedLabs])

  const completeLesson = useProgressStore(s => s.completeLesson)
  const completeLab = useProgressStore(s => s.completeLab)
  const completeQuiz = useProgressStore(s => s.completeQuiz)
  const isLessonCompleted = useProgressStore(s => s.isLessonCompleted)
  const getProgress = useProgressStore(s => s.getModuleProgress)
  const setCurrentModule = useProgressStore(s => s.setCurrentModule)
  useEffect(() => {
    if (id && modules.some(item => item.id === id)) setCurrentModule(id)
  }, [id, setCurrentModule])

  const moduleEntry = useMemo(
    () => (modules as Array<{ id: string; lessons?: { id: string; title: string; kind: string }[] }>).find(m => m.id === id),
    [id],
  )
  const lessons = useMemo(
    () => moduleEntry?.lessons?.length ? moduleEntry.lessons.map(l => l.id) : ['01-overview'],
    [moduleEntry],
  )
  const lessonMeta = useMemo(
    () => new Map((moduleEntry?.lessons ?? []).map(l => [l.id, l])),
    [moduleEntry],
  )

  const objectives = useMemo(() => {
    const fromContent = (module as { objectives?: string[] })?.objectives
    if (fromContent?.length) return fromContent
    if (id === '02-wifi-fundamentals') return [
      'Read SSID/BSSID/ESS from a beacon and explain what each identifies',
      'Explain client behaviour visible in probe requests (PNL, wildcard, randomised MAC)',
      'Map channels/bands and choose a capture channel for a given target',
    ]
    if (id === '05-wireless-recon') return [
      'Produce an AP inventory with frame numbers for every field',
      'Explain why a hidden SSID is not a security control, with the revealing frames',
      'Decide whether two BSSIDs are one ESS or a look-alike',
    ]
    if (id === '06-traffic-analysis') return [
      'Write reproducible display filters for management, EAPOL and RADIUS traffic',
      'Reconstruct one association and 4-way handshake as a frame-numbered timeline',
      'Package a claim as evidence: hash + filter + frames + stated limits',
    ]
    return [
      'Apply the module concept to a real engagement decision',
      'Analyse the module artefacts and state what they do not prove',
      'Choose a safe next observation and explain what current evidence cannot prove',
    ]
  }, [id, module])
  // Labs come from the single catalogue (content/labs.ts) so the module view and the Labs page
  // can never disagree about which lab ids exist.
  const labs = useMemo(
    () => AVAILABLE_LABS.filter(lab => lab.module === id).map(lab => ({ ...lab, pcap: lab.pcap ?? '' })),
    [id],
  )
  const quizzes = quizData[id || ''] || []
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  useEffect(() => {
    setQuizQuestions(quizzes.map(q => {
      const options = q.options.map((text: string, index: number) => ({ text, index }))
      for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]] }
      return { ...q, options: options.map((o: { text: string; index: number }) => o.text), correct: options.findIndex((o: { text: string; index: number }) => o.index === q.correct) }
    }))
    setActiveTab('overview'); setActiveLesson(0); setLessonContent(''); setLabAnswers({})
    setQuizAnswers({}); setQuizSubmitted(false)
  }, [id])
  const theoryContentRef = useRef<HTMLDivElement>(null)
  const [readingMode, setReadingMode] = useState<'default' | 'focus' | 'wide'>('default')
  const [showToc, setShowToc] = useState(true)
  const [lessonNavOpen, setLessonNavOpen] = useState(false)

  // Scroll to top whenever module, lesson, or tab changes — fixes UX issue
  useEffect(() => {
    // Scroll window to top instantly for module changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [id])

  useEffect(() => {
    // Scroll theory content to top when lesson changes
    if (activeTab === 'theory') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (theoryContentRef.current) {
        theoryContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
      // Scroll to theory start anchor
      const anchor = document.getElementById('theory-content-start')
      if (anchor) {
        setTimeout(() => {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [activeLesson, activeTab])

  useEffect(() => {
    if (activeTab === 'theory') {
      const lessonId = lessons[activeLesson]
      import(`../content/lessons/${id}/${lessonId}.md?raw`)
        .then(mod => setLessonContent(mod.default))
        .catch(() => setLessonContent(`# ${lessonId}\n\nContent coming soon for Module ${id}.`))
    }
  }, [activeTab, activeLesson, id, lessons])

  // Generate TOC from lessonContent
  const toc = useMemo(() => {
    if (!lessonContent) return []
    const headings: { id: string; text: string; level: number }[] = []
    const lines = lessonContent.split('\n')
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].replace(/[#*`]/g, '').trim()
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        headings.push({ id, text, level })
      }
    })
    return headings.slice(0, 20) // Limit to 20 for readability
  }, [lessonContent])

  if (!module && id && LEGACY_MODULE_MAP[id]) {
    const target = LEGACY_MODULE_MAP[id]
    return <Navigate replace to={pathId ? `/paths/${pathId}/modules/${target}` : `/modules/${target}`} />
  }

  if (!module) {
    return (
      <div className="max-w-[800px] mx-auto p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-slate-400" />
        </div>
        <div className="text-slate-400 font-heading text-[16px]">Module not found: {id}</div>
        <Link to="/modules" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] text-[13px] text-slate-300 hover:bg-[#25354f] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to modules
        </Link>
      </div>
    )
  }

  const progress = getProgress(module.id)

  const handleQuizSubmit = () => {
    if (quizQuestions.length === 0 || quizQuestions.some((_, idx) => quizAnswers[`q${idx}`] === undefined)) {
      alert('Answer every question before submitting.')
      return
    }
    const score = quizQuestions.reduce((n, q, idx) => n + (quizAnswers[`q${idx}`] === q.correct ? 1 : 0), 0)
    completeQuiz(module.id, 'quiz-01', score, quizQuestions.length)
    setQuizSubmitted(true)
  }

  const handleLabCheck = (labId: string) => {
    const record = (score?: number) => completeLab(module.id, labId, score)
    const norm = (key: string) => (labAnswers[key] || '').trim().toLowerCase()
    let valid = false
    if (id === '02-wifi-fundamentals') {
      valid = norm('bssid').includes('00:11:22:33:44:55') && norm('channel') === '6'
        && ['wpa2', 'psk', 'ccmp'].every(token => norm('security').includes(token))
        && ['none', '0'].some(token => norm('leak') === token)
      if (!valid) { alert('Use the beacon-only evidence: BSSID 00:11:22:33:44:55, channel 6, WPA2-PSK/CCMP, and zero probe requests.'); return }
      record(100)
    } else if (id === '05-wireless-recon') {
      valid = norm('apCount') === '6' && ['hidden-lab', 'probe response'].every(token => norm('hidden').includes(token))
        && ['12:34:56:78:9a:bc', 'homewifi-2345', 'airport_free_wifi'].every(token => norm('clients').includes(token))
        && norm('ess').includes('no') && norm('ess').includes('authorized')
      if (!valid) { alert('Review the 6 beacon BSSIDs, hidden-SSID probe response, client probe requests, and why a shared SSID alone cannot prove an ESS.'); return }
      record(100)
    } else if (id === '06-traffic-analysis') {
      const handshakeFrames = (labAnswers['handshake'] || '').match(/\d+/g)?.map(Number) ?? []
      valid = norm('frameCount') === '21' && norm('client').includes('12:34:56:78:9a:bc')
        && handshakeFrames.length === 4 && [8, 9, 10, 11].every(frame => handshakeFrames.includes(frame))
        && ['dhcp', 'arp', 'icmp', 'dns', 'http'].every(token => norm('protocols').includes(token))
      if (!valid) { alert('Check the 21-frame capture: client 12:34:56:78:9a:bc, M1–M4 at frames 8–11, then DHCP/ARP/ICMP/DNS/HTTP.'); return }
      record(100)
    } else {
      // Other catalogue entries currently provide artefacts and guided review, not machine-graded tasks.
      // Record only that the learner reviewed the material; do not claim a score or verified skill.
      record()
    }
    setLabAnswers({ ...labAnswers, [`reviewed:${labId}`]: 'true' })
  }

  const quizScore = quizQuestions.filter((_, i) => quizAnswers[`q${i}`] === quizQuestions[i]?.correct).length
  const quizPassed = quizQuestions.length > 0 && quizScore / quizQuestions.length >= 0.8
  const quizPerfect = quizQuestions.length > 0 && quizScore === quizQuestions.length

  return (
    <div className="ws-legacy ws-lesson max-w-[1200px] mx-auto space-y-4 xs:space-y-5 sm:space-y-6 min-w-0 w-full">
      <nav className="ws-breadcrumb" aria-label="Breadcrumb"><Link to={`/paths/${effectivePathId}`}>Learning path</Link><span aria-hidden="true">/</span><Link to={`/paths/${effectivePathId}/modules`}>Modules</Link><span aria-hidden="true">/</span><span aria-current="page">{module.title}</span></nav>
      <header className="sc-unit-header"><div><p className="sc-library-domain">Phase {module.phase} / Module {moduleOrdinal(module.id)}</p><h1>{module.title}</h1><p>{module.description}</p><div className="sc-unit-meta"><span>{module.difficulty}</span><span>{module.estimated_hours}h estimated</span><span>{lessons.length} lessons</span><span>{labs.length} labs</span>{effectivePathId === 'android-pentesting' ? <span>Offline source review · no runtime lab</span> : <TierBadge tier={(module as { lab_requirement?: string }).lab_requirement ?? module.status} />}</div></div><div className="sc-unit-progress"><span>Local practice progress</span><strong>{progress}%</strong><div role="progressbar" aria-label="Module practice progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="ws-progress"><span style={{ width: `${progress}%` }} /></div></div></header>
      <nav className="sc-unit-tabs" aria-label="Module workspace">{[
        { id: 'overview', label: 'Overview', count: null },
        { id: 'theory', label: 'Lessons', count: lessons.length },
        { id: 'lab', label: 'Labs', count: labs.length },
        { id: 'quiz', label: 'Quiz', count: quizzes.length },
        { id: 'report', label: 'Report', count: null },
      ].filter(tab => (tab.id !== 'quiz' || quizzes.length > 0) && (tab.id !== 'lab' || labs.length > 0) && (tab.id !== 'report' || effectivePathId !== 'android-pentesting')).map(tab => <button type="button" key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => { setActiveTab(tab.id as typeof activeTab); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{tab.label}{tab.count !== null && <small>{tab.count}</small>}</button>)}</nav>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 w-full"
        >
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="sc-unit-overview"><div className="sc-unit-overview-primary"><section><h2>What you will work through</h2><ol className="sc-objective-list">{objectives.map((objective, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span>{objective}</li>)}</ol></section>
              {((module as { evidence_focus?: string }).evidence_focus || (module as { retest_focus?: string }).retest_focus) && <section><h2>Evidence & retest</h2>{(module as { evidence_focus?: string }).evidence_focus && <p><strong>Evidence standard.</strong> {(module as { evidence_focus?: string }).evidence_focus}</p>}{(module as { retest_focus?: string }).retest_focus && <p><strong>Retest focus.</strong> {(module as { retest_focus?: string }).retest_focus}</p>}</section>}
              <section><h2>Your route through this module</h2><ol className="sc-objective-list">
              <li><span>01</span><button type="button" onClick={() => setActiveTab('theory')}>Read the authored lessons ({lessons.filter(lesson => isLessonCompleted(module.id, lesson)).length}/{lessons.length} marked complete locally)</button></li>
              {labs.length > 0 && <li><span>02</span><button type="button" onClick={() => setActiveTab('lab')}>Practice with the supplied lab artifacts ({labs.length} labs)</button></li>}
              {quizzes.length > 0 && <li><span>03</span><button type="button" onClick={() => setActiveTab('quiz')}>Check your understanding ({quizzes.length} local questions)</button></li>}
              {effectivePathId !== 'android-pentesting' && <li><span>04</span><button type="button" onClick={() => setActiveTab('report')}>Document your reasoning and evidence</button></li>}
              </ol><p>These are suggested steps, not verified completion requirements. Your progress is browser-local and self-reviewed.</p></section>
              <section><h2>Lesson sequence</h2><ol className="sc-objective-list">{lessons.map((lesson, index) => <li key={lesson}><span>{isLessonCompleted(module.id, lesson) ? '✓' : String(index + 1).padStart(2,'0')}</span><button type="button" onClick={() => { setActiveLesson(index); setActiveTab('theory') }}>{lessonMeta.get(lesson)?.title || lesson.replace(/-/g,' ')}</button></li>)}</ol></section>
            </div><aside className="sc-unit-overview-aside"><section><h2>Module context</h2><dl><div><dt>Difficulty</dt><dd>{module.difficulty}</dd></div><div><dt>Estimated</dt><dd>{module.estimated_hours}h</dd></div><div><dt>Labs</dt><dd>{labs.length}</dd></div><div><dt>Quiz questions</dt><dd>{quizzes.length}</dd></div></dl></section><section><h2>Environment</h2><p>Use supplied artifacts for local practice. Work requiring real RF equipment needs an authorized environment; no live infrastructure is modified here.</p></section><button type="button" className="ws-action" onClick={() => setActiveTab('theory')}>Open lessons →</button></aside></div>
          )}

          {/* Theory — Enhanced Readability + Scroll Fix */}
          {activeTab === 'theory' && (
            <>
              <ReadingProgress />
              <div id="theory-content-start" className="ws-lesson-grid sc-reading-layout" data-reading-mode={readingMode}>
                <div className="ws-lesson-nav space-y-4">
                  <div className="sc-lesson-index rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sticky top-[80px] ">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                      <BookOpen className="w-3 h-3" />
                      Lessons
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e293b] border border-[var(--line-strong)] font-mono">{lessons.length}</span>
                    </div>
                    <button type="button" className="sc-lesson-toggle" aria-expanded={lessonNavOpen} aria-controls="lesson-options" onClick={() => setLessonNavOpen(v => !v)}>Choose a lesson <span aria-hidden="true">{lessonNavOpen ? '−' : '+'}</span></button>
                    <div id="lesson-options" className={`sc-lesson-options space-y-1.5 ${lessonNavOpen ? 'is-open' : ''}`}>
                      {lessons.map((lesson, idx) => {
                        const completed = isLessonCompleted(module.id, lesson)
                        const isActive = activeLesson === idx
                        const meta = lessonMeta.get(lessons[idx])
                        return (
                          <button
                            key={lesson}
                            onClick={() => { setActiveLesson(idx); setLessonNavOpen(false) }}
                            className={`group w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 relative overflow-hidden ${isActive ? 'sc-lesson-active border text-[var(--ink-primary)]' : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border border-transparent'}`}
                          >
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-full" />}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-200 ${completed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[var(--panel-inset)] text-slate-400 group-hover:bg-[#1e293b] group-hover:text-slate-400'}`}>{completed ? '✓' : idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] font-medium truncate block">{lesson.replace(/-/g, ' ').replace(/^\d+\s/, '')}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">{completed ? 'Completed locally' : 'Not started'}</span>
                            </div>
                            {completed && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                            {isActive && !completed && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--line-normal)]/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-slate-400 font-mono">Progress</div>
                        <div className="text-[11px] text-cyan-400 font-mono font-bold">{lessons.filter(l => isLessonCompleted(module.id, l)).length}/{lessons.length}</div>
                      </div>
                      <div className="w-full h-2 bg-[var(--panel-inset)] rounded-full border border-[var(--line-normal)]/50 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(lessons.filter(l => isLessonCompleted(module.id, l)).length / lessons.length) * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-[var(--learning)] rounded-full" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setReadingMode(readingMode === 'focus' ? 'default' : 'focus')} className={`flex-1 px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${readingMode === 'focus' ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-slate-400 hover:text-slate-300'}`}>
                          <Eye className="w-3.5 h-3.5" /> {readingMode === 'focus' ? 'Focus ON' : 'Focus'}
                        </button>
                        <button onClick={() => setShowToc(!showToc)} className={`flex-1 px-3 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${showToc ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-slate-400 hover:text-slate-300'}`}>
                          <List className="w-3.5 h-3.5" /> TOC
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                <div className={`sc-reading-main ${readingMode === 'focus' ? 'is-focus' : ''}`}>
                  <div ref={theoryContentRef} id="lesson-content-area" className={`ws-reading-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 md:p-8 lg:p-10 relative overflow-hidden group hover:border-[var(--line-strong)]/60 transition-all duration-300 ${readingMode === 'focus' ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.5)]' : ''}`}>
                    <div className="hidden" />
                    <div className="relative">
                      {/* Enhanced Header with Readability Controls */}
                      <div className="flex flex-col gap-4 mb-8 pb-6 border-b border-[var(--line-normal)]/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-[12px] font-mono text-slate-400 flex items-center gap-2">
                                <span>{lessonMeta.get(lessons[activeLesson])?.title || lessons[activeLesson]}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="text-emerald-400">+10 XP</span>
                              </div>
                              <div className="mt-1">
                                <LessonReadingProgress content={lessonContent} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
                              <button onClick={() => setReadingMode('default')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'default' ? 'bg-[#1e293b] text-slate-200 border border-[var(--line-strong)]' : 'text-slate-400 hover:text-slate-300'}`}><Type className="w-3 h-3 inline mr-1" />Default</button>
                              <button onClick={() => setReadingMode('focus')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'focus' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-slate-300'}`}><Eye className="w-3 h-3 inline mr-1" />Focus</button>
                              <button onClick={() => setReadingMode('wide')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${readingMode === 'wide' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-300'}`}><Maximize2 className="w-3 h-3 inline mr-1" />Wide</button>
                            </div>
                            <motion.button
                              onClick={() => completeLesson(module.id, lessons[activeLesson])}
                              className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all duration-200 flex items-center gap-2 ${isLessonCompleted(module.id, lessons[activeLesson]) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[var(--learning)] border-[var(--learning)] text-[#102622] hover:brightness-110'}`}
                            >
                              {isLessonCompleted(module.id, lessons[activeLesson]) ? <><CheckCircle className="w-4 h-4" /> Completed · practice XP</> : <><Award className="w-4 h-4" /> Mark complete · practice XP</>}
                            </motion.button>
                          </div>
                        </div>
                      </div>

                      {/* Improved Markdown Readability */}
                      <div id="lesson-markdown-content" className={`ws-reading-prose markdown prose prose-invert max-w-none prose-headings:font-heading prose-headings:tracking-tight ${readingMode === 'focus' ? 'prose-p:text-[15.5px] prose-p:leading-[1.85] prose-p:text-slate-200 prose-li:text-[15px] prose-li:leading-[1.75]' : 'prose-p:text-[14.5px] prose-p:leading-[1.8] prose-p:text-slate-300'} prose-strong:text-[var(--ink-primary)] prose-strong:font-semibold prose-code:text-cyan-300 prose-code:bg-[var(--panel-inset)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-cyan-500/20 prose-code:text-[13px] prose-pre:bg-[#080d18] prose-pre:border prose-pre:border-[var(--line-normal)] prose-pre:rounded-xl prose-pre:shadow-soft prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300 prose-a:font-medium prose-headings:scroll-mt-24`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            // Markdown asset links must honor the Pages sub-path (e.g. /SecCraft/).
                            a: ({ href, children, ...props }) => <a href={href?.startsWith('/android-') ? `${import.meta.env.BASE_URL}${href.slice(1)}` : href} {...props}>{children}</a>,
                            h1: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h1 id={id} className="group flex items-center gap-3 scroll-mt-24" {...props}>{children} <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-cyan-500/50 hover:text-cyan-400 text-[16px] transition-opacity">#</a></h1>
                            },
                            h2: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h2 id={id} className="group flex items-center gap-3 scroll-mt-24" {...props}>{children} <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-cyan-500/50 hover:text-cyan-400 text-[14px] transition-opacity">#</a></h2>
                            },
                            h3: ({children, ...props}) => {
                              const text = String(children)
                              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                              return <h3 id={id} className="scroll-mt-24" {...props}>{children}</h3>
                            },
                          }}
                        >
                          {lessonContent}
                        </ReactMarkdown>
                      </div>

                      {/* Enhanced Navigation with Scroll Fix */}
                      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-3 pt-8 border-t border-[var(--line-normal)]/60">
                        <button
                          disabled={activeLesson === 0}
                          onClick={() => {
                            const newLesson = Math.max(0, activeLesson - 1)
                            setActiveLesson(newLesson)
                            // Scroll fix: ensure next module starts at top
                            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
                          }}
                          className="group px-5 py-3 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] text-[13px] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#25354f] hover:text-[var(--ink-primary)] hover:border-[#475569] transition-all duration-200 flex items-center gap-2.5"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          <div className="text-left">
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Previous</div>
                            <div className="text-[12px] font-medium">{activeLesson > 0 ? lessons[activeLesson - 1].replace(/-/g, ' ').slice(0, 30) : 'Start'}</div>
                          </div>
                        </button>
                        <motion.button
                          onClick={() => {
                            completeLesson(module.id, lessons[activeLesson]);
                            if (activeLesson < lessons.length - 1) {
                              setActiveLesson(activeLesson + 1)
                            } else {
                              setActiveTab('lab')
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                          }}
                          className="group px-6 py-3 rounded-xl bg-[var(--learning)] text-slate-950 text-[13px] font-semibold transition-all duration-300 flex items-center gap-3"
                        >
                          <div className="text-left">
                            <div className="text-[10px] font-mono text-white/70 uppercase tracking-wide">{activeLesson < lessons.length - 1 ? 'Next Lesson' : 'Next Section'}</div>
                            <div className="text-[13px] font-semibold">{activeLesson < lessons.length - 1 ? lessons[activeLesson + 1].replace(/-/g, ' ').slice(0, 30) : 'Go to labs'}</div>
                          </div>
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </motion.button>
                      </div>

                    </div>
                  </div>
                </div>
                <aside className="sc-reading-context" aria-label="Lesson context">
                  {showToc && toc.length > 0 && <section><h2>On this page</h2><nav aria-label="Lesson headings">{toc.map((heading, index) => <a key={`${heading.id}-${index}`} href={`#${heading.id}`} className={heading.level > 1 ? 'is-nested' : ''}>{heading.text}</a>)}</nav></section>}
                  <section><h2>Up next</h2><p>{activeLesson < lessons.length - 1 ? lessonMeta.get(lessons[activeLesson + 1])?.title || lessons[activeLesson + 1].replace(/-/g, ' ') : 'Continue into lab practice'}</p><button type="button" onClick={() => { if (activeLesson < lessons.length - 1) setActiveLesson(activeLesson + 1); else setActiveTab('lab'); document.getElementById('theory-content-start')?.scrollIntoView() }}>Continue →</button></section>
                  <section><h2>Record</h2><p>Marking this lesson complete records browser-local practice. It does not certify competence.</p></section>
                </aside>
              </div>
            </>
          )}

          {/* Lab */}
          {activeTab === 'lab' && effectivePathId === 'android-pentesting' && id?.startsWith('android-') && Number(id.slice(8, 10)) >= 4 && (
            <AndroidCaseLab key={id} moduleId={id} labId={`lab-${id}`} />
          )}
          {activeTab === 'lab' && !(effectivePathId === 'android-pentesting' && id?.startsWith('android-') && Number(id.slice(8, 10)) >= 4) && (
            <div className="space-y-6">
              {getScenariosForModule(id || '').length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading font-bold text-[15px] text-[var(--ink-primary)]">Decision practice — what would you do next?</h3>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      Observe → Interpret → Hypothesise → Choose the test → Evidence → Conclude
                    </span>
                  </div>
                  <DecisionPractice moduleId={id || ''} compact />
                </div>
              )}
              {labs.length === 0 && (
                <div className="rounded-2xl bg-[var(--panel-bg)]/60 border border-dashed border-[var(--line-strong)]/60 p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="text-slate-400 font-heading text-[14px]">No lab artefact for this module</div>
                  <div className="text-[12px] text-slate-400 mt-1">
                    This module is worked through the lessons and decision practice; the capture-based labs start
                    at Module 02 (see Labs).
                  </div>
                </div>
              )}

              {labs.map(lab => (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="sc-lab-unit rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 space-y-6 relative overflow-hidden"
                >

                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[16px] text-[var(--ink-primary)] flex items-center gap-2">
                            {lab.title}
                            <span className="sc-lab-state">{lab.status === 'PLANNED' ? 'Planned' : lab.grading === 'verified' ? 'Answer-checked locally' : 'Self-review'}</span>
                          </h3>
                          <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                            <span className="font-mono text-cyan-400">{lab.pcap ? `${lab.pcap}.pcapng` : 'No capture supplied'}</span>
                            <span className="mx-1.5 text-slate-400">•</span>
                            {lab.type}
                            <span className="mx-1.5 text-slate-400">•</span>
                            {lab.description}
                          </p>
                        </div>
                      </div>
                      {labCompleted[lab.id] && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Completed locally
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sc-lab-brief"><div><h4>Objective</h4><p>{lab.description}</p></div><div><h4>Environment & evidence</h4><p>{lab.pcap ? `Use the supplied ${lab.pcap}.pcapng capture below. Record your observations against the tasks; no live network is required.` : 'Use the written task and any illustrative configuration shown below. No capture is supplied for this lab.'}</p></div></div>
                  {lab.pcap && (
                    <div className="relative space-y-4">
                      <PcapInspector pcapId={lab.pcap} />
                      {(id === '05-wireless-recon' || id === '06-traffic-analysis') && (
                        <ReconMap pcapId={lab.pcap} />
                      )}
                      {(id === '08-wpa-wpa2' || id === '11-wpa3') && (
                        <HandshakeDiagram pcapId={lab.pcap} />
                      )}
                    </div>
                  )}

                  {id === '02-wifi-fundamentals' && lab.id === 'lab-02-config' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WIFI (Bad)"
                      config={`# Bad config — LAB-WIFI\ninterface=wlan0\nssid=LAB-WIFI\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=WeakPass123\n# Weaknesses\nwps_state=2\nap_setup_locked=0\nieee80211w=0\nht_capab=[HT40+][HT40-]\n`}
                      issues={[
                        { line: "wps_state=2", severity: "info", message: "WPS is enabled in this illustrative configuration. PIN attack feasibility depends on implementation, rate limiting, lockout and exposure; the beacon alone does not prove PIN recovery", recommendation: "Disable WPS: wps_state=0" },
                        { line: "ieee80211w=0", severity: "info", message: "PMF is disabled in this example; susceptible receivers may accept spoofed robust management frames. This configuration view does not prove a successful disconnect or handshake capture", recommendation: "Enable PMF required: ieee80211w=2" },
                        { line: "ht_capab=[HT40+]", severity: "info", message: "40 MHz operation in crowded 2.4 GHz may increase contention/interference; assess channel plan and regulatory constraints", recommendation: "Use 20MHz only in 2.4GHz" },
                        { line: "wpa_passphrase=WeakPass123", severity: "info", message: "Weak PSK, in wordlists, 11 chars", recommendation: "Strong PSK 20+ chars random" },
                      ]}
                    />
                  )}

                  {id === '07-wep-legacy' && (
                    <ConfigViewer
                      title="hostapd.conf — LEGACY-WIFI (WEP)"
                      config={`# WEP — obsolete (rate severity in context)\ninterface=wlan0\nssid=LEGACY-WIFI\nhw_mode=g\nchannel=6\nwep_default_key=0\nwep_key0=12345\n`}
                      issues={[
                        { line: "wep_key0=12345", severity: "info", message: "WEP is obsolete and vulnerable; practical recovery depends on captured traffic and conditions. Do not assign a fixed recovery time/frame count or severity without contextual analysis", recommendation: "Migrate to WPA3 or WPA2-PSK CCMP, PMF required, strong PSK" },
                      ]}
                    />
                  )}

                  {id === '10-wps' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPS (WPS Enabled)"
                      config={`# WPS enabled — weak\ninterface=wlan0\nssid=LAB-WPS\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=StrongPass123\nwps_state=2\nap_setup_locked=0\neap_server=1\nwps_pin=12345670\n`}
                      issues={[
                        { line: "wps_state=2", severity: "info", message: "WPS PIN 8-digit with flaw: 10^4 + 10^3 = 11k max, not 10^8. Beacon has WPS IE (221 OUI 00:50:F2:04)", recommendation: "Disable WPS: wps_state=0, no PBC via UPnP" },
                        { line: "wps_pin=12345670", severity: "info", message: "Default PIN or weak PIN, checksum reduces entropy", recommendation: "Disable WPS, use strong PSK" },
                      ]}
                    />
                  )}

                  {id === '11-wpa3' && lab.id === 'lab-11-transition' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPA3-TRANS (Bad Transition)"
                      config={`# Bad transition\ninterface=wlan0\nssid=LAB-WPA3-TRANS\nhw_mode=a\nchannel=36\nwpa=2\nwpa_key_mgmt=WPA-PSK SAE\nrsn_pairwise=CCMP\nwpa_passphrase=WeakPass123\nsae_password=WeakPass123\nieee80211w=1\n`}
                      issues={[
                        { line: "wpa_key_mgmt=WPA-PSK SAE", severity: "info", message: "Transition mode advertises PSK compatibility alongside SAE. The selected AKM and any downgrade claim require client/AP negotiation evidence.", recommendation: "Prefer SAE-only where the managed client fleet supports it; otherwise assess transition policy and passphrase strength" },
                        { line: "ieee80211w=1", severity: "info", message: "PMF is capable but not required in this illustrative transition profile. This does not show that deauthentication or downgrade succeeded.", recommendation: "Enforce PMF where compatible and verify negotiated capabilities; WPA3-only deployments require PMF" },
                        { line: "WeakPass123", severity: "info", message: "Weak PSK same for both, if WPA2 handshake captured and weak, WPA3 also compromised", recommendation: "Strong PSK 20+ chars random, not in wordlists" },
                      ]}
                    />
                  )}

                  {id === '11-wpa3' && lab.id === 'lab-11-wpa3-only' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-WPA3 (Good)"
                      config={`# Good WPA3-only\ninterface=wlan0\nssid=LAB-WPA3\nhw_mode=a\nchannel=36\nwpa=2\nwpa_key_mgmt=SAE\nrsn_pairwise=CCMP\nsae_password=StrongRandomPassphrase123!@#With20+Chars\nieee80211w=2\n`}
                      issues={[]}
                    />
                  )}

                  {lab.id === 'lab-12-deauth' && (
                    <ConfigViewer
                      title="hostapd.conf — LAB-DEAUTH (PMF Disabled vs Required)"
                      config={`# Bad — PMF disabled, deauth possible\ninterface=wlan0\nssid=LAB-DEAUTH\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=StrongPass123\nieee80211w=0\n\n# Good — PMF required\n# ieee80211w=2\n`}
                      issues={[
                        { line: "ieee80211w=0", severity: "info", message: "PMF disabled — management frames unauthenticated, deauth/disassoc spoofing possible, DoS, handshake capture", recommendation: "Enable PMF required: ieee80211w=2, WPA3-only mandates PMF" },
                      ]}
                    />
                  )}

                  {lab.id === 'lab-13-rogue' && (
                    <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 p-4 text-[12px] text-slate-300 leading-relaxed">
                      <strong className="text-amber-300">Artifact boundary:</strong> This teaching capture contains BSSIDs de:ad:be:ef:00:01 (channel 36) and 02:11:22:33:44:55 (channel 6). A matching SSID does not prove ESS membership or unauthorized ownership; no authorized inventory is bundled.
                    </div>
                  )}

                  {id === '14-captive-portals' && (
                    <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 p-4 text-[12px] text-slate-300 leading-relaxed">
                      <strong className="text-amber-300">Artifact boundary:</strong> This PCAP simulates an open guest BSS and HTTP/ARP exchanges. It does not include a real hostapd configuration, session service, MAC authorization check, or tested bypass.
                    </div>
                  )}

                  {lab.id === 'lab-15-enterprise' && (
                    <ConfigViewer
                      title="hostapd.conf — Corp-Enterprise (WPA2-EAP) + wpa_supplicant.conf bad"
                      config={`# hostapd.conf Enterprise\ninterface=wlan0\nssid=Corp-Enterprise\nhw_mode=g\nchannel=6\nieee8021x=1\nwpa=2\nwpa_key_mgmt=WPA-EAP\nrsn_pairwise=CCMP\nauth_server_addr=192.168.1.10\nauth_server_port=1812\nauth_server_shared_secret=testing123\n\n# wpa_supplicant.conf BAD — no ca_cert\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  password="StrongPass123"\n  phase2="auth=MSCHAPV2"\n  # NO ca_cert!\n}\n\n# GOOD\n# ca_cert="/etc/certs/ca.pem"\n# subject_match="CN=radius.corp.com"\n# altsubject_match="DNS:radius.corp.com"\n`}
                      issues={[
                        { line: "auth_server_shared_secret=testing123", severity: "info", message: "Example shared secret is short and reused; choose a unique high-entropy value per NAS under current policy (22 characters is not a protocol requirement)", recommendation: "Use unique high-entropy per-NAS secrets; consider RadSec with validated peer certificates where supported" },
                        { line: "NO ca_cert", severity: "info", message: "Missing CA trust and expected-server-name validation can permit a rogue authenticator under some client policies. This illustrative profile does not demonstrate a successful attack; test both checks in an authorized environment", recommendation: "Enforce ca_cert + subject_match via MDM/GPO, prefer EAP-TLS mutual cert, strong secret, PMF required, WIDS" },
                      ]}
                    />
                  )}

                  {lab.id === 'lab-16-eap' && (
                    <ConfigViewer
                      title="wpa_supplicant.conf — PEAP vs EAP-TLS"
                      config={`# BAD PEAP without validation\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  password="StrongPass123"\n  phase2="auth=MSCHAPV2"\n  # NO ca_cert\n}\n\n# GOOD PEAP with validation\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=PEAP\n  identity="user@corp.com"\n  ca_cert="/etc/certs/ca.pem"\n  subject_match="CN=radius.corp.com"\n  altsubject_match="DNS:radius.corp.com"\n  phase2="auth=MSCHAPV2"\n}\n\n# GOOD EAP-TLS mutual\nnetwork={\n  ssid="Corp-Enterprise"\n  key_mgmt=WPA-EAP\n  eap=TLS\n  identity="user@corp.com"\n  ca_cert="/etc/certs/ca.pem"\n  client_cert="/etc/certs/client.pem"\n  private_key="/etc/certs/client.key"\n  private_key_passwd="..."\n  subject_match="CN=radius.corp.com"\n}\n`}
                      issues={[
                        { line: "NO ca_cert", severity: "info", message: "Incomplete server validation may expose inner authentication to a rogue authenticator, depending on profile and EAP method; require trusted CA and expected server identity, then test", recommendation: "ca_cert + subject_match, EAP-TLS mutual cert, strong RADIUS secret, PMF, WIDS" },
                      ]}
                    />
                  )}

                  {lab.id === 'lab-17-radius' && (
                    <ConfigViewer
                      title="FreeRADIUS clients.conf + users + eap.conf"
                      config={`# clients.conf BAD\nclient AP1 {\n  ipaddr = 192.168.1.1\n  secret = testing123\n  shortname = AP1\n}\nclient all {\n  ipaddr = 0.0.0.0/0\n  secret = testing123\n}\n\n# GOOD\n# client AP1 {\n#   ipaddr = 192.168.1.1\n#   secret = StrongRandomSecret123!@#With22+Chars\n# }\n\n# users\nuser1 Cleartext-Password := "WeakPass"\n  Tunnel-Type = VLAN,\n  Tunnel-Medium-Type = IEEE-802,\n  Tunnel-Private-Group-Id = 100\n\n# eap.conf — certs\n# ca_cert, server_cert, private_key\n`}
                      issues={[
                        { line: "secret = testing123", severity: "info", message: "Example secret is illustrative; use unique high-entropy per-NAS secrets and protect/rotate them (length is policy, not a protocol requirement)", recommendation: "Use unique high-entropy per-NAS secrets; consider RadSec with validated peer certificates where supported, isolated management VLAN" },
                        { line: "ipaddr = 0.0.0.0/0", severity: "info", message: "clients.conf allows any IP as NAS with weak secret, should restrict to AP IPs", recommendation: "Restrict to AP IPs, not 0.0.0.0/0" },
                        { line: "Cleartext-Password := \"WeakPass\"", severity: "info", message: "User password weak, no complexity, no lockout", recommendation: "Use strong per-user credentials and enforce appropriate identity, lockout and monitoring policy" },
                      ]}
                    />
                  )}

                  {id === '18-corporate-attacks' && (
                    <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 p-4 text-[12px] text-slate-300 leading-relaxed">
                      <strong className="text-amber-300">Artifact boundary:</strong> This 19-frame fixture has management/EAPOL and ICMP packets only. It does not contain DHCP, PEAP/TLS, RADIUS or an ACL configuration; see the lesson before making any chain claim.
                    </div>
                  )}

                  {lab.id === 'lab-19-methodology' && (
                    <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/15 p-5 text-[12px] text-slate-300 leading-relaxed space-y-2">
                      <h4 className="font-bold text-amber-300">What is actually bundled</h4>
                      <p><code>methodology.pcapng</code> is a 29-frame synthetic capture with eight distinct BSSIDs, one deauthentication frame, a weak-PSK practice handshake, and EAPOL exchanges. It does not include a complete RADIUS transaction, a validated PEAP/TLS certificate failure, DHCP, or captive-portal behavior.</p>
                      <p><code>ENG-01</code> below is a written capstone scenario brief, not an executable or automatically graded final exam. The referenced Northwind topology, four per-SSID captures, RADIUS logs, configuration excerpts, portal rules and retest artefacts are not bundled. Do not present this brief as a completed assessment.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-[var(--line-normal)]/60">
                    <div className="space-y-4">
                      <div className="text-[13px] font-bold text-slate-200 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        Tasks
                      </div>

                      {id === '02-wifi-fundamentals' && lab.id === 'lab-02-beacon' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. `LAB-WIFI` BSSID?</label><input value={labAnswers['bssid'] || ''} onChange={e => setLabAnswers({...labAnswers, bssid: e.target.value})} placeholder="00:11:22:33:44:55" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 placeholder:text-slate-400 focus:border-cyan-500/30 focus:bg-[#0a1020] focus:outline-none hover:border-[var(--line-strong)]/60 transition-all duration-200" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Channel?</label><input value={labAnswers['channel'] || ''} onChange={e => setLabAnswers({...labAnswers, channel: e.target.value})} placeholder="6" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. RSN authentication/cipher?</label><input value={labAnswers['security'] || ''} onChange={e => setLabAnswers({...labAnswers, security: e.target.value})} placeholder="WPA2-PSK, CCMP" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. Probe requests captured? (0 / none)</label><input value={labAnswers['leak'] || ''} onChange={e => setLabAnswers({...labAnswers, leak: e.target.value})} placeholder="0" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {id === '05-wireless-recon' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. How many beacon BSSIDs?</label><input value={labAnswers['apCount'] || ''} onChange={e => setLabAnswers({...labAnswers, apCount: e.target.value})} placeholder="6" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Which SSID is hidden? How revealed?</label><input value={labAnswers['hidden'] || ''} onChange={e => setLabAnswers({...labAnswers, hidden: e.target.value})} placeholder="HIDDEN-LAB revealed via probe response" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. List clients and their PNL</label><input value={labAnswers['clients'] || ''} onChange={e => setLabAnswers({...labAnswers, clients: e.target.value})} placeholder="12:34:56:78:9A:BC → LAB-WIFI, HomeWiFi, Corp-WLAN" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. Do matching SSIDs prove one ESS? Why?</label><input value={labAnswers['ess'] || ''} onChange={e => setLabAnswers({...labAnswers, ess: e.target.value})} placeholder="No; verify authorized inventory and deployment context" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {id === '06-traffic-analysis' && (
                        <>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">1. Total frames?</label><input value={labAnswers['frameCount'] || ''} onChange={e => setLabAnswers({...labAnswers, frameCount: e.target.value})} placeholder="21" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">2. Associated client MAC?</label><input value={labAnswers['client'] || ''} onChange={e => setLabAnswers({...labAnswers, client: e.target.value})} placeholder="12:34:56:78:9a:bc" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">3. EAPOL M1–M4 frame numbers?</label><input value={labAnswers['handshake'] || ''} onChange={e => setLabAnswers({...labAnswers, handshake: e.target.value})} placeholder="8, 9, 10, 11" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                          <div><label className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">4. Name post-association protocols</label><input value={labAnswers['protocols'] || ''} onChange={e => setLabAnswers({...labAnswers, protocols: e.target.value})} placeholder="DHCP, ARP, ICMP, DNS, HTTP" className="mt-2 w-full px-4 py-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] font-mono text-slate-200 focus:border-cyan-500/30 focus:outline-none" /></div>
                        </>
                      )}

                      {!['02-wifi-fundamentals','05-wireless-recon','06-traffic-analysis'].includes(id||'') && (
                        <div className="rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40 p-4">
                          <div className="text-[12px] text-slate-400 leading-relaxed">
                            Guided self-review only: inspect the listed artifact and its lesson, then record that you reviewed it. This entry is not machine-graded; no answer validation or skill score is claimed.
                          </div>
                        </div>
                      )}

                      <motion.button
                        onClick={() => handleLabCheck(lab.id)}
                        disabled={!!labCompleted[lab.id]}
                        className={`w-full py-3 rounded-xl font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 ${
                          labCompleted[lab.id]
                            ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                            : 'bg-[var(--learning)] text-slate-950'
                        }`}
                      >
                        {labCompleted[lab.id] ? <><CheckCircle className="w-4 h-4" /> {lab.grading === 'verified' ? 'Local answer check passed' : 'Review recorded'}</> : <><Target className="w-4 h-4" /> Record Lab Review</>}
                      </motion.button>
                    </div>

                    <div className="space-y-4">
                      <div className="text-[12px] font-bold text-slate-300 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        VAPT Context & Evidence
                      </div>
                      <div className="rounded-xl bg-amber-500/[0.03] border border-amber-500/10 p-4 text-[11px] text-slate-400 leading-relaxed ">
                        {id === '05-wireless-recon' && "Recon: this 17-frame artifact contains 6 beacon BSSIDs, six directed probes, and one hidden-SSID probe response (frame 13). A shared SSID alone does not establish ESS membership."}
                        {id === '06-traffic-analysis' && "Traffic analysis: 21 frames. Beacon 1, probe request/response 2–3, auth 4–5, association 6–7, EAPOL M1–M4 8–11, DHCP DORA 12–15, ARP 16–17, ICMP 18–19, DNS 20, HTTP 21. Post-handshake data is unprotected in this synthetic fixture."}
                        {id === '02-wifi-fundamentals' && "Beacons first. Enumerate SSID, BSSID, channel, security. Probe PNL leak useful for Evil Twin."}
                        {!['02-wifi-fundamentals','05-wireless-recon','06-traffic-analysis'].includes(id||'') && "Analyze PCAPs, configs, extract evidence with frame numbers and specific vulnerabilities. Document impact, recommendation, retest."}
                      </div>
                      <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4 font-mono text-[11px] text-slate-400 ">
                        <div className="text-slate-400 mb-2 flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center">
                            <span className="text-[8px]">$</span>
                          </div>
                          tshark commands
                        </div>
                        {lab.pcap ? (
                          <>
                            <div className="text-cyan-400/80">tshark -r {lab.pcap}.pcapng -Y "wlan.fc.type_subtype==8"</div>
                            <div className="text-violet-400/80 mt-1">tshark -r {lab.pcap}.pcapng -Y "eapol"</div>
                          </>
                        ) : (
                          <div>cat hostapd.conf — audit WPS, PMF, ciphers</div>
                        )}
                      </div>
                      {labCompleted[lab.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 p-4 text-[11px] text-emerald-400 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Review recorded in this browser. This is local practice, not trusted grading.
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {module.phase >= 3 && (
                    <div className="pt-2">
                      <AttackDefenseRetest
                        attack={{
                          title: `${module.title} — scripted tabletop`,
                          description: `Local tabletop illustration for ${module.title}. It does not transmit frames, execute an attack, or validate a real network; use the linked lesson and artifact for bounded evidence.`,
                          evidence: lab.pcap ? `Bundled teaching artifact: ${lab.pcap}.pcapng (see manifest and lesson for limits)` : 'No configuration artifact is bundled for this review.',
                          impact: 'Potential impact is context-dependent; this local panel does not establish a finding.',
                        }}
                        defense={{
                          title: 'Defense & Hardening',
                          description: module.retest_focus || 'Review module controls; this scripted panel changes no configuration.',
                          config: 'ieee80211w=2\nwps_state=0\n# Strong PSK 20+\n# ca_cert + subject_match\n# Strong RADIUS secret 22+',
                        }}
                        retest={{
                          title: 'Verify Fix',
                          description: 'A real retest requires a new, authorized capture or configuration artifact; this panel does not perform one.',
                          verification: 'Record artifact hash, frame numbers, filter, configuration source and test limits in an authorized engagement.',
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="max-w-[700px] mx-auto space-y-5">
              <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden">

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Swords className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-[16px] text-[var(--ink-primary)]">Knowledge Check</h3>
                      <p className="text-[12px] text-slate-400">{quizzes.length} questions • 80% to pass • {module.title}</p>
                    </div>
                  </div>
                  {quizSubmitted && (
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase tracking-widest">Score</div>
                      <div className="text-[20px] font-bold text-[var(--ink-primary)] font-mono">{quizQuestions.filter((_, i) => quizAnswers[`q${i}`] === quizQuestions[i].correct).length} / {quizzes.length}</div>
                    </div>
                  )}
                </div>
              </div>

              {quizQuestions.map((q, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 hover:border-[var(--line-strong)]/60 transition-all duration-300"
                >
                  <div className="text-[13px] font-semibold text-[var(--ink-primary)] mb-4 flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1e293b] border border-[var(--line-strong)] flex items-center justify-center text-[11px] font-mono shrink-0">{idx + 1}</span>
                    <span className="leading-relaxed">{q.question}</span>
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt: string, optIdx: number) => (
                      <label key={optIdx} className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${quizAnswers[`q${idx}`] === optIdx ? 'bg-[#1e293b] border-cyan-500/30 text-[var(--ink-primary)] shadow-soft' : 'bg-[var(--panel-inset)]/60 border-[var(--line-normal)]/60 text-slate-400 hover:border-[var(--line-strong)]/60 hover:text-slate-200 hover:bg-[var(--panel-inset)]/80'}`}>
                        <input type="radio" name={`q${idx}`} checked={quizAnswers[`q${idx}`] === optIdx} onChange={() => setQuizAnswers({...quizAnswers, [`q${idx}`]: optIdx})} disabled={quizSubmitted} className="accent-cyan-400" />
                        <span className="text-[13px] leading-relaxed">{opt}</span>
                      </label>
                    ))}
                  </div>
                  {quizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-3 rounded-xl text-[11px] border  ${quizAnswers[`q${idx}`] === q.correct ? 'bg-emerald-500/[0.04] border-emerald-500/15 text-emerald-400' : 'bg-red-500/[0.04] border-red-500/15 text-red-400'}`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {quizAnswers[`q${idx}`] === q.correct ? <><CheckCircle className="w-4 h-4" /> Correct</> : <>✗ Wrong — Correct: {q.options[q.correct]}</>}
                      </div>
                      <div className="mt-1.5 text-[11px] opacity-80 leading-relaxed">{q.explanation}</div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              <motion.button
                onClick={() => { if (quizSubmitted) { setQuizAnswers({}); setQuizSubmitted(false) } else handleQuizSubmit() }}
                disabled={quizSubmitted && quizPerfect}
                className={`w-full py-4 rounded-xl font-bold text-[14px] transition-all duration-300 flex items-center justify-center gap-2 ${
                  quizSubmitted
                    ? quizPassed
                      ? quizPerfect ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 cursor-default' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    : 'bg-[var(--learning)] text-slate-950'
                }`}
              >
                {quizSubmitted ? (
                  <>
                    {quizPassed ? <CheckCircle className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    {quizPerfect ? `Passed · Perfect score · ${quizScore} / ${quizzes.length}` : quizPassed ? `Passed · Retake to improve · ${quizScore} / ${quizzes.length}` : `Not passed · Retry · ${quizScore} / ${quizzes.length}`}
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    Submit Quiz
                  </>
                )}
              </motion.button>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="max-w-[800px] mx-auto space-y-5">
              <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 relative overflow-hidden">

                <div className="relative">
                  <h3 className="font-heading font-bold text-[16px] text-[var(--ink-primary)] mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-violet-400" />
                    </div>
                    Reporting Exercise
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Title</label>
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-slate-300">{id === '05-wireless-recon' ? 'Wireless Recon: 6 BSSIDs, Hidden SSID & Probe Requests' : id === '06-traffic-analysis' ? 'Traffic Analysis: 21-frame Association & Data Flow' : 'Wireless Evidence Review'}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Severity</label>
                      <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-[13px] text-slate-300 font-medium">Not pre-assigned — justify from evidence, likelihood and impact</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evidence</label>
                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] font-mono text-[11px] text-slate-400 leading-relaxed">
                      {id === '05-wireless-recon' ? 'PCAP: recon-lab.pcapng — cite the exact beacon/probe frame numbers and decoded fields. A look-alike or randomized MAC requires corroboration before attribution.' : id === '06-traffic-analysis' ? 'PCAP: traffic-analysis.pcapng — cite frames and decoded fields; synthetic application payloads do not establish a production session.' : 'Select the linked artifact, state what it directly shows, cite frame numbers, and separate observation from inference. No finding or severity is pre-assigned.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Suspense fallback={<LoadingPanel label="Loading Reading Experience…" />}>
        <ReadingExperience content={lessonContent || ''} />
      </Suspense>

      <Suspense fallback={<LoadingPanel label="Loading Notes & Bookmarks…" />}>
        <NotesBookmarks moduleId={id || ''} lessonId={lessons[activeLesson] || ''} />
      </Suspense>

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[var(--line-normal)]/60">
        <Link to={effectivePathId ? `/paths/${effectivePathId}/modules` : "/modules"} className="inline-flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[var(--panel-bg)]/60 border border-transparent hover:border-[var(--line-normal)]/60">
          <ArrowLeft className="w-4 h-4" />
          {effectivePathId ? `${effectivePathId} Modules` : "All Modules"}
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono px-3 py-2 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40">
          <Radio className="w-3 h-3" />
          Module {module.id} • {progress}% • {module.status} • Notes • Bookmarks • Enterprise
        </div>
      </div>
    </div>
  )
}
