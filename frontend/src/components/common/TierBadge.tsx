import { Radio, FlaskConical, Wifi, ShieldAlert } from 'lucide-react'

export type LabTier = 'SIMULATION' | 'HYBRID' | 'RF_REQUIRED'

const TIERS: Record<LabTier, {
  label: string
  dot: string
  text: string
  border: string
  bg: string
  icon: typeof Radio
  title: string
  oneLiner: string
}> = {
  SIMULATION: {
    label: 'Offline evidence',
    dot: '🟢',
    text: 'text-[var(--success)]',
    border: 'border-[var(--success-border)]',
    bg: 'bg-[var(--success-bg)]',
    icon: FlaskConical,
    title: 'SIMULATION — activity uses bundled teaching artefacts',
    oneLiner: 'Offline artifact review; lab grading is labeled separately as Answer-Checked or Self-Review. A capture never proves live RF behavior.',
  },
  HYBRID: {
    label: 'Offline + optional hardware',
    dot: '🟡',
    text: 'text-[var(--attention)]',
    border: 'border-[var(--warning-border)]',
    bg: 'bg-[var(--warning-bg)]',
    icon: Radio,
    title: 'Offline reasoning with optional owned-hardware validation',
    oneLiner: 'Supplied evidence supports reasoning, not live execution. Validate physical behavior only on isolated, authorized equipment. No hosted lab is supplied.',
  },
  RF_REQUIRED: {
    label: 'RF validation needs hardware',
    dot: '🔴',
    text: 'text-[var(--danger)]',
    border: 'border-[var(--danger-border)]',
    bg: 'bg-[var(--danger-bg)]',
    icon: ShieldAlert,
    title: 'RF_REQUIRED — the air is the subject of the test',
    oneLiner: 'A PCAP simulation cannot substitute for RF testing (injection, client behaviour, interference).',
  },
}

export function normaliseTier(value: string | undefined | null): LabTier {
  if (!value) return 'SIMULATION'
  const v = value.toUpperCase().replace(/[\s-]/g, '_')
  if (v === 'HYBRID') return 'HYBRID'
  if (v === 'RF_REQUIRED' || v === 'HARDWARE' || v === 'REAL') return 'RF_REQUIRED'
  return 'SIMULATION'
}

export function TierBadge({
  tier,
  size = 'sm',
  showLabel = true,
  className = '',
}: {
  tier: string | undefined | null
  size?: 'xs' | 'sm'
  showLabel?: boolean
  className?: string
}) {
  const t = TIERS[normaliseTier(tier)]
  const Icon = t.icon
  return (
    <span
      title={`${t.title} — ${t.oneLiner}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium backdrop-blur-sm whitespace-nowrap ${t.bg} ${t.border} ${t.text} ${
        size === 'xs' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1'
      } ${className}`}
    >
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {showLabel ? t.label : normaliseTier(tier).slice(0, 1)}
    </span>
  )
}

/** Explanatory legend — put this wherever a learner meets the badges for the first time. */
export function TierLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {(Object.keys(TIERS) as LabTier[]).map(key => {
        const t = TIERS[key]
        const Icon = t.icon
        return (
          <div
            key={key}
            className={`rounded-xl border ${t.border} ${t.bg} p-3.5`}
          >
            <div className={`flex items-center gap-2 text-[11px] font-mono font-semibold ${t.text}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{t.dot} {t.label}</span>
            </div>
            <p className="mt-2 text-[12px] text-[var(--ink-secondary)] leading-relaxed">{t.oneLiner}</p>
          </div>
        )
      })}
    </div>
  )
}

export function HarwareModeNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-[var(--ink-muted)] leading-relaxed ${className}`}>
      <Wifi className="inline w-3 h-3 mr-1 -mt-0.5" />
      Offline evidence is not RF testing. When a lesson is marked <span className="font-mono text-[var(--danger)]">RF validation needs hardware</span>,
      the lesson explains what a capture can and cannot establish, and what to run on your own hardware if you have it.
    </p>
  )
}
