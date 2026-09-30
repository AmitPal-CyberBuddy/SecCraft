import { moduleOrdinal } from '@/content/module-ordinal'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useProgressStore } from '@/store/useProgressStore'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import { getStatsForPath } from '@/content/stats'
import { ActionLink, ProgressBar } from '@/components/common/Workspace'
import { contentTierOf } from '@/lib/contentAccess'

export function PathDetail() {
  const { pathId } = useParams()
  const getModuleProgress = useProgressStore(s => s.getModuleProgress)
  const getPathProgress = useProgressStore(s => s.getPathProgress)
  const path = learningPaths.find(p => p.id === pathId)
  if (!path) return <Navigate to="/paths" replace />
  const stats = getStatsForPath(path.id)
  const pathProgress = getPathProgress(path.id)
  const nextModule = path.modules.map(id => modules.find(m => m.id === id)).find(m => m && getModuleProgress(m.id) < 100)
  const phases = path.phases.length ? path.phases : [{ id: 1, name: 'Curriculum', desc: '', modules: path.modules }]
  return <div className="sc-path-map">
    <nav aria-label="Breadcrumb" className="ws-breadcrumb"><Link to="/paths">Learning paths</Link><span aria-hidden="true">/</span><span aria-current="page">{path.title}</span></nav>
    <header className="sc-path-hero"><div><p className="sc-library-domain">{path.category} / {path.status === 'available' ? 'Available curriculum' : 'Planned domain'}</p><h1>{path.title}</h1><p>{path.longDescription}</p><div className="sc-path-meta"><span>{path.difficulty}</span><span>{path.estimatedHours}h estimated</span><span>{stats.modules} modules</span><span>{stats.lessons} lessons</span><span>{stats.labs} labs</span><span>{path.challenges} challenges</span></div></div><div className="sc-path-progress"><span>Learning record · this browser</span><strong>{pathProgress}%</strong><ProgressBar value={pathProgress} label={`${path.title} practice progress`} /><small>Preview and Full describe the experience, not protected content.</small></div></header>
    {path.status !== 'available' ? <div className="sc-path-planned"><h2>Curriculum in planning</h2><p>The curriculum for this path is not yet available. Explore an available path to start now.</p><ActionLink to="/paths" secondary>Back to catalogue</ActionLink></div> : <>
      <section className="sc-path-contract" aria-labelledby="path-contract-title">
        <div className="sc-section-intro"><span>Before you begin</span><h2 id="path-contract-title">What this path covers</h2></div>
        <div className="sc-contract-grid">
          <div><h3>Who it is for</h3><p>{path.difficulty} learners who want structured, authorized practice. No formal entry requirement is recorded for this path.</p></div>
          <div><h3>What you will work through</h3><p>{phases.map(phase => phase.name).join(' → ')}. {stats.lessons} authored lessons and {stats.labs} supplied labs.</p></div>
          <div><h3>Skills practiced</h3><p>{path.skills.map(skill => skill.replaceAll('-', ' ')).join(' · ')}.</p></div>
          <div><h3>Evidence and assessment boundary</h3><p>{path.id === 'android-pentesting' ? 'Source-backed cases and optional owned-device testing; no prebuilt APK or measured dynamic outcome is supplied.' : 'Synthetic wireless captures and self-review challenges; owned RF testing is optional.'} Practice results are local and unverified. No independent grading or certificate is issued.</p></div>
        </div>
      </section>
      {nextModule && <section className="sc-path-next" aria-label="Recommended next module"><div><span className="sc-library-domain">Next in sequence</span><h2>{nextModule.title}</h2><p>{nextModule.description}</p></div><ActionLink to={`/paths/${path.id}/modules/${nextModule.id}`}>Continue learning →</ActionLink></section>}
      <div className="sc-map-columns"><div><div className="sc-section-intro"><span>Curriculum map</span><h2>Follow the sequence</h2><p>Progress below reflects practice saved in this browser.</p></div>
        {phases.map((phase, index) => <section className="sc-map-phase" key={phase.id} aria-labelledby={`phase-${phase.id}`}><div className="sc-map-phase-title"><span>{String(index + 1).padStart(2,'0')}</span><div><h3 id={`phase-${phase.id}`}>{phase.name}</h3><p>{phase.desc}</p></div></div><ol>{phase.modules.map(id => { const module = modules.find(m => m.id === id); if (!module) return null; const progress = getModuleProgress(module.id); return <li key={id}><span className="sc-map-number">{moduleOrdinal(module.id)}</span><div><Link to={`/paths/${path.id}/modules/${module.id}`}>{module.title}</Link><small>{contentTierOf({ id: module.id, phase: module.phase }) === 'preview' ? 'Preview Curriculum' : 'Full Curriculum'} · {module.lessons.length} lessons</small></div><span className="sc-map-state">{progress === 100 ? 'Complete' : progress ? `${progress}%` : 'Not started'}</span></li> })}</ol></section>)}
        <div className="ws-path-links"><ActionLink to={`/paths/${path.id}/modules`} secondary>All modules →</ActionLink><ActionLink to={`/labs?path=${path.id}`} secondary>Labs →</ActionLink><ActionLink to={`/challenges?path=${path.id}`} secondary>Challenges →</ActionLink></div></div>
        <aside className="sc-map-aside">{path.skills.length > 0 && <section><h2>Skills covered</h2><ul>{path.skills.map(skill => <li key={skill}>{skill.replaceAll('-', ' ')}</li>)}</ul></section>}{path.prerequisites.length > 0 && <section><h2>Before you start</h2><ul>{path.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></section>}</aside></div>
    </>}
  </div>
}
