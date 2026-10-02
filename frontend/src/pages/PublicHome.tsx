import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import learningPaths from '@/content/learning-paths.json'
import { getStatsForPath } from '@/content/stats'
import { useSession } from '@/lib/session'
import { isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'

const availablePaths = learningPaths.filter(path => path.status === 'available')
const pathSummary: Record<string,string> = {
  'wireless-pentesting': 'Understand Wi-Fi security, analyze traffic, and practice testing with supplied captures.',
  'android-pentesting': 'Review Android apps, trace security flaws, and practice with source-code exercises.',
}
const planned = learningPaths.filter(path => path.status !== 'available')

export function PublicHome() {
  const { userState, ready, accountLoading } = useSession()
  const signedIn = (ready || accountLoading) && isSignedIn(userState)
  return <div className="public-home">
    <section className="public-hero"><div className="public-container public-hero-grid"><div className="public-hero-copy"><p className="public-eyebrow">SecCraft / Practical security education</p><h1>Learn cybersecurity <em>by doing.</em></h1><p className="public-lead">Learn. Practice. Investigate. Improve.</p><p>Learn the concepts. Practice with realistic examples. Investigate security problems. Explain what you find.</p><div className="public-actions"><Link className="public-primary" to={signedIn ? '/app' : '/paths'}>{signedIn ? 'Open your workspace' : 'Explore the catalogue'} <ArrowRight size={17} aria-hidden="true" /></Link><Link className="public-secondary" to={signedIn ? '/paths' : '/signup'}>{signedIn ? 'Explore learning paths' : 'Request access'}</Link></div><p className="public-note">The catalogue is public. Lessons, labs and assessments are for approved accounts. Practice progress stays in this browser.</p>{signedIn && <div className="public-session">{accountLoading ? <span role="status">Checking account status…</span> : <><StateChip state={userState} /><span>{STATE_META[userState].nextAction}</span></>}</div>}</div>
      <div className="public-artifact" aria-label="Available learning paths"><div className="public-artifact-head"><span>YOUR NEXT SKILL</span><span>LEARNING PATHS</span></div><h2>Choose where to begin.</h2><p>Follow a structured path from core concepts to hands-on practice.</p><div className="public-path-options">{availablePaths.map(path => {
        const stats = getStatsForPath(path.id)
        return <Link key={path.id} to={`/paths/${path.id}`} className="public-path-option"><span className="public-path-option-title">{path.title}<ArrowRight size={18} aria-hidden="true" /></span><span>{pathSummary[path.id] || path.description}</span><small>{stats.modules} modules · {stats.lessons} lessons</small></Link>
      })}</div><Link to="/paths">Explore all learning paths <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div></section>
    <section className="public-method" id="method"><div className="public-container"><div className="public-method-title"><p className="public-eyebrow">The approach</p><h2>Understand the concept.{' '}<br />Put it into practice.</h2><p>Technical understanding comes before the tool. Work from authored lessons through supplied artifacts and document the limits of your evidence.</p></div><ol>{[
      ['Learn', 'Follow authored lessons and objectives in a structured module sequence.'],
      ['Practice', 'Apply what you learn through guided exercises, source-code reviews and capture analysis.'],
      ['Investigate', 'Work through security challenges and explain the evidence behind your conclusions.'],
      ['Assess', 'Test your reasoning with independent cases and self-review.'],
      ['Improve', 'Record findings, revisit weak areas and build a clearer explanation.'],
    ].map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></div></section>
    <section className="public-access-section" aria-labelledby="actual-practice"><div className="public-container"><p className="public-eyebrow">Put your skills to work</p><h2 id="actual-practice">Work with evidence, not just descriptions.</h2><div className="public-access-rows"><div><span>Wireless</span><h3>Inspect 802.11 captures</h3><p>Use supplied synthetic captures to interpret frames, explain limits and choose a safe next step.</p><Link to="/paths/wireless-pentesting">Explore wireless →</Link></div><div><span>Android</span><h3>Review Android source cases</h3><p>Inspect Android source code, follow data flows, and reason about app security.</p><Link to="/paths/android-pentesting">Explore Android →</Link></div><div><span>Beyond the current catalogue</span><h3>AI / LLM Security</h3><p>On the roadmap. Not available yet.</p><Link to="/paths">See the roadmap →</Link></div></div></div></section>
    <section className="public-curriculum"><div className="public-container public-curriculum-grid"><div><p className="public-eyebrow">Current curriculum</p><h2>Find your learning path.</h2><p>Build your skills through lessons, practical exercises and security investigations. Choose a path that matches what you want to learn.</p><ul>{availablePaths.map(path => <li key={path.id}><Link to={`/paths/${path.id}`}>{path.title} <ArrowRight size={16} aria-hidden="true" /></Link><p>{pathSummary[path.id] || path.description}</p></li>)}</ul></div><div className="public-planned"><h3>Domains on the roadmap</h3><p>These are planned entries, not available courses.</p><ul>{planned.map(path => <li key={path.id}><span>{path.title}</span><small>Planned</small></li>)}</ul></div></div></section>
    <section className="public-access-section"><div className="public-container"><p className="public-eyebrow">Access and records</p><h2>Begin now. Know what each record means.</h2><div className="public-access-rows"><div><span>01 / Catalogue</span><h3>Explore before signing up</h3><p>See every learning path, module and lesson title, with its skills and prerequisites. No account needed.</p></div><div><span>02 / Learning</span><h3>Continue with an approved account</h3><p>Sign up and verify your email. Once your account is approved, you can read the lessons, work through the labs and take the assessments.</p></div><div><span>03 / Boundaries</span><h3>A record of your learning</h3><p>XP and completed exercises help you track practice. They are not independently verified assessments or accredited qualifications.</p></div></div></div></section>
    <section className="public-close"><div className="public-container"><p className="public-eyebrow">Begin with the evidence</p><h2>Go from reading to reasoning.</h2><p>Explore the catalogue now. An approved account opens the lessons, labs and assessments, with account-backed records.</p><div className="public-actions"><Link className="public-primary" to={signedIn ? '/app' : '/paths'}>{signedIn ? 'Open the workspace →' : 'Explore the catalogue →'}</Link>{!signedIn && <Link className="public-secondary" to="/signup">Request an account</Link>}</div><p className="public-note">For authorized security learning and testing only. No accredited certification is issued.</p></div></section>
  </div>
}
