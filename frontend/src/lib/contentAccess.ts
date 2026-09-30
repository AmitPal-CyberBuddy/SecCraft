/**
 * Content tier model: Preview Curriculum vs Full Curriculum.
 *
 * ## This is a product boundary, not a security boundary
 *
 * All 20 modules ship inside the public Vite bundle and `/api/modules` is served without
 * authentication. Hiding a module behind a client-side check would create the appearance of
 * protection that does not exist — anyone can read the JSON in the bundle or call the public
 * endpoint. So the UI must never describe the Full Curriculum as locked, protected, or
 * inaccessible without an account. It is *account content* in the product sense: the approved
 * learning experience, where progress becomes a record.
 *
 * Real gating requires backend work that is deliberately out of scope here — see
 * `docs/PREVIEW_VS_APPROVED_PLAN.md` §6:
 *
 *   1. an entitlement / content-visibility field on content,
 *   2. authenticated content endpoints serving the Full Curriculum,
 *   3. the catalogue served from the API rather than bundled into the static build.
 *
 * Until that exists, `canAccessModule` decides what we *present as the approved experience*, and
 * nothing more.
 *
 * The tier is derived from fields that already exist in `modules.json` (`phase`), so no content
 * JSON is edited. A regression test pins the derived set to exactly modules 01–06.
 */

import modules from '@/content/modules.json'
import type { UserState } from './access'

export type ContentTier = 'preview' | 'full'

/** Phases 1–2 are the Preview Curriculum: Foundations, Reconnaissance, Traffic Analysis. */
export const PREVIEW_MAX_PHASE = 2

export const CONTENT_TIER_META: Record<ContentTier, { label: string; blurb: string }> = {
  preview: {
    label: 'Preview Curriculum',
    blurb:
      'A real slice of the SecCraft method — foundations, reconnaissance, and traffic analysis — open to everyone, with no account required.',
  },
  full: {
    label: 'Full Curriculum',
    blurb:
      'The complete path, including the authored modules and the final assessment. This is the account learning experience, where your progress becomes a record you can rely on.',
  },
}

/**
 * The one sentence shown wherever the boundary is visible. It is deliberately specific about
 * *why* the Full Curriculum matters — the record, not secrecy — and deliberately does not claim
 * the content cannot be reached without an account.
 */
export const CONTENT_TIER_NOTE =
  'The Full Curriculum is where account-backed progress, verified records, and assessment history begin. It is the account learning experience — not a secret, and not a security boundary on this site.'

export const CONTENT_NOT_ENFORCED_NOTE =
  'Preview and Full describe the learning experience, not access control. Course content is public on this site; account status decides what is *recorded*, never what can be *read*.'

/** The minimum a content record needs for the tier to be derivable. */
export interface TieredContent {
  id: string
  phase?: number | string
}

function toPhase(phase: TieredContent['phase']): number | null {
  if (typeof phase === 'number' && Number.isFinite(phase)) return phase
  if (typeof phase === 'string' && phase.trim() !== '') {
    const parsed = Number(phase)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * The tier of a single module or lesson's parent module.
 *
 * Anything whose phase cannot be read is treated as Full. An unparseable record must not
 * silently widen the public preview.
 */
export function contentTierOf(item: TieredContent): ContentTier {
  const phase = toPhase(item.phase)
  if (phase === null) return 'full'
  return phase <= PREVIEW_MAX_PHASE ? 'preview' : 'full'
}

export function isPreviewContent(item: TieredContent): boolean {
  return contentTierOf(item) === 'preview'
}

/** The tiers this account state is being shown. */
export function availableTiers(state: UserState): ContentTier[] {
  return state === 'active' || state === 'owner' ? ['preview', 'full'] : ['preview']
}

export function canAccessTier(state: UserState, tier: ContentTier): boolean {
  return availableTiers(state).includes(tier)
}

export function canAccessModule(state: UserState, item: TieredContent): boolean {
  return canAccessTier(state, contentTierOf(item))
}

/** Counts, derived once from the shipped content so the UI can never quote a stale figure. */
export const TIER_COUNTS = (() => {
  const out = { preview: 0, full: 0 }
  for (const m of modules as TieredContent[]) out[contentTierOf(m)] += 1
  return out
})()

export const PREVIEW_MODULE_COUNT = TIER_COUNTS.preview
export const FULL_MODULE_COUNT = TIER_COUNTS.full
export const TOTAL_MODULE_COUNT = TIER_COUNTS.preview + TIER_COUNTS.full

/** The highest tier the current state is being shown — used for "Your curriculum" labelling. */
export function currentCurriculumLabel(state: UserState): string {
  return canAccessTier(state, 'full') ? CONTENT_TIER_META.full.label : CONTENT_TIER_META.preview.label
}
