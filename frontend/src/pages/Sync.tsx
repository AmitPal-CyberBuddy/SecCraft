import { Link } from 'react-router-dom'
import { ProgressSyncPanel } from '@/components/progress/ProgressSyncPanel'
import { useServerProgress } from '@/lib/useServerProgress'
import { useProgressStore } from '@/store/useProgressStore'
import { useSession } from '@/lib/session'
import { ACCOUNT_SYNC_NOTE, CROSS_DEVICE_NOTE, NO_VERIFICATION_CLAIM, STATE_META } from '@/lib/access'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'

/** Record origins are distinct: local practice, account-held rows, and permanently unverified imports. */
export function Sync() {
  const { userState, can } = useSession()
  const server = useServerProgress()
  const accountBacked = can('account-progress')
  const totalXp = useProgressStore(s => s.getTotalXp())
  return <div className="sc-record-page">
    <header className="sc-record-header"><div><p className="sc-library-domain">Account / Records</p><h1>Your progress</h1><p>Review this device, your account and imports. Export or import your practice record below.</p></div><StateChip state={userState} /></header>
    <section aria-labelledby="record-origins"><div className="sc-record-section-title"><h2 id="record-origins">Where progress lives</h2><details className="sc-sync-explainer"><summary>How progress works</summary><p>{ACCOUNT_SYNC_NOTE}</p><p>{CROSS_DEVICE_NOTE} {NO_VERIFICATION_CLAIM}</p></details></div><div className="sc-record-origins"><div><span>01 / Local</span><h3>Practice in this browser <ProvenanceChip provenance="local" /></h3><p>Recorded here as you work. It is not uploaded on its own and is not a verified result.</p><strong>{totalXp} practice XP · unverified</strong></div><div><span>02 / Account</span><h3>Platform-held records <ProvenanceChip provenance="server" /></h3><p>Available for approved accounts. Only rows marked verified by the platform appear as confirmed.</p></div><div><span>03 / Imported</span><h3>Transferred records <ProvenanceChip provenance="imported" /></h3><p>Imports stay unverified and cannot issue trusted XP or certificates—even when stored on an account.</p></div></div></section>
    <section aria-labelledby="account-records"><div className="sc-record-section-title"><h2 id="account-records">What the platform holds</h2>{accountBacked && server.data && <span>Read at {server.data.checkedAt}</span>}</div>
      {!accountBacked ? <div className="sc-record-message"><p>Account-backed progress is not available in this state. {STATE_META[userState].summary} Local export and import still work below.</p>{can('account-status') && <Link to="/account" className="ws-text-action">Check account status →</Link>} <a href="#transfer-records" className="ws-text-action">Export browser progress →</a></div> : server.state === 'loading' ? <p role="status">Reading the account record…</p> : server.state === 'denied' || server.state === 'unavailable' ? <div className="sc-record-message" role="status"><p>{server.message}</p><p>Your local record is unaffected and still exports below.</p></div> : server.data ? <><dl className="sc-record-facts">{([
        ['Records held', server.data.records.length, 'server' as const],
        ['Completed', server.data.completed, 'server' as const],
        ['Verified', server.data.verified, 'server' as const],
        ['Imported (unverified)', server.data.imported, 'imported' as const],
        ['Server XP ledger', server.data.xp, 'server' as const],
      ] as const).map(([label, value, origin]) => <div key={label}><dt>{label} <ProvenanceChip provenance={origin} /></dt><dd>{value}</dd></div>)}</dl>{server.data.verified === 0 && server.data.imported > 0 && <p className="sc-record-note">All current account records are unverified imports. They do not carry trusted XP.</p>}{server.data.achievements.length > 0 && <p className="sc-record-note">{server.data.achievements.length} account-side achievement record(s), separate from this browser’s local badges.</p>}</> : null}
    </section>
    <section aria-labelledby="transfer-records"><div className="sc-record-section-title"><h2 id="transfer-records">Export, import & reconcile</h2><p>Review the preview and conflicts before applying a transfer. Imports never become verified by merging.</p></div><ProgressSyncPanel /></section>
    <footer className="sc-record-footer"><p>{CROSS_DEVICE_NOTE}</p><p>{NO_VERIFICATION_CLAIM}</p></footer>
  </div>
}
