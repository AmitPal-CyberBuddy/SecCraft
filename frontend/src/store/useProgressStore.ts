import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS_DEF as ACHIEVEMENT_DEFS, ACHIEVEMENT_POINTS } from '@/content/achievements'
import { TOTAL_CHALLENGES, TOTAL_CHALLENGE_POINTS, TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES } from '@/content/stats'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import { AVAILABLE_LABS, LABS } from '@/content/labs'
import { quizData } from '@/content/quizData'
import challenges from '@/content/challenges.json'
import { currentModuleId, LEGACY_MODULE_MAP } from '@/content/legacy-module-map'

interface LessonProgress {
  moduleId: string
  lessonId: string
  completed: boolean
  completedAt?: string
  points: number
}

interface LabProgress {
  moduleId: string
  labId: string
  completed: boolean
  score?: number
  points: number
  completedAt?: string
}

interface ChallengeProgress {
  challengeId: string
  moduleId: string
  points: number
  completedAt: string
}

interface QuizProgress {
  moduleId: string
  quizId: string
  score: number
  total: number
  completed: boolean
  points: number
  completedAt?: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
  points: number
}

export interface Level {
  level: number
  title: string
  minXp: number
  maxXp: number
  color: string
  icon: string
  description?: string
}

export const POINTS = {
  LESSON: 10,
  LAB: 25,
  QUIZ: 20,
  QUIZ_PERFECT_BONUS: 10,
}


/**
 * XP ceiling for this build, derived from the shipped content and the point values above:
 * every authored lesson, only the three currently machine-validated labs, each local challenge,
 * one quiz per authored module (perfect-score bonus included), and every achievement. Progress percentages and certificate thresholds divide by this — never by a number
 * typed into a component.
 */
const ANSWER_CHECKED_LABS = AVAILABLE_LABS.filter(lab => lab.grading === 'answer-checked').length
export const MAX_XP =
  TOTAL_LESSONS * POINTS.LESSON +
  ANSWER_CHECKED_LABS * POINTS.LAB +
  TOTAL_CHALLENGE_POINTS +
  Object.keys(quizData).length * (POINTS.QUIZ + POINTS.QUIZ_PERFECT_BONUS) +
  ACHIEVEMENT_POINTS

/** A printable local learning record unlocks only when all path and platform activities are recorded. */
export const CERT_PROGRESS_THRESHOLD = 100

const OBSOLETE_ACHIEVEMENTS = new Set(['module_complete', 'three_modules', 'ten_modules', 'all_modules', 'first_quiz', 'five_quizzes', 'perfect_quiz'])

/** Normalize pre-v5 local records so duplicated/obsolete credit cannot inflate progress or XP. */
function normalizePersistedProgress(source: any, discardLegacyLabScores = false, retirePreviousFinalQuiz = false) {
  const input = source && typeof source === 'object' ? source : {}
  const unique = <T,>(items: T[], keyOf: (item: T) => string, scoreOf?: (item: T) => number) => {
    const byKey = new Map<string, T>()
    for (const item of items) {
      const key = keyOf(item)
      const current = byKey.get(key)
      if (!current || (scoreOf && scoreOf(item) > scoreOf(current))) byKey.set(key, item)
    }
    return [...byKey.values()]
  }
  const completedLessons = unique(
    (Array.isArray(input.completedLessons) ? input.completedLessons : []).map((item: any) =>
      item && typeof item === 'object' ? { ...item, moduleId: currentModuleId(item.moduleId) } : item).filter((item: any) =>
      item && typeof item === 'object' && (modules as any[]).some(m => m.id === item.moduleId && m.lessons?.some((lesson: any) => lesson.id === item.lessonId))),
    (item: any) => `${item.moduleId}:${item.lessonId}`,
  ).map((item: any) => ({ ...item, completed: true, points: POINTS.LESSON }))
  const completedLabs = unique(
    (Array.isArray(input.completedLabs) ? input.completedLabs : []).map((item: any) =>
      item && typeof item === 'object' ? { ...item, moduleId: currentModuleId(item.moduleId) } : item).filter((item: any) =>
      item && typeof item === 'object' && AVAILABLE_LABS.some(lab => lab.id === item.labId && lab.module === item.moduleId)),
    (item: any) => `${item.moduleId}:${item.labId}`,
  ).map((item: any) => {
    const lab = AVAILABLE_LABS.find(entry => entry.id === item.labId && entry.module === item.moduleId)
    const score = discardLegacyLabScores ? undefined : item.score
    const points = lab?.grading === 'answer-checked' && score === 100 ? POINTS.LAB : 0
    return { ...item, completed: true, score, points }
  })
  const quizCandidates = (Array.isArray(input.quizScores) ? input.quizScores : []).filter((item: any) =>
    item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(quizData, item.moduleId) && !(retirePreviousFinalQuiz && item.moduleId === '20-final-assessment') && item.quizId === 'quiz-01' && item.total === quizData[item.moduleId].length && Number.isFinite(item.score) && Number.isFinite(item.total) && item.total > 0 && item.score / item.total >= 0.8)
  const quizScores = unique(quizCandidates, (item: any) => `${item.moduleId}:${item.quizId}`, (item: any) => item.score / item.total)
    .map((item: any) => {
      const score = Math.min(Math.floor(item.score), Math.floor(item.total))
      const total = Math.max(1, Math.floor(item.total))
      const points = POINTS.QUIZ + (score === total ? POINTS.QUIZ_PERFECT_BONUS : 0)
      return { ...item, score, total, completed: true, points }
    }).filter((item: any) => item.score / item.total >= 0.8)
  const challengeById = new Map((challenges as Array<{ id: string; module: string; points: number }>).map(item => [item.id, item]))
  const completedChallenges = unique(
    (Array.isArray(input.completedChallenges) ? input.completedChallenges : []).map((item: any) =>
      item && typeof item === 'object' ? { ...item, moduleId: currentModuleId(item.moduleId) } : item).filter((item: any) =>
      item && typeof item === 'object' && challengeById.get(item.challengeId)?.module === item.moduleId),
    (item: any) => item.challengeId,
  ).map((item: any) => ({ ...item, points: challengeById.get(item.challengeId)!.points }))
  const achievementById = new Map((ACHIEVEMENTS_DEF as Achievement[]).map(item => [item.id, item]))
  const achievements = unique(
    (Array.isArray(input.achievements) ? input.achievements : []).filter((item: any) => item && typeof item === 'object' && achievementById.has(item.id) && !OBSOLETE_ACHIEVEMENTS.has(item.id)),
    (item: any) => item.id,
  ).map((item: any) => ({ ...achievementById.get(item.id)!, unlockedAt: item.unlockedAt }))
  // Old module-specific quiz scores cannot pass a new/merged module quiz by proxy. Keep
  // their original result as local history without converting it to current XP or mastery.
  // The retired reporting lesson is likewise kept as historical completion, not capstone credit.
  const retiredRecords = unique([
    ...(Array.isArray(input.retiredRecords) ? input.retiredRecords : []),
    ...(Array.isArray(input.quizScores) ? input.quizScores : [])
      .filter((item: any) => item && (Object.prototype.hasOwnProperty.call(LEGACY_MODULE_MAP, item.moduleId) || (retirePreviousFinalQuiz && item.moduleId === '20-final-assessment')) && item.quizId === 'quiz-01')
      .map((item: any) => ({ type: 'quiz', moduleId: item.moduleId, activityId: item.quizId,
        score: item.score, total: item.total, completedAt: item.completedAt })),
    ...(Array.isArray(input.completedLessons) ? input.completedLessons : [])
      .filter((item: any) => (item?.moduleId === '19-methodology' && item.lessonId === '02-evidence-severity-reporting') ||
        (retirePreviousFinalQuiz && item?.moduleId === '20-final-assessment' && item.lessonId === '01-final-engagement'))
      .map((item: any) => ({ type: 'lesson', moduleId: item.moduleId, activityId: item.lessonId,
        completedAt: item.completedAt })),
  ], (item: any) => `${item.type}:${item.moduleId}:${item.activityId}`)
  const totalXp = completedLessons.reduce((sum: number, item: any) => sum + item.points, 0)
    + completedLabs.reduce((sum: number, item: any) => sum + item.points, 0)
    + quizScores.reduce((sum: number, item: any) => sum + item.points, 0)
    + completedChallenges.reduce((sum: number, item: any) => sum + item.points, 0)
    + achievements.reduce((sum: number, item: any) => sum + item.points, 0)
  // Empty legacy installs had an implicit Wireless default, not a learner choice.
  const hasHistory = completedLessons.length + completedLabs.length + quizScores.length + completedChallenges.length + retiredRecords.length > 0
  const candidate = learningPaths.find(path => path.id === input.currentLearningPathId && path.status === 'available')
  const remembered = candidate && (input.pathChosen === true || hasHistory || candidate.id !== 'wireless-pentesting' || (input.currentModule && input.currentModule !== '01-intro-wireless')) ? candidate : null
  const ownedModule = remembered && (remembered.modules as string[]).includes(currentModuleId(input.currentModule)) ? currentModuleId(input.currentModule) : null
  return {
    ...input,
    currentLearningPathId: remembered?.id ?? null,
    currentModule: ownedModule,
    pathChosen: Boolean(remembered),
    completedLessons, completedLabs, quizScores, completedChallenges, retiredRecords, achievements,
    totalXp, streak: 0, lastEarnedPoints: null,
  }
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Initiate', minXp: 0, maxXp: 99, color: 'slate', icon: '🌱', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 2, title: 'Scout', minXp: 100, maxXp: 299, color: 'cyan', icon: '🔍', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 3, title: 'Analyst', minXp: 300, maxXp: 599, color: 'emerald', icon: '📡', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 4, title: 'Operator', minXp: 600, maxXp: 999, color: 'violet', icon: '⚡', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 5, title: 'Specialist', minXp: 1000, maxXp: 1499, color: 'amber', icon: '🛡️', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 6, title: 'Expert', minXp: 1500, maxXp: 1999, color: 'pink', icon: '🎯', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 7, title: 'Master', minXp: 2000, maxXp: 2449, color: 'cyan', icon: '👑', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
  { level: 8, title: 'Forge Master', minXp: Math.round(MAX_XP * 0.75), maxXp: 999999, color: 'amber', icon: '🔥', description: 'Local XP tier based on recorded activity only; it is not a validated skill grade.' },
]


export const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlockedAt'>[] = ACHIEVEMENT_DEFS


interface ProgressState {
  overallProgress: number
  completedLessons: LessonProgress[]
  completedLabs: LabProgress[]
  completedChallenges: ChallengeProgress[]
  quizScores: QuizProgress[]
  retiredRecords: Array<{ type: string; moduleId: string; activityId: string; score?: number; total?: number; completedAt?: string }>
  currentModule: string | null
  currentLearningPathId: string | null
  pathChosen: boolean
  streak: number
  lastActive: string | null
  totalXp: number
  achievements: Achievement[]
  lastEarnedPoints: { amount: number; reason: string; at: string } | null

  // actions
  completeLesson: (moduleId: string, lessonId: string) => { points: number; isNew: boolean }
  completeLab: (moduleId: string, labId: string, score?: number) => { points: number; isNew: boolean }
  completeQuiz: (moduleId: string, quizId: string, score: number, total: number) => { points: number; isNew: boolean }
  completeChallenge: (challengeId: string) => { points: number; isNew: boolean }
  setCurrentModule: (id: string) => void
  setCurrentLearningPath: (id: string) => void
  getModuleProgress: (moduleId: string) => number
  getPathProgress: (pathId: string) => number
  getOverallProgress: () => number
  isLessonCompleted: (moduleId: string, lessonId: string) => boolean
  resetProgress: () => void
  getTotalXp: () => number
  getLevel: () => Level
  getStreak: () => number
  getXpToNextLevel: () => { current: number; needed: number; nextLevel: Level | null; percent: number }
  getAchievements: () => Achievement[]
  getUnlockedAchievements: () => Achievement[]
  checkAndUnlockAchievements: () => Achievement[] // returns newly unlocked
  clearLastEarnedPoints: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      overallProgress: 0,
      completedLessons: [],
      completedLabs: [],
      completedChallenges: [],
      quizScores: [],
      retiredRecords: [],
      currentModule: null,
      currentLearningPathId: null,
      pathChosen: false,
      streak: 0,
      lastActive: new Date().toISOString(),
      totalXp: 0,
      achievements: [],
      lastEarnedPoints: null,

      completeLesson: (moduleId, lessonId) => {
        const exists = get().completedLessons.find(l => l.moduleId === moduleId && l.lessonId === lessonId)
        if (exists) return { points: 0, isNew: false }
        const points = POINTS.LESSON
        set(state => {
          return {
            completedLessons: [...state.completedLessons, { moduleId, lessonId, completed: true, completedAt: new Date().toISOString(), points }],
            lastActive: new Date().toISOString(),
            totalXp: state.totalXp + points,
            lastEarnedPoints: { amount: points, reason: `Lesson: ${lessonId}`, at: new Date().toISOString() },
          }
        })
        // Check achievements after
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points, isNew: true }
      },

      completeLab: (moduleId, labId, score) => {
        const exists = get().completedLabs.find(l => l.moduleId === moduleId && l.labId === labId)
        const lab = LABS.find(item => item.id === labId && item.module === moduleId)
        const points = lab?.grading === 'answer-checked' && score === 100 ? POINTS.LAB : 0
        if (exists) {
          if (points > 0 && exists.score !== 100) {
            set(state => ({
              completedLabs: state.completedLabs.map(item => item.moduleId === moduleId && item.labId === labId ? { ...item, score: 100, points, completedAt: new Date().toISOString() } : item),
              totalXp: state.totalXp + points,
              lastEarnedPoints: { amount: points, reason: `Verified lab: ${labId}`, at: new Date().toISOString() },
            }))
            return { points, isNew: false }
          }
          return { points: 0, isNew: false }
        }
        set(state => ({
          completedLabs: [...state.completedLabs, { moduleId, labId, completed: true, score, points, completedAt: new Date().toISOString() }],
          lastActive: new Date().toISOString(),
          totalXp: state.totalXp + points,
          lastEarnedPoints: points > 0 ? { amount: points, reason: `Verified lab: ${labId}`, at: new Date().toISOString() } : state.lastEarnedPoints,
        }))
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points, isNew: true }
      },

      completeQuiz: (moduleId, quizId, score, total) => {
        if (total <= 0) return { points: 0, isNew: false }
        const normalizedScore = Math.max(0, Math.min(Math.floor(score), Math.floor(total)))
        const existing = get().quizScores.find(q => q.moduleId === moduleId && q.quizId === quizId)
        const passes = normalizedScore / total >= 0.8
        // Failed attempts are practice, not completed quizzes and do not earn XP.
        if (!passes) return { points: 0, isNew: false }
        if (existing && existing.score >= normalizedScore) return { points: 0, isNew: false }
        const points = POINTS.QUIZ + (normalizedScore === total ? POINTS.QUIZ_PERFECT_BONUS : 0)
        const xpToAdd = existing ? Math.max(0, points - existing.points) : points
        set(state => {
          const filtered = state.quizScores.filter(q => !(q.moduleId === moduleId && q.quizId === quizId))
          return {
            quizScores: [...filtered, { moduleId, quizId, score: normalizedScore, total, completed: true, points, completedAt: new Date().toISOString() }],
            lastActive: new Date().toISOString(),
            totalXp: state.totalXp + xpToAdd,
            lastEarnedPoints: xpToAdd > 0 ? { amount: xpToAdd, reason: `Quiz passed: ${normalizedScore}/${total}${normalizedScore === total ? ' Perfect!' : ''}`, at: new Date().toISOString() } : state.lastEarnedPoints,
          }
        })
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points: xpToAdd, isNew: !existing }
      },

      completeChallenge: (challengeId) => {
        const challenge = (challenges as Array<{ id: string; module: string; points: number; title?: string }>).find(c => c.id === challengeId)
        if (!challenge) return { points: 0, isNew: false }
        if (get().completedChallenges.some(c => c.challengeId === challengeId)) return { points: 0, isNew: false }
        const points = Math.max(0, Math.floor(challenge.points))
        set(state => ({
          completedChallenges: [...state.completedChallenges, { challengeId, moduleId: challenge.module, points, completedAt: new Date().toISOString() }],
          totalXp: state.totalXp + points,
          lastActive: new Date().toISOString(),
          lastEarnedPoints: { amount: points, reason: `Challenge checkpoint: ${challenge.title || challengeId}`, at: new Date().toISOString() },
        }))
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points, isNew: true }
      },

      setCurrentModule: (id) => {
        const module = modules.find(item => item.id === id)
        if (module) set({ currentModule: id, currentLearningPathId: module.learningPathId, pathChosen: true })
      },
      setCurrentLearningPath: (id) => {
        const path = learningPaths.find(item => item.id === id && item.status === 'available' && item.modules.length)
        if (path) set({ currentLearningPathId: id, pathChosen: true, currentModule: (path.modules as string[]).includes(get().currentModule ?? '') ? get().currentModule : null })
      },

      getPathProgress: (pathId) => {
        const state = get()
        // modules in path
        const pathModules = (modules as Array<{ id: string; learningPathId?: string }>).filter(m => m.learningPathId === pathId)
        if (pathModules.length === 0) return 0
        const progresses = pathModules.map(m => {
          const lessonsDone = state.completedLessons.filter(l => l.moduleId === m.id).length
          const labsDone = state.completedLabs.filter(l => l.moduleId === m.id && AVAILABLE_LABS.some(item => item.id === l.labId && item.module === l.moduleId)).length
          const quizDone = state.quizScores.filter(q => q.moduleId === m.id && q.completed).length
          const meta = (modules as Array<{ id: string; lessons?: unknown[] }>).find(mm => mm.id === m.id)
          const lessonTotal = Math.max(1, Array.isArray(meta?.lessons) ? meta!.lessons!.length : 1)
          const hasLabs = AVAILABLE_LABS.some(lab => lab.module === m.id)
          const hasQuiz = Object.prototype.hasOwnProperty.call(quizData, m.id)
          const weights = { lessons: 60, labs: hasLabs ? 25 : 0, quiz: hasQuiz ? 15 : 0 }
          const weightTotal = weights.lessons + weights.labs + weights.quiz
          const lessonProgress = Math.min(lessonsDone / lessonTotal, 1) * weights.lessons
          const labProgress = hasLabs ? Math.min(labsDone / AVAILABLE_LABS.filter(lab => lab.module === m.id).length, 1) * weights.labs : 0
          const quizProgress = hasQuiz ? Math.min(quizDone, 1) * weights.quiz : 0
          return Math.round((lessonProgress + labProgress + quizProgress) / weightTotal * 100)
        })
        const avg = progresses.reduce((a, b) => a + b, 0) / progresses.length
        return Number.isFinite(avg) ? Math.round(avg) : 0
      },

      /**
       * Consecutive days with at least one recorded completion, counted back from today (a streak
       * that ended yesterday is still shown as alive until the day is over).
       */
      getStreak: () => {
        const state = get()
        const days = new Set<string>()
        const add = (at?: string) => {
          if (!at) return
          const d = new Date(at)
          if (!Number.isNaN(d.getTime())) days.add(d.toDateString())
        }
        state.completedLessons.forEach(l => add(l.completedAt))
        state.completedLabs.forEach(l => add(l.completedAt))
        state.quizScores.forEach(q => add(q.completedAt))
        state.completedChallenges.forEach(c => add(c.completedAt))

        if (days.size === 0) return 0
        const dayMs = 86400000
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let cursor = new Date(today)
        if (!days.has(cursor.toDateString())) {
          cursor = new Date(today.getTime() - dayMs)
          if (!days.has(cursor.toDateString())) return 0
        }
        let streak = 0
        while (days.has(cursor.toDateString())) {
          streak++
          cursor = new Date(cursor.getTime() - dayMs)
        }
        return streak
      },

      getModuleProgress: (moduleId) => {
        const state = get()
        const lessonsDone = state.completedLessons.filter(l => l.moduleId === moduleId).length
        const labsDone = state.completedLabs.filter(l => l.moduleId === moduleId && AVAILABLE_LABS.some(item => item.id === l.labId && item.module === l.moduleId)).length
        const quizDone = state.quizScores.filter(q => q.moduleId === moduleId && q.completed).length

        // Denominators come from the content itself: lessons from modules.json, labs from the single
        // catalogue in content/labs.ts (the same list the Labs page renders).
        const meta = (modules as Array<{ id: string; lessons?: unknown[] }>).find(m => m.id === moduleId)
        const lessonTotal = Math.max(1, Array.isArray(meta?.lessons) ? meta!.lessons!.length : 1)
        const hasLabs = AVAILABLE_LABS.some(lab => lab.module === moduleId)
        const hasQuiz = Object.prototype.hasOwnProperty.call(quizData, moduleId)
        const weights = { lessons: 60, labs: hasLabs ? 25 : 0, quiz: hasQuiz ? 15 : 0 }
        const weightTotal = weights.lessons + weights.labs + weights.quiz
        const lessonProgress = Math.min(lessonsDone / lessonTotal, 1) * weights.lessons
        const labProgress = hasLabs ? Math.min(labsDone / AVAILABLE_LABS.filter(lab => lab.module === moduleId).length, 1) * weights.labs : 0
        const quizProgress = hasQuiz ? Math.min(quizDone, 1) * weights.quiz : 0

        return weightTotal > 0 ? Math.round((lessonProgress + labProgress + quizProgress) / weightTotal * 100) : 0
      },

      getOverallProgress: () => {
        const state = get()
        const totalItems = TOTAL_LESSONS + TOTAL_LABS + Object.keys(quizData).length + TOTAL_CHALLENGES
        if (totalItems <= 0) return 0
        const validLabReviews = state.completedLabs.filter(l => AVAILABLE_LABS.some(item => item.id === l.labId && item.module === l.moduleId)).length
        const completed = state.completedLessons.length + validLabReviews + state.quizScores.filter(q => q.completed).length + state.completedChallenges.length
        return Math.round(Math.min(completed / totalItems, 1) * 100)
      },

      isLessonCompleted: (moduleId, lessonId) => {
        return get().completedLessons.some(l => l.moduleId === moduleId && l.lessonId === lessonId)
      },

      getTotalXp: () => {
        const state = get()
        // Recalculate to be safe
        const lessonXp = state.completedLessons.reduce((s, l) => s + (l.points ?? POINTS.LESSON), 0)
        const labXp = state.completedLabs.reduce((s, l) => {
          const lab = LABS.find(item => item.id === l.labId && item.module === l.moduleId)
          return s + (lab?.grading === 'answer-checked' && l.score === 100 ? POINTS.LAB : 0)
        }, 0)
        const quizXp = state.quizScores.reduce((s, q) => s + (q.points ?? POINTS.QUIZ), 0)
        const challengeXp = state.completedChallenges.reduce((s, c) => s + c.points, 0)
        const achievementXp = state.achievements.reduce((s, a) => s + a.points, 0)
        return lessonXp + labXp + quizXp + challengeXp + achievementXp
      },

      getLevel: () => {
        const xp = get().getTotalXp()
        return LEVELS.slice().reverse().find(l => xp >= l.minXp) || LEVELS[0]
      },

      getXpToNextLevel: () => {
        const xp = get().getTotalXp()
        const currentLevel = get().getLevel()
        const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || null
        if (!nextLevel) {
          return { current: xp, needed: 0, nextLevel: null, percent: 100 }
        }
        const needed = nextLevel.minXp - xp
        const range = nextLevel.minXp - currentLevel.minXp
        const progressInLevel = xp - currentLevel.minXp
        const percent = Math.min(Math.max((progressInLevel / range) * 100, 0), 100)
        return { current: xp, needed: Math.max(0, needed), nextLevel, percent }
      },

      getAchievements: () => ACHIEVEMENTS_DEF as Achievement[],

      getUnlockedAchievements: () => get().achievements,

      checkAndUnlockAchievements: () => {
        const state = get()
        const unlockedIds = new Set(state.achievements.map(a => a.id))
        const newlyUnlocked: Achievement[] = []

        const lessons = state.completedLessons.length
        const labs = state.completedLabs.filter(l => AVAILABLE_LABS.some(item => item.id === l.labId && item.module === l.moduleId)).length
        const quizzes = state.quizScores.length
        const perfectQuiz = state.quizScores.some(q => q.score === q.total && q.total > 0)
        // A module counts as complete once every lesson it ships is done.
        // Completion means every activity actually shipped for a module is recorded. Challenges
        // remain optional enrichment and do not gate module badges.
        const modulesCompleted = (modules as Array<{ id: string; lessons?: unknown[] }>).filter(m => {
          const lessonTotal = Array.isArray(m.lessons) ? m.lessons.length : 0
          const lessonsDone = state.completedLessons.filter(l => l.moduleId === m.id).length
          const moduleLabs = AVAILABLE_LABS.filter(lab => lab.module === m.id)
          const labsDone = state.completedLabs.filter(l => l.moduleId === m.id && AVAILABLE_LABS.some(item => item.id === l.labId && item.module === l.moduleId)).length
          const hasQuiz = Object.prototype.hasOwnProperty.call(quizData, m.id)
          const quizDone = !hasQuiz || state.quizScores.some(q => q.moduleId === m.id && q.completed)
          return lessonsDone >= lessonTotal && labsDone >= moduleLabs.length && quizDone
        }).length

        const checks: { id: string; condition: boolean }[] = [
          { id: 'first_lesson', condition: lessons >= 1 },
          { id: 'five_lessons', condition: lessons >= 5 },
          { id: 'ten_lessons', condition: lessons >= 10 },
          { id: 'twenty_lessons', condition: lessons >= 20 },
          { id: 'all_lessons', condition: lessons >= TOTAL_LESSONS },
          { id: 'first_lab', condition: labs >= 1 },
          { id: 'five_labs', condition: labs >= 5 },
          { id: 'ten_labs', condition: labs >= 10 },
          { id: 'first_quiz', condition: quizzes >= 1 },
          { id: 'perfect_quiz', condition: perfectQuiz },
          { id: 'five_quizzes', condition: quizzes >= 5 },
          { id: 'module_complete', condition: modulesCompleted >= 1 },
          { id: 'three_modules', condition: modulesCompleted >= 3 },
          { id: 'ten_modules', condition: modulesCompleted >= 10 },
          { id: 'all_modules', condition: modulesCompleted >= TOTAL_MODULES },
          { id: 'streak_3', condition: get().getStreak() >= 3 },
          { id: 'streak_7', condition: get().getStreak() >= 7 },
        ]

        checks.forEach(({ id, condition }) => {
          if (condition && !unlockedIds.has(id)) {
            const def = ACHIEVEMENTS_DEF.find(a => a.id === id)
            if (def) {
              const ach: Achievement = { ...def, unlockedAt: new Date().toISOString() }
              newlyUnlocked.push(ach)
            }
          }
        })

        if (newlyUnlocked.length > 0) {
          const totalNewXp = newlyUnlocked.reduce((s, a) => s + a.points, 0)
          set(s => ({
            achievements: [...s.achievements, ...newlyUnlocked],
            totalXp: s.totalXp + totalNewXp,
            lastEarnedPoints: newlyUnlocked.length === 1
              ? { amount: newlyUnlocked[0].points, reason: `Achievement: ${newlyUnlocked[0].title}`, at: new Date().toISOString() }
              : { amount: totalNewXp, reason: `${newlyUnlocked.length} Achievements Unlocked!`, at: new Date().toISOString() },
          }))
        }

        return newlyUnlocked
      },

      clearLastEarnedPoints: () => set({ lastEarnedPoints: null }),

      resetProgress: () => set({
        overallProgress: 0,
        completedLessons: [],
        completedLabs: [],
        completedChallenges: [],
        quizScores: [],
        retiredRecords: [],
        currentModule: null,
        currentLearningPathId: null,
      pathChosen: false,
        streak: 0,
        lastActive: new Date().toISOString(),
        totalXp: 0,
        achievements: [],
        lastEarnedPoints: null,
      })
    }),
    {
      name: 'platform-progress',
      version: 7,
      merge: (persistedState, currentState) => {
        if (persistedState) return { ...currentState, ...normalizePersistedProgress(persistedState) }
        // Zustand does not call `migrate` when the new key is absent, so explicitly consult the
        // legacy key here. Keep its key for compatibility but revalidate stored credit.
        try {
          const raw = localStorage.getItem('wififorge-progress')
          if (!raw) return currentState
          const parsed = JSON.parse(raw)
          const legacy = parsed?.state ?? parsed
          if (!legacy || typeof legacy !== 'object') return currentState
          return {
            ...currentState,
            ...normalizePersistedProgress({ ...legacy, completedChallenges: [] }, true, true),
            completedChallenges: [],
          }
        } catch {
          return currentState
        }
      },
      migrate: (persistedState: any, version: number) => {
        try {
          let state = persistedState
          if (!state) {
            try {
              const raw = localStorage.getItem('wififorge-progress')
              if (raw) { const parsed = JSON.parse(raw); state = parsed?.state ?? parsed }
            } catch {}
          }
          if (!state) return state
          // Before v4, lab buttons could record unverified 100% scores and failed quizzes could
          // count as complete. v5 also deduplicates records and recalculates credit from current rules.
          return normalizePersistedProgress(state, version < 4, version < 6)
        } catch {
          return persistedState
        }
      },
      // Handle corrupted storage gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Platform progress rehydrate error — clearing corrupted storage', error)
          try { 
            localStorage.removeItem('platform-progress')
            localStorage.removeItem('wififorge-progress')
          } catch {}
        }
      },
    }
  )
)
