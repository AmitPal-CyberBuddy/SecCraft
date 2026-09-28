import { motion } from 'framer-motion'
import { Radio, FlaskConical, Wifi, ShieldAlert } from 'lucide-react'

export type LabTier = 'SIMULATION' | 'HYBRID' | 'RF_REQUIRED'

const TIERS: Record<LabTier, {
  dot: string
  text: string
  border: string
  bg: string
  icon: typeof Radio
  title: string
  oneLiner: string
}> = {
  SIMULATION: {
    dot: '🟢',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/10',
    icon: FlaskConical,
    title: 'SIMULATION — provable entirely from artefacts',
    oneLiner: 'Real captures, configs and logs. No radio hardware needed.',
  },
  HYBRID: {
    dot: '🟡',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/10',
    icon: Radio,
    title: 'HYBRID — the concept is provable offline, confidence needs real hardware',
    oneLiner: 'Artefact analysis works; validate on your own AP/adapter when you have one.',
  },
  RF_REQUIRED: {
    dot: '🔴',
    text: 'text-rose-400',
    border: 'border-rose-500/25',
    bg: 'bg-rose-500/10',
    icon: ShieldAlert,
    title: 'RF_REQUIRED — the air is the subject of the test',
    oneLiner: 'A PCAP simulation cannot substitute for RF testing (injection, client behaviour, interference).',
  },
}

export function normaliseTier(value: string | undefined | null): LabTier {
  if (!value) return 'SIMULATION'
  const v = value.toUpperCase().replace(/[\s-]/g, '_')
  if (v === 'HYBRID') return 'HYBRID'
  if (v === 'RF_REQUIRED' || v === 'HARDWARE') return 'RF_REQUIRED'
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
      {showLabel ? normaliseTier(tier).replace('_', ' ') : normaliseTier(tier).slice(0, 1)}
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
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border ${t.border} ${t.bg} p-3.5`}
          >
            <div className={`flex items-center gap-2 text-[11px] font-mono font-semibold ${t.text}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{t.dot} {key.replace('_', ' ')}</span>
            </div>
            <p className="mt-2 text-[12px] text-slate-300 leading-relaxed">{t.oneLiner}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

export function HarwareModeNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-slate-500 leading-relaxed ${className}`}>
      <Wifi className="inline w-3 h-3 mr-1 -mt-0.5" />
      Simulations never claim to be RF testing. When a lesson is marked <span className="font-mono text-rose-400">RF_REQUIRED</span>,
      the lesson explains what a capture can and cannot establish, and what to run on your own hardware if you have it.
    </p>
  )
}
