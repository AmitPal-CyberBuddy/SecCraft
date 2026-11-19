import { Link } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { allows, CERTIFICATE_DISABLED_NOTE } from '@/lib/access'
import { ShieldAlert } from 'lucide-react'

/**
 * Certificate entry point.
 *
 * Issuance is switched off for every user state. A certificate built from unverified
 * practice would assert a verified achievement that nothing on the platform has confirmed,
 * which is a worse failure than not having one. The `certificate` capability in
 * `lib/access.ts` is the single switch: when the platform issues verified XP and a
 * completion record, restoring issuance here needs no change to the catalogue.
 */
export function Certificate({ className = '' }: { className?: string }) {
  const { userState } = useSession()
  if (!allows(userState, 'certificate')) return <CertificateUnavailable className={className} />
  return <CertificateUnavailable className={className} />
}

function CertificateUnavailable({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-6 xs:p-8 ${className}`}
      role="status"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)]">
          <ShieldAlert className="h-5 w-5 text-[var(--attention)]" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-[16px] font-semibold text-[var(--ink-primary)]">Certificates are not issued yet</h2>
          <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-[var(--ink-secondary)]">{CERTIFICATE_DISABLED_NOTE}</p>
          <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-[var(--ink-muted)]">
            We would rather show nothing than hand out a document that looks like proof of
            something the platform has not checked. Sign in for full learning materials;
            the catalogue and content details stay public.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/paths"
              className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-bg)] px-3.5 text-[12px] font-semibold text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] focus-ring"
            >
              Browse the catalogue
            </Link>
            <Link
              to="/app"
              className="inline-flex min-h-9 items-center rounded-xl border border-[var(--line-normal)] bg-[var(--panel-bg)] px-3.5 text-[12px] font-semibold text-[var(--ink-primary)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] focus-ring"
            >
              Back to the dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
