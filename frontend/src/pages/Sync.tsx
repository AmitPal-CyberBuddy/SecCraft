import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CloudUpload, Database, HardDrive, Info, Layers, Lock, ShieldCheck } from 'lucide-react'
import { ProgressSyncPanel } from '@/components/progress/ProgressSyncPanel'
import { useServerProgress } from '@/lib/useServerProgress'
import { useSession } from '@/lib/session'
import { ACCOUNT_SYNC_NOTE, CROSS_DEVICE_NOTE, NO_VERIFICATION_CLAIM, STATE_META } from '@/lib/access'
import { ProvenanceChip, StateChip } from '@/components/account/StateChip'
import { AnimatedCard, FadeIn } from '@/components/animations'

/**
 * Progress sync — a first-class screen rather than a panel buried in Settings.
 *
 * The three records a learner can hold are separated on purpose and never merged:
 *   Local     — this browser, never confirmed
 *   Account   — what the platform holds, split into verified and imported
 *   Imported  — transferred rows, which are permanently unverified
 */
export function Sync() {
  const { userState, can } = useSession()
  const server = useServerProgress()
  const accountBacked = can('account-progress')

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-4 xs:space-y-6">
      <FadeIn>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10">
              <Layers className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-[22px] font-bold leading-none tracking-tight text-slate-100 xs:text-[26px] sc-page-title">
                Progress sync
              </h1>
              <p className="mt-1.5 text-[12.5px] text-slate-400">Where your record lives, and exactly what each part is worth.</p>
            </div>
          </div>
          <StateChip state={userState} />
        </div>
      </FadeIn>

      {/* The three record types, stated plainly before any control appears. */}
      <FadeIn delay={0.05}>
        <div className="grid gap-3 md:grid-cols-3">
          <AnimatedCard glowColor="none" className="p-4" hoverLift={false} delay={0}>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <h2 className="text-[13px] font-bold text-slate-100">Local</h2>
              <ProvenanceChip provenance="local" />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              Recorded in this browser as you work. It is never uploaded on its own, and it is not a verified result.
            </p>
          </AnimatedCard>
          <AnimatedCard glowColor="none" className="p-4" hoverLift={false} delay={0.04}>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              <h2 className="text-[13px] font-bold text-slate-100">Account</h2>
              <ProvenanceChip provenance="server" />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              Held on the platform for your account. Only rows the platform marks as verified are shown as confirmed.
            </p>
          </AnimatedCard>
          <AnimatedCard glowColor="none" className="p-4" hoverLift={false} delay={0.08}>
            <div className="flex items-center gap-2">
              <CloudUpload className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <h2 className="text-[13px] font-bold text-slate-100">Imported</h2>
              <ProvenanceChip provenance="imported" />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              Transferred in from a file. Imported rows stay unverified forever and can never award XP or a certificate.
            </p>
          </AnimatedCard>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-cyan-100/90">{ACCOUNT_SYNC_NOTE}</p>
        </div>
      </FadeIn>

      {/* Account snapshot */}
      <FadeIn delay={0.11}>
        <AnimatedCard glowColor={accountBacked ? 'emerald' : 'none'} className="p-4 xs:p-5 sm:p-6" hoverLift={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[14px] font-bold text-slate-100">
              <Database className="h-4 w-4 text-emerald-400" aria-hidden="true" /> What the platform holds
            </h2>
            {accountBacked && server.data && <span className="text-[11px] font-mono text-slate-500">Read at {server.data.checkedAt}</span>}
          </div>

          <div className="mt-4">
            {!accountBacked ? (
              <div className="rounded-xl border border-[#1e293b] bg-[#020617]/50 p-4">
                <div className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-200">Account-backed progress is not available in this state.</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
                      {STATE_META[userState].summary} Everything on this page still works for the local record: exporting
                      it, moving it to another device, and importing it back.
                    </p>
                    {can('account-status') && (
                      <Link to="/account" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#334155] px-3 text-[12px] text-slate-200 transition-colors hover:bg-[#1e293b]">
                        Check account status <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : server.state === 'loading' ? (
              <p className="flex items-center gap-2 text-[12.5px] text-slate-400" role="status" aria-live="polite">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" aria-hidden="true" /> Reading the account record…
              </p>
            ) : server.state === 'denied' || server.state === 'unavailable' ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <p className="text-[12.5px] leading-relaxed text-amber-100/90">{server.message}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                  Your local record is unaffected and still exports below.
                </p>
              </div>
            ) : server.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Records held', value: server.data.records.length, chip: 'server' as const, sub: `${server.data.completed} completed` },
                    { label: 'Verified', value: server.data.verified, chip: 'server' as const, sub: 'confirmed by the platform' },
                    { label: 'Imported', value: server.data.imported, chip: 'imported' as const, sub: 'unverified' },
                    { label: 'Server XP', value: server.data.xp, chip: 'server' as const, sub: 'verified ledger' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-[#1e293b] bg-[#020617]/50 p-3">
                      <div className="font-mono text-[20px] font-bold leading-none text-slate-100">{stat.value}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">{stat.label}</span>
                        <ProvenanceChip provenance={stat.chip} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {server.data.verified === 0 && server.data.imported > 0 && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[12px] leading-relaxed text-amber-100/90">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Everything currently on your account came in as an unverified import. It is kept as a record of what you
                    did, but it is not a verified result and it does not carry XP.
                  </p>
                )}

                {server.data.achievements.length > 0 && (
                  <div className="rounded-xl border border-[#1e293b] bg-[#020617]/50 p-3.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                      <span className="text-[12px] font-semibold text-slate-200">{server.data.achievements.length} achievement record(s) on the account</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                      These are account-side award records. They are separate from the local badges in this browser.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </AnimatedCard>
      </FadeIn>

      {/* Import / export / merge */}
      <FadeIn delay={0.14}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}>
          <ProgressSyncPanel />
        </motion.div>
      </FadeIn>

      <FadeIn delay={0.17}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            <p className="text-[12px] leading-relaxed text-slate-400">{CROSS_DEVICE_NOTE}</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <p className="text-[12px] leading-relaxed text-slate-400">{NO_VERIFICATION_CLAIM}</p>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}
