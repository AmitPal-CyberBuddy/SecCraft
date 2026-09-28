import modules from '@/content/modules.json'
import challenges from '@/content/challenges.json'
import scenarios from '@/content/scenarios.json'
import artifacts from '@/content/lab-artifacts.json'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import { LABS } from '@/content/labs'

/**
 * Content totals, derived from the shipped content files — never typed by hand.
 *
 * Every UI count (progress denominators, footer summaries, module cards) uses these values, so a
 * number on screen can only be wrong if the content itself changed. Nothing here is invented: if a
 * file is missing, the count is 0 and the UI shows the corresponding empty state.
 */

const moduleList = modules as Array<{ id: string; lessons?: unknown[] }>

const challengeList = challenges as unknown[]
const scenarioList = scenarios as unknown[]
const artifactMap = (artifacts as { artifacts: Record<string, unknown> }).artifacts ?? {}

export const TOTAL_MODULES = moduleList.length
export const TOTAL_LESSONS = moduleList.reduce((n, m) => n + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0)
export const TOTAL_CHALLENGES = challengeList.length
export const TOTAL_SCENARIOS = scenarioList.length
export const TOTAL_PCAPS = Object.keys(artifactMap).length
export const TOTAL_COMMANDS = (commands as unknown[]).length
export const TOTAL_FILTERS = (filters as unknown[]).length

/** Labs shipped in content/labs.ts (capture-based and config-based). */
export const TOTAL_LABS = LABS.length

/** Labs that are driven by a capture in frontend/public/pcaps. */
export const TOTAL_CAPTURE_LABS = LABS.filter(l => l.pcap).length

/** Modules that have at least one lesson file registered in modules.json. */
export const MODULES_WITH_CONTENT = moduleList.filter(m => Array.isArray(m.lessons) && m.lessons.length > 0).length
