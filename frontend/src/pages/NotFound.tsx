import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Compass, Search } from 'lucide-react'

export function NotFound() {
  const location = useLocation()
  const route = `${location.pathname}${location.search}`

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-code" aria-hidden="true">404</div>
      <div className="not-found-icon"><Compass className="w-5 h-5" /></div>
      <p className="not-found-kicker">ROUTE NOT FOUND</p>
      <h1 id="not-found-title">This path doesn’t resolve to a workspace.</h1>
      <p className="not-found-copy">The address may be out of date, or the destination may have moved. Your learning data is unchanged.</p>
      <code className="not-found-route">{route}</code>
      <div className="not-found-actions">
        <Link to="/" className="not-found-primary"><ArrowLeft className="w-4 h-4" /> Back to dashboard</Link>
        <button type="button" className="not-found-secondary" onClick={() => document.dispatchEvent(new CustomEvent('open-search'))}><Search className="w-4 h-4" /> Search SecCraft</button>
      </div>
    </section>
  )
}
