/**
 * Content maturity: how finished a piece of the catalogue is.
 *
 * This is deliberately NOT access. Who may read lessons, labs and assessments is decided by the
 * account state (`allows(state, 'learning-content')` in `access.ts`) and enforced by the API.
 * Maturity only labels the content itself:
 *
 *   Preview      published, but early or limited; still being built out
 *   Published    available, complete for its stated scope
 *   Coming soon  planned; not available yet
 *
 * The catalogue may set `maturity` explicitly on a path or module. Until it does, it is derived
 * from fields that already exist: a path is Published when its `status` is `available` and Coming
 * soon otherwise; a module is Preview when its `content_status` is `brief` and Published otherwise.
 * That derivation is provisional: which modules are Preview is an editorial decision.
 *
 * A third, unrelated idea is the *lab environment* (offline evidence, optional hardware, RF
 * validation), which `TierBadge` shows. Do not mix the three.
 */

export type ContentMaturity = 'preview' | 'published' | 'coming-soon'

export const MATURITY_META: Record<ContentMaturity, { label: string; blurb: string }> = {
  preview: { label: 'Preview', blurb: 'Published, but early or limited. It is still being built out.' },
  published: { label: 'Published', blurb: 'Available, and complete for its stated scope.' },
  'coming-soon': { label: 'Coming soon', blurb: 'Planned. Not available yet.' },
}

function explicit(value: string | undefined): ContentMaturity | null {
  return value === 'preview' || value === 'published' || value === 'coming-soon' ? value : null
}

/** A learning path is Published when it is available and Coming soon otherwise. */
export function maturityOfPath(path: { maturity?: string; status?: string }): ContentMaturity {
  return explicit(path.maturity) ?? (path.status === 'available' ? 'published' : 'coming-soon')
}

/** A module is Preview when it is marked `brief` and Published otherwise. */
export function maturityOfModule(module: { maturity?: string; content_status?: string }): ContentMaturity {
  return explicit(module.maturity) ?? (module.content_status === 'brief' ? 'preview' : 'published')
}
