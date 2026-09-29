/**
 * Platform-level generic content model — domain-agnostic core
 * Wireless terminology and tooling belong inside wireless-pentesting path
 */

export interface LearningPathPhase {
  id: number
  name: string
  desc: string
  color: string
  modules: string[]
}

export interface LearningPath {
  id: string
  title: string
  shortTitle: string
  description: string
  longDescription: string
  category: 'network-security' | 'web-security' | 'api-security' | 'mobile-security' | 'cloud-security' | 'ad-security' | 'ai-security'
  icon: string
  color: string
  gradient?: string
  border?: string
  text?: string
  difficulty: string
  estimatedHours: number
  prerequisites: string[]
  status: 'available' | 'coming-soon' | 'planned'
  featured: boolean
  modules: string[]
  phases: LearningPathPhase[]
  skills: string[]
  labs: number
  challenges: number
  scenarios?: number
  pcaps?: number
  certificate: boolean
  tagline?: string
  legacyBrand?: string
  legacyFlagPrefix?: string
}

export interface ModuleLessonRef {
  id: string
  title: string
  kind: 'concept' | 'lab' | 'professional'
}

export interface Module {
  id: string
  learningPathId: string
  title: string
  phase: number
  phaseName: string
  difficulty: string
  estimated_hours: number
  prerequisites: string[]
  lab_requirement: 'SIMULATION' | 'HYBRID' | 'REAL' | 'RF_REQUIRED'
  content_status: 'authored' | 'brief' | 'planned'
  skills: string[]
  description: string
  objectives?: string[]
  artifacts?: string[]
  decision_practice?: string[]
  evidence_focus?: string
  retest_focus?: string
  lessons: ModuleLessonRef[]
  status: 'simulated' | 'hardware' | 'locked'
}

export interface LabEntry {
  id: string
  learningPathId: string
  module: string
  title: string
  type: string
  status: string
  difficulty: string
  pcap: string | null
  color: string
  description: string
  artifactType?: 'pcap' | 'config' | 'http' | 'apk' | 'log' | 'iam' | 'terraform'
}

export interface ChallengeTask {
  id: string
  question: string
  answer: string
  hint: string
}

export interface Challenge {
  id: string
  learningPathId: string
  module: string
  title: string
  difficulty: string
  type: string
  level: 'guided' | 'semi-guided' | 'assessment'
  estimated_time: string
  points: number
  status: string
  description: string
  objectives: string[]
  artifacts: string[]
  tasks: ChallengeTask[]
  flag: string
  skills: string[]
}

export interface Skill {
  id: string
  name: string
  category: 'generic' | 'wireless' | 'web' | 'api' | 'android' | 'network' | 'ad' | 'cloud' | 'ai'
  description: string
  icon?: string
  level?: string
}

export interface PlatformConfig {
  name: string
  fullName: string
  shortName: string
  legacyName: string
  tagline: string
  secondaryTagline: string
  description: string
  philosophy: string
  philosophyShort: string
  contentVersion: string
  version: string
}

export const LAB_REQUIREMENT_MAP: Record<string, 'SIMULATION' | 'HYBRID' | 'REAL'> = {
  SIMULATION: 'SIMULATION',
  HYBRID: 'HYBRID',
  RF_REQUIRED: 'REAL',
  REAL: 'REAL',
}

export function normalizeLabRequirement(req: string): 'SIMULATION' | 'HYBRID' | 'REAL' {
  return LAB_REQUIREMENT_MAP[req] || 'SIMULATION'
}
