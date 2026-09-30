/**
 * SecCraft user-state model.
 *
 * This module is the single source of truth for "who is looking at the product" and for what that
 * person is allowed to *see*. It deliberately contains no network calls and no authorization logic:
 *
 *  - It never grants access. The API is the authorization boundary and independently validates the
 *    bearer token, email confirmation, account status, and the owner allowlist on every call.
 *  - It is used to choose what to render, which copy to show, and where to place the primary action.
 *  - A capability that says "available" here does not make a protected request succeed, and a
 *    capability that says "restricted" does not replace the server's own 403.
 */

export type UserState =
  /** Not signed in and not using the learning workspace. */
  | 'public'
  /** Signed out, but actively using the learning workspace. Progress is browser-local. */
  | 'guest'
  /** Signed in, email confirmed, waiting for the platform owner to approve access. */
  | 'pending'
  /** Signed in and approved. Account-backed routes are reachable. */
  | 'active'
  /** Signed in, access request was not approved. Guest learning is unaffected. */
  | 'rejected'
  /** Signed in, account suspended by the owner. Guest learning is unaffected. */
  | 'suspended'
  /** On the server-controlled owner allowlist. */
  | 'owner'

export type AccountStatus = 'pending' | 'active' | 'rejected' | 'suspended'

/** The shape returned by `GET /api/v1/account`. */
export interface AccountRecord {
  user_id: string
  email: string | null
  account_status: AccountStatus
  is_admin: boolean
  created_at?: string | null
  reviewed_at?: string | null
}

/**
 * Reachability of the account API, tracked separately from the learning app so that a backend
 * outage can never be mistaken for a signed-out learner.
 */
export type ApiState = 'unknown' | 'reachable' | 'unreachable'

/** Whether the identity provider is configured in this build at all. */
export type AuthAvailability = 'unavailable' | 'ready'

/* ------------------------------------------------------------------ *
 * Capabilities
 * ------------------------------------------------------------------ */

export type Capability =
  | 'guest-workspace'
  | 'local-progress'
  | 'profile'
  | 'settings'
  | 'progress-file'
  | 'account-status'
  | 'password-recovery'
  | 'request-account'
  | 'account-progress'
  | 'progress-merge'
  | 'assessment-attempts'
  | 'admin-console'

const LEARNER_STATES: UserState[] = ['public', 'guest', 'pending', 'active', 'rejected', 'suspended']
const SIGNED_IN_STATES: UserState[] = ['pending', 'active', 'rejected', 'suspended', 'owner']
const ACCOUNT_BACKED_STATES: UserState[] = ['active', 'owner']

/**
 * The access matrix, in one readable place. `public` is included in the learner set so that a
 * visitor who opens a learning URL directly is treated exactly like a guest — no artificial block.
 */
export const ACCESS_MATRIX: Record<Capability, UserState[]> = {
  'guest-workspace': LEARNER_STATES,
  'local-progress': LEARNER_STATES,
  profile: LEARNER_STATES,
  settings: LEARNER_STATES,
  'progress-file': LEARNER_STATES,
  'account-status': SIGNED_IN_STATES,
  'password-recovery': LEARNER_STATES,
  'request-account': ['public', 'guest', 'pending', 'rejected', 'suspended'],
  'account-progress': ACCOUNT_BACKED_STATES,
  'progress-merge': ACCOUNT_BACKED_STATES,
  'assessment-attempts': ACCOUNT_BACKED_STATES,
  'admin-console': ['owner'],
}

export function allows(state: UserState, capability: Capability): boolean {
  return ACCESS_MATRIX[capability].includes(state)
}

/* ------------------------------------------------------------------ *
 * State derivation
 * ------------------------------------------------------------------ */

export interface DeriveStateInput {
  hasSession: boolean
  account: AccountRecord | null
}

/**
 * Collapse a session plus an account record into a single product state.
 *
 * The owner allowlist is evaluated first because an allowlisted account is an authorization source
 * rather than a learner profile awaiting review.
 */
export function deriveUserState({ hasSession, account }: DeriveStateInput): UserState {
  if (!hasSession) return 'guest'
  if (account?.is_admin === true) return 'owner'
  switch (account?.account_status) {
    case 'active':
      return 'active'
    case 'rejected':
      return 'rejected'
    case 'suspended':
      return 'suspended'
    case 'pending':
    default:
      // A verified session whose profile the API has not returned yet is still pending approval.
      return 'pending'
  }
}

export function isSignedIn(state: UserState): boolean {
  return state !== 'public' && state !== 'guest'
}

export function isOwner(state: UserState): boolean {
  return state === 'owner'
}

export function hasAccountBackedData(state: UserState): boolean {
  return allows(state, 'account-progress')
}

/* ------------------------------------------------------------------ *
 * Presentation tokens
 * ------------------------------------------------------------------ */

export type StateTone = 'neutral' | 'guest' | 'pending' | 'active' | 'danger' | 'owner'

export interface StateDescriptor {
  label: string
  tone: StateTone
  /** One line the user can act on. */
  nextAction: string
  /** What the product does for this person, in plain language. */
  summary: string
}

export const STATE_META: Record<UserState, StateDescriptor> = {
  public: {
    label: 'Visitor',
    tone: 'neutral',
    nextAction: 'Explore the platform — no account required.',
    summary: 'You can read the material and open the guest workspace. Nothing is stored for you yet.',
  },
  guest: {
    label: 'Guest learner',
    tone: 'guest',
    nextAction: 'Start a module — progress is saved in this browser.',
    summary: 'Every learning surface is open. Progress, XP, and notes stay on this device.',
  },
  pending: {
    label: 'Approval pending',
    tone: 'pending',
    nextAction: 'Nothing to do — keep learning as a guest while the request is reviewed.',
    summary:
      'Your email is verified and your request is with the platform owner. Account-backed features switch on only after approval.',
  },
  active: {
    label: 'Approved account',
    tone: 'active',
    nextAction: 'Check the account snapshot, or keep going on your current module.',
    summary:
      'Your account is approved, so progress records, import/merge, and assessment records are available. Synchronization stays manual.',
  },
  rejected: {
    label: 'Not approved',
    tone: 'danger',
    nextAction: 'Continue with guest learning — every learning surface is still open.',
    summary: 'This access request was not approved. Public and guest learning is unaffected.',
  },
  suspended: {
    label: 'Suspended',
    tone: 'danger',
    nextAction: 'Continue with guest learning — every learning surface is still open.',
    summary: 'This account is suspended, so account-backed features are unavailable. Guest learning is unaffected.',
  },
  owner: {
    label: 'Owner',
    tone: 'owner',
    nextAction: 'Review pending requests and platform policy in the owner console.',
    summary: 'This account is on the server-controlled owner allowlist and can manage enrollment.',
  },
}

/* ------------------------------------------------------------------ *
 * Data provenance
 * ------------------------------------------------------------------ */

/**
 * How a given number or record reached the screen. Used by the `Local` / `Derived` / `Imported` /
 * `Account` chips so nothing browser-side is ever read as server-confirmed.
 */
export type Provenance = 'local' | 'derived' | 'server' | 'imported'

export const PROVENANCE_META: Record<Provenance, { label: string; tone: StateTone; note: string }> = {
  local: {
    label: 'Local',
    tone: 'guest',
    note: 'Recorded in this browser only. Not confirmed by the platform.',
  },
  derived: {
    label: 'Derived',
    tone: 'neutral',
    note: 'Calculated in the browser from local records and shipped content.',
  },
  server: {
    label: 'Account',
    tone: 'active',
    note: 'Held on the platform for your account.',
  },
  imported: {
    label: 'Imported',
    tone: 'pending',
    note: 'Transferred from another device. Not verified, and it never awards XP or a certificate.',
  },
}

/* ------------------------------------------------------------------ *
 * Reusable copy
 * ------------------------------------------------------------------ */

export const ACCOUNT_SYNC_NOTE =
  'Synchronization is manual. SecCraft never uploads your progress on its own, and it never restores it on another device automatically — export a file here and import it there.'

export const CROSS_DEVICE_NOTE =
  'Moving to another device is a deliberate two-step: export the progress file here, then import it there. Imported records stay unverified.'

export const NO_VERIFICATION_CLAIM =
  'Assessment answers are recorded as a digest only. No server rubric grades them, so no score here is a verified result.'

export const GUEST_LEARNING_NOTE =
  'Guest learning is a complete experience, not a trial. Nothing below is removed by not having an account.'
