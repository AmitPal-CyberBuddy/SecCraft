import { motion } from 'framer-motion'
import { CloudOff, Database, Eye, Fingerprint, Globe, ShieldCheck, Sparkles, UserRound, UserX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PROVENANCE_META, STATE_META, type Provenance, type StateTone, type UserState } from '@/lib/access'

/**
 * A single tone scale shared by account state and data-provenance chips.
 * Colour is always paired with a text label so state is never communicated by hue alone.
 */
const TONE_CLASS: Record<StateTone, string> = {
  neutral: 'border-slate-600/50 bg-slate-500/10 text-slate-300',
  guest: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200',
  pending: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  active: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
  danger: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
  owner: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
}

const TONE_DOT: Record<StateTone, string> = {
  neutral: 'bg-slate-400',
  guest: 'bg-cyan-300',
  pending: 'bg-amber-300',
  active: 'bg-emerald-300',
  danger: 'bg-rose-300',
  owner: 'bg-violet-300',
}

export const STATE_ICON: Record<UserState, LucideIcon> = {
  public: Globe,
  guest: Eye,
  pending: Fingerprint,
  active: ShieldCheck,
  rejected: UserX,
  suspended: UserX,
  owner: Sparkles,
}

export const PROVENANCE_ICON: Record<Provenance, LucideIcon> = {
  local: UserRound,
  derived: Sparkles,
  server: Database,
  imported: CloudOff,
}

const SIZE_CLASS = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-[11px] px-2.5 py-1 gap-1.5',
} as const

/**
 * The product state, rendered as a labelled chip. The label changes with the state, so the chip
 * animates in place instead of swapping abruptly when a learner signs in or is approved.
 */
export function StateChip({ state, size = 'md', className = '' }: { state: UserState; size?: keyof typeof SIZE_CLASS; className?: string }) {
  const meta = STATE_META[state]
  const Icon = STATE_ICON[state]
  return (
    <motion.span
      key={state}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex shrink-0 items-center rounded-full border font-semibold ${SIZE_CLASS[size]} ${TONE_CLASS[meta.tone]} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {meta.label}
    </motion.span>
  )
}

/**
 * Where a number came from. Used next to any figure a reader could otherwise mistake for a
 * server-confirmed result.
 */
export function ProvenanceChip({ provenance, size = 'sm', className = '' }: { provenance: Provenance; size?: keyof typeof SIZE_CLASS; className?: string }) {
  const meta = PROVENANCE_META[provenance]
  const Icon = PROVENANCE_ICON[provenance]
  return (
    <span
      title={meta.note}
      className={`inline-flex shrink-0 items-center rounded-full border font-mono font-semibold uppercase tracking-wide ${SIZE_CLASS[size]} ${TONE_CLASS[meta.tone]} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/** Small state dot used where a full chip would be too heavy. */
export function StateDot({ state, withLabel = false }: { state: UserState; withLabel?: boolean }) {
  const meta = STATE_META[state]
  return (
    <span className="inline-flex items-center gap-1.5" title={meta.summary}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[meta.tone]}`} aria-hidden="true" />
      {withLabel && <span className="text-[11px] font-medium text-slate-300">{meta.label}</span>}
    </span>
  )
}

export function toneClasses(tone: StateTone) {
  return TONE_CLASS[tone]
}

/** Identity is known, but the API has not established an account decision. */
export function UnavailableStatusChip({ size = 'md' }: { size?: keyof typeof SIZE_CLASS }) {
  return <span className={`inline-flex items-center rounded-full border font-semibold ${SIZE_CLASS[size]} ${TONE_CLASS.neutral}`}>Status unavailable</span>
}
