import modules from '@/content/modules.json'
import challenges from '@/content/challenges.json'
import scenarios from '@/content/scenarios.json'
import artifacts from '@/content/lab-artifacts.json'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import learningPaths from '@/content/learning-paths.json'
import { LABS } from '@/content/labs'

/**
 * Content totals, derived from the shipped content files — never typed by hand.
 *
 * Every UI count (progress denominators, footer summaries, module cards) uses these values, so a
 * number on screen can only be wrong if the content itself changed. Nothing here is invented: if a
 * file is missing, the count is 0 and the UI shows the corresponding empty state.
 *
 * Now path-aware: platform totals + per-path totals.
 */

const moduleList = modules as Array<{ id: string; lessons?: unknown[]; learningPathId?: string }>
const challengeList = challenges as Array<{ learningPathId?: string }>
const scenarioList = scenarios as Array<{ learningPathId?: string }>
const artifactMap = (artifacts as { artifacts: Record<string, unknown> }).artifacts ?? {}
const pathList = learningPaths as Array<{ id: string; modules: string[]; status: string }>

export const TOTAL_MODULES = moduleList.length
export const TOTAL_LESSONS = moduleList.reduce((n, m) => n + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0)
export const TOTAL_CHALLENGES = challengeList.length
export const TOTAL_SCENARIOS = scenarioList.length
export const TOTAL_PCAPS = Object.keys(artifactMap).length
export const TOTAL_COMMANDS = (commands as unknown[]).length
export const TOTAL_FILTERS = (filters as unknown[]).length
export const TOTAL_LEARNING_PATHS = pathList.length
export const AVAILABLE_LEARNING_PATHS = pathList.filter(p => p.status === 'available').length

/** Labs shipped in content/labs.ts (capture-based and config-based). */
export const TOTAL_LABS = LABS.length

/** Labs that are driven by a capture in frontend/public/pcaps. */
export const TOTAL_CAPTURE_LABS = LABS.filter(l => l.pcap).length

/** Modules that have at least one lesson file registered in modules.json. */
export const MODULES_WITH_CONTENT = moduleList.filter(m => Array.isArray(m.lessons) && m.lessons.length > 0).length

// Path-aware helpers
export function getModulesForPath(pathId: string) {
  return moduleList.filter(m => (m as any).learningPathId === pathId)
}

export function getLabsForPath(pathId: string) {
  return LABS.filter(l => (l as any).learningPathId === pathId)
}

export function getChallengesForPath(pathId: string) {
  return challengeList.filter(c => (c as any).learningPathId === pathId)
}

export function getScenariosForPath(pathId: string) {
  return scenarioList.filter(s => (s as any).learningPathId === pathId)
}

export function getStatsForPath(pathId: string) {
  const mods = getModulesForPath(pathId)
  const labs = getLabsForPath(pathId)
  const chals = getChallengesForPath(pathId)
  const scens = getScenariosForPath(pathId)
  return {
    pathId,
    modules: mods.length,
    lessons: mods.reduce((n, m) => n + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0),
    labs: labs.length,
    captureLabs: labs.filter(l => l.pcap).length,
    challenges: chals.length,
    scenarios: scens.length,
  }
}

export const PLATFORM_STATS = {
  learningPaths: TOTAL_LEARNING_PATHS,
  availablePaths: AVAILABLE_LEARNING_PATHS,
  modules: TOTAL_MODULES,
  lessons: TOTAL_LESSONS,
  labs: TOTAL_LABS,
  captureLabs: TOTAL_CAPTURE_LABS,
  challenges: TOTAL_CHALLENGES,
  scenarios: TOTAL_SCENARIOS,
  pcaps: TOTAL_PCAPS,
}
