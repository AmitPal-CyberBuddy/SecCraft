import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
test('motion recipes are bounded, keep text opaque, and honor quiet modes', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root, configFile:`${root}/vite.config.ts`, appType:'custom', logLevel:'silent', server:{middlewareMode:true} })
  t.after(() => vite.close())
  const { panelMotion } = await vite.ssrLoadModule('/src/lib/motion.ts')
  for (const kind of ['search','activity']) {
    for (const compact of [false,true]) {
      const normal = panelMotion(kind,{compact,reduced:false,paused:false})
      assert.ok(normal.transition.duration <= .22)
      assert.deepEqual(normal.animate,{x:0,y:0})
      assert.equal('opacity' in normal.initial,false)
      assert.ok(Object.values(normal.initial).every(n=>Math.abs(n)<=16))
      for (const quiet of [{reduced:true,paused:false},{reduced:false,paused:true}]) {
        const motion = panelMotion(kind,{compact,...quiet})
        assert.equal(motion.initial,false)
        assert.equal(motion.transition.duration,0)
      }
    }
  }
})

test('responsive motion has explicit capability and accessibility fallbacks', () => {
  const provider=read('components/animations/MotionPreferences.tsx')
  assert.match(provider,/classList.contains\('reduce-motion'\) \|\| matches\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(provider,/query.removeEventListener\('change', update\)/)
  assert.match(provider,/observer.disconnect\(\)/)
  assert.match(provider,/removeEventListener\('visibilitychange', update\)/)
  const css=read('styles/motion.css')
  assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)/)
  assert.match(css,/@media\(max-width:680px\),\(max-height:500px\)/)
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
  assert.match(css,/animation-iteration-count:1 !important/)
  assert.doesNotMatch(css,/transition:\s*all|animation:[^;]*infinite|backdrop-filter|filter:blur/)
  assert.match(read('components/layout/Topbar.tsx'), /layoutId=\{travel \? 'destination-marker' : undefined\}/)
  assert.match(read('components/common/TechnicalContent.tsx'),/role="status"/)
  assert.doesNotMatch(read('components/search/GlobalSearch.tsx'),/delay: idx|<AnimatePresence/)
  assert.doesNotMatch(read('components/notifications/NotificationCenter.tsx'),/Math.min\(idx|<AnimatePresence/)
})

test('learning keeps content stationary, focus persistent and progress truthful', () => {
  const cards=read('components/learning/Flashcards.tsx')
  assert.doesNotMatch(cards,/AnimatePresence|rotateY|useReducedMotion|key=\{`\$\{card.id\}/)
  assert.match(cards,/if \(!revealedRef.current\) return/)
  assert.match(cards,/disabled=\{!flipped\}/)
  assert.match(cards,/focus\(\{ preventScroll: true \}\)/)
  assert.match(cards,/aria-describedby=\{faceId\}/)
  const progress=read('components/learning/LearningProgress.tsx')
  assert.match(progress,/initial=\{false\}/)
  assert.match(progress,/policy.reduced \|\| policy.paused \? 0/)
  assert.match(progress,/Number.isFinite\(value\)/)
  assert.match(progress,/aria-valuenow=\{Math.round\(percent\)\}/)
  const lesson=read('pages/ModuleDetail.tsx')
  assert.doesNotMatch(lesson,/AnimatePresence|key=\{activeTab\}|delay: idx \*|initial=\{\{ width: 0/)
  assert.match(lesson,/setCompletionPulse\(result.isNew\)/)
  assert.match(lesson,/setCompletionNotice\(''\) }, \[id, activeLesson, activeTab\]/)
  assert.match(lesson,/ref=\{quizSummaryRef\} tabIndex=\{-1\}/)
  assert.match(lesson,/Your current answers are kept/)
  assert.doesNotMatch(read('components/learning/ReadingProgress.tsx'),/transition-all|<motion\./)
})


test('technical tools animate selection markers, not evidence content or stale snapshots', () => {
  for (const file of ['lab/LabScoring','terminal/TerminalEmulator','lab/PcapInspector','lab/ReconMap','lab/HandshakeDiagram','lab/ConfigViewer','lab/AttackDefenseRetest','lab/PcapUploader','report/ReportEditor','report/ReportTemplates','report/TimelineViz','evidence/EvidenceVault','pdf/ReportPdfExport']) {
    assert.doesNotMatch(read(`components/${file}.tsx`), /framer-motion|AnimatePresence|whileHover|whileTap|transition-all|animate-pulse|hover[^ ]*:scale-/, file)
  }
  assert.match(read('components/common/SelectionMarker.tsx'),/key=\{value\}.*aria-hidden="true"/)
  assert.doesNotMatch(read('components/lab/HandshakeDiagram.tsx'),/key=\{activeStep\}/)
  assert.match(read('components/lab/PcapInspector.tsx'),/generation === request.current && !abort.signal.aborted/)
  assert.match(read('components/lab/PcapInspector.tsx'),/inert=\{loading\} aria-busy=\{loading\}/)
  assert.match(read('components/report/ReportEditor.tsx'),/hidden=\{preview\} inert=\{preview\}/)
  assert.match(read('components/evidence/EvidenceVault.tsx'),/target\?\.focus\(\{ preventScroll: true \}\)/)
})


test('secondary motion does not replay totals, stagger content or imply live status', () => {
  for (const file of ['pages/Settings','pages/LearningPath','pages/Labs','pages/Account','pages/Engagement','components/account/StateChip','components/gamification/LevelBadge','components/analytics/AnalyticsDashboard','components/certificate/Certificate','components/admin/CustomModuleCreator','components/animations/PageTransition']) {
    assert.doesNotMatch(read(`${file}.tsx`),/framer-motion|animate-pulse|transition-all|whileHover|whileTap/,file)
  }
  assert.match(read('components/gamification/LevelBadge.tsx'),/LearningProgress value=\{xpInfo.percent\}/)
  assert.match(read('components/analytics/AnalyticsDashboard.tsx'),/moduleRows.length - started.length/)
  assert.match(read('components/analytics/AnalyticsDashboard.tsx'),/style=\{\{ height: peak/)
  const toast = read('components/gamification/PointsToast.tsx')
  assert.match(toast,/lastEarnedPoints === earned/)
  assert.match(toast,/hovered \|\| focused \|\| hidden/)
  assert.doesNotMatch(toast,/spring|AnimatePresence|motion\./)
  assert.match(read('components/offline/OfflineIndicator.tsx'),/clearTimeout\(hideTimer\)/)
  assert.doesNotMatch(read('components/offline/OfflineIndicator.tsx'),/service is reachable again/)
  assert.match(read('components/shortcuts/KeyboardShortcuts.tsx'),/node\?\.showModal\(\)/)
})

test('authored motion tokens generate current CSS and bounded JS recipes', async t => {
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, ['../scripts/generate-motion-tokens.mjs', '--check'], { cwd: fileURLToPath(new URL('../', import.meta.url)) })
  const root = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root, configFile:`${root}/vite.config.ts`, appType:'custom', logLevel:'silent', server:{middlewareMode:true} })
  t.after(() => vite.close())
  const { motionTiming, motionDistance, resultMotion } = await vite.ssrLoadModule('/src/lib/motion.ts')
  assert.equal(motionTiming.control, .14)
  assert.equal(motionTiming.compactControl, .1)
  assert.equal(motionTiming.selection, .18)
  assert.equal(motionTiming.compactSelection, .14)
  assert.equal(motionTiming.panel, .22)
  assert.ok(Math.max(...Object.values(motionDistance)) <= 12)
  for (const reduced of [false,true]) for (const paused of [false,true]) for (const compact of [false,true]) {
    const recipe = resultMotion({reduced,paused,compact})
    assert.equal(recipe.duration, reduced || paused || compact ? 0 : 180)
    assert.equal(recipe.distance, reduced || paused || compact ? 0 : 4)
  }
  assert.match(read('components/common/Workspace.tsx'), /<LearningProgress value=\{value\} label=\{label\}/)
  assert.match(read('components/common/ResultTransition.tsx'), /animation.cancel\(\)/)
})

test('component motion cannot reintroduce competing durations, glow, springs or hover scale', async () => {
  const { readdirSync } = await import('node:fs')
  const root = fileURLToPath(new URL('../src/', import.meta.url))
  for (const file of readdirSync(root, { recursive:true }).filter(path => path.endsWith('.tsx'))) {
    const source = read(file)
    assert.doesNotMatch(source, /sc-(?:surface|technical)-transition duration-\d+|shadow-glow-|whileHover|whileTap|animate-pulse|animate-bounce|transition-all|hover:scale-|type:\s*['"]spring['"]/, file)
  }
  const tokens = read('styles/motion-tokens.css')
  assert.match(tokens, /prefers-reduced-motion:reduce/)
  assert.match(tokens, /data-motion-paused="true"/)
  assert.match(tokens, /--motion-control:0ms; --motion-selection:0ms; --motion-panel:0ms;/)
})
