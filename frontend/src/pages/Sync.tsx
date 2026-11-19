import { Link } from 'react-router-dom'
import { useServerProgress } from '@/lib/useServerProgress'
import { useSession } from '@/lib/session'
import { STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'
import { Breadcrumb, StatGrid } from '@/components/common/Workspace'
import { Notice } from '@/components/common/Controls'

/** Account records only. Visitors browse the catalogue; sign-in is for full learning materials. */
export function Sync() {
  const { userState, can } = useSession()
  const server = useServerProgress()
  const accountBacked = can('account-progress')
  return <div className="sc-record-page">
    <Breadcrumb items={[{ label: 'Account' }, { label: 'Account records' }]} />
    <header className="sc-record-header"><div><p className="sc-library-domain">Account / Records</p><h1>Account records</h1><p>Sign in for full learning materials and account-held records. The catalogue and content details stay public.</p></div><StateChip state={userState} /></header>
    <section aria-labelledby="account-records"><div className="sc-record-section-title"><h2 id="account-records">What the platform holds</h2>{accountBacked && server.data && <span>Read at {server.data.checkedAt}</span>}</div>
      {!accountBacked ? <Notice title="Sign in required">Account records are available after sign-in and approval. {STATE_META[userState].summary}<div className="mt-3 flex flex-wrap gap-3"><Link to="/login" className="ws-text-action">Log in →</Link><Link to="/paths" className="ws-text-action">Browse catalogue →</Link>{can('account-status') && <Link to="/account" className="ws-text-action">Check account status →</Link>}</div></Notice> : server.state === 'loading' ? <p role="status">Reading the account record…</p> : server.state === 'denied' || server.state === 'unavailable' ? <Notice live kind="warning">{server.message}</Notice> : server.data ? <><StatGrid label="Account record facts" items={[
        { label: 'Records held', value: server.data.records.length, detail: 'server' },
        { label: 'Completed', value: server.data.completed, detail: 'server' },
        { label: 'Verified', value: server.data.verified, detail: 'server' },
        { label: 'Imported (unverified)', value: server.data.imported, detail: 'imported' },
        { label: 'Server XP ledger', value: server.data.xp, detail: 'server' },
      ]} />{server.data.verified === 0 && server.data.imported > 0 && <p className="sc-record-note">All current account records are unverified imports. They do not carry trusted XP.</p>}{server.data.achievements.length > 0 && <p className="sc-record-note">{server.data.achievements.length} account-side achievement record(s).</p>}</> : null}
    </section>
    <footer className="sc-record-footer"><p>Account records are held on the platform for approved accounts. Public catalogue access does not require sign-in.</p></footer>
  </div>
}
