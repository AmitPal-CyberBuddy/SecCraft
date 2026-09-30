import { BarChart, BarChart3, BookOpen, FileText, Flame, FlaskConical, GraduationCap, LayoutDashboard, Map, Settings, Shield, Swords, Target, Terminal, Trophy, UserRound, CloudUpload, LogOut, Sparkles, type LucideIcon } from 'lucide-react'
import { TOTAL_CHALLENGES, TOTAL_LEARNING_PATHS, TOTAL_MODULES, TOTAL_PCAPS, AVAILABLE_LEARNING_PATHS } from '@/content/stats'
import type { UserState } from '@/lib/access'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  /** Counts shown in the trailing badge. Always derived from shipped content. */
  badge?: string
  desc: string
}

export interface NavSection {
  key: string
  label?: string
  icon?: LucideIcon
  items: NavItem[]
}

/**
 * The learner navigation.
 *
 * It is identical for every user state by design: the product does not remove learning surfaces to
 * push registration. What changes is the account group at the bottom, which is built separately in
 * `accountSections` below.
 */
export function buildLearnerSections(): NavSection[] {
  return [
    {
      key: 'home',
      label: 'Home',
      items: [
        {
          to: '/app',
          icon: LayoutDashboard,
          label: 'Dashboard',
          desc: 'What to do next, from your current position',
        },
      ],
    },
    {
      key: 'learn',
      label: 'Learn',
      icon: GraduationCap,
      items: [
        {
          to: '/paths',
          icon: Map,
          label: 'Learning Paths',
          badge: `${TOTAL_LEARNING_PATHS}`,
          desc: `${AVAILABLE_LEARNING_PATHS} available • ${TOTAL_LEARNING_PATHS} total`,
        },
        {
          to: '/modules',
          icon: BookOpen,
          label: 'Modules',
          badge: `${TOTAL_MODULES}`,
          desc: `Path-aware • ${TOTAL_MODULES} total`,
        },
      ],
    },
    {
      key: 'practice',
      label: 'Practice',
      icon: FlaskConical,
      items: [
        {
          to: '/labs',
          icon: FlaskConical,
          label: 'Labs',
          badge: `${TOTAL_PCAPS}`,
          desc: `Artifacts • ${TOTAL_PCAPS} supplied`,
        },
        {
          to: '/challenges',
          icon: Swords,
          label: 'Challenges',
          badge: `${TOTAL_CHALLENGES}`,
          desc: 'Guided → Assessment',
        },
      ],
    },
    {
      key: 'track',
      label: 'Work & progress',
      icon: BarChart3,
      items: [
        { to: '/daily', icon: Flame, label: 'Daily Practice', desc: 'Optional local practice' },
        { to: '/achievements', icon: Trophy, label: 'Achievements', desc: 'Local practice milestones' },
        { to: '/progress', icon: BarChart, label: 'Analytics', desc: 'Progress • insights • path-aware' },
        { to: '/reports', icon: FileText, label: 'Findings & reports', desc: 'Evidence-led writing practice' },
      ],
    },
    {
      key: 'assess',
      label: 'Assess',
      icon: Target,
      items: [{ to: '/engagement', icon: Target, label: 'Engagements', badge: 'ENG-01', desc: 'Authorised assessment mode' }],
    },
    {
      key: 'reference',
      label: 'Reference',
      icon: Terminal,
      items: [{ to: '/reference', icon: Terminal, label: 'Reference', desc: 'Commands, filters, checklist' }],
    },
  ]
}

export interface AccountNavItem extends NavItem {
  /** Rendered as a trailing state marker. */
  state?: UserState
}

export interface AccountNavAction {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  tone: 'default' | 'primary'
}

/**
 * The account group. Kept out of `buildLearnerSections` on purpose: account management is never
 * interleaved with learning destinations, and the owner console gets its own separated block.
 */
export function buildAccountSections(state: UserState): AccountNavSection[] {
  const sections: AccountNavSection[] = [
    {
      key: 'account',
      label: state === 'guest' || state === 'public' ? 'You' : 'Account',
      icon: UserRound,
      items: [
        { to: '/profile', icon: UserRound, label: 'Profile', desc: 'Identity, state, sync summary' },
        { to: '/sync', icon: CloudUpload, label: 'Progress sync', desc: 'Import, export, merge' },
        { to: '/settings', icon: Settings, label: 'Settings', desc: 'Appearance, accessibility, data' },
      ],
    },
  ]

  if (state !== 'guest' && state !== 'public') {
    sections.push({
      key: 'identity',
      label: 'This account',
      icon: Shield,
      items: [
        { to: '/account', icon: Shield, label: 'Account status', state, desc: 'Verification, approval, recovery' },
      ],
    })
  }

  return sections
}

export interface AccountNavSection {
  key: string
  label: string
  icon: LucideIcon
  items: AccountNavItem[]
}

/** Owner controls are separated from every learner destination, in their own block. */
export function buildOwnerSection(): AccountNavSection[] {
  return [
    {
      key: 'owner',
      label: 'Owner',
      icon: Sparkles,
      items: [{ to: '/admin', icon: Sparkles, label: 'Owner console', desc: 'Approvals, capacity, audit' }],
    },
  ]
}

export const SIGN_OUT_ACTION: AccountNavAction = {
  key: 'sign-out',
  label: 'Sign out',
  icon: LogOut,
  onSelect: () => {},
  tone: 'default',
}
