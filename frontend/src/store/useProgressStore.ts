import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS_DEF as ACHIEVEMENT_DEFS, ACHIEVEMENT_POINTS } from '@/content/achievements'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES } from '@/content/stats'
import modules from '@/content/modules.json'
import { LABS } from '@/content/labs'

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
}

export const POINTS = {
  LESSON: 10,
  LAB: 25,
  QUIZ: 20,
  QUIZ_PERFECT_BONUS: 10,
  MODULE_COMPLETE: 50,
  PHASE_COMPLETE: 100,
  CHALLENGE: 50,
  FINAL_ASSESSMENT: 200,
  STREAK_BONUS: 5,
}


/**
 * XP ceiling for this build, derived from the shipped content and the point values above:
 * every authored lesson, every lab, one quiz per module (perfect-score bonus included) and every
 * achievement. Progress percentages and certificate thresholds divide by this — never by a number
 * typed into a component.
 */
export const MAX_XP =
  TOTAL_LESSONS * POINTS.LESSON +
  TOTAL_LABS * POINTS.LAB +
  TOTAL_MODULES * (POINTS.QUIZ + POINTS.QUIZ_PERFECT_BONUS) +
  ACHIEVEMENT_POINTS

/** Certificate unlock: 60% of achievable XP and 60% overall completion. */
export const CERT_XP_THRESHOLD = Math.round(MAX_XP * 0.6)
export const CERT_PROGRESS_THRESHOLD = 60


export const LEVELS: Level[] = [
  { level: 1, title: 'Initiate', minXp: 0, maxXp: 99, color: 'slate', icon: '🌱' },
  { level: 2, title: 'Scout', minXp: 100, maxXp: 299, color: 'cyan', icon: '🔍' },
  { level: 3, title: 'Analyst', minXp: 300, maxXp: 599, color: 'emerald', icon: '📡' },
  { level: 4, title: 'Operator', minXp: 600, maxXp: 999, color: 'violet', icon: '⚡' },
  { level: 5, title: 'Specialist', minXp: 1000, maxXp: 1499, color: 'amber', icon: '🛡️' },
  { level: 6, title: 'Expert', minXp: 1500, maxXp: 1999, color: 'pink', icon: '🎯' },
  { level: 7, title: 'Master', minXp: 2000, maxXp: 2449, color: 'cyan', icon: '👑' },
  { level: 8, title: 'Forge Master', minXp: Math.round(MAX_XP * 0.75), maxXp: 999999, color: 'amber', icon: '🔥' },
]


export const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlockedAt'>[] = ACHIEVEMENT_DEFS


interface ProgressState {
  overallProgress: number
  completedLessons: LessonProgress[]
  completedLabs: LabProgress[]
  quizScores: QuizProgress[]
  currentModule: string | null
  streak: number
  lastActive: string | null
  totalXp: number
  achievements: Achievement[]
  lastEarnedPoints: { amount: number; reason: string; at: string } | null

  // actions
  completeLesson: (moduleId: string, lessonId: string) => { points: number; isNew: boolean }
  completeLab: (moduleId: string, labId: string, score?: number) => { points: number; isNew: boolean }
  completeQuiz: (moduleId: string, quizId: string, score: number, total: number) => { points: number; isNew: boolean }
  setCurrentModule: (id: string) => void
  getModuleProgress: (moduleId: string) => number
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
      quizScores: [],
      currentModule: "02-wifi-fundamentals",
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
          const newAchievements = state.achievements
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
        if (exists) return { points: 0, isNew: false }
        const points = POINTS.LAB
        set(state => ({
          completedLabs: [...state.completedLabs, { moduleId, labId, completed: true, score, points, completedAt: new Date().toISOString() }],
          lastActive: new Date().toISOString(),
          totalXp: state.totalXp + points,
          lastEarnedPoints: { amount: points, reason: `Lab: ${labId}`, at: new Date().toISOString() },
        }))
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points, isNew: true }
      },

      completeQuiz: (moduleId, quizId, score, total) => {
        const existing = get().quizScores.find(q => q.moduleId === moduleId && q.quizId === quizId)
        const isPerfect = score === total
        const points = POINTS.QUIZ + (isPerfect ? POINTS.QUIZ_PERFECT_BONUS : 0)
        // If already completed with same or better score, don't double count
        if (existing && existing.score >= score) {
          set(state => {
            const filtered = state.quizScores.filter(q => !(q.moduleId === moduleId && q.quizId === quizId))
            return {
              quizScores: [...filtered, { moduleId, quizId, score, total, completed: true, points: existing.points, completedAt: new Date().toISOString() }],
              lastActive: new Date().toISOString(),
            }
          })
          return { points: 0, isNew: false }
        }
        const xpToAdd = existing ? points - existing.points : points
        set(state => {
          const filtered = state.quizScores.filter(q => !(q.moduleId === moduleId && q.quizId === quizId))
          return {
            quizScores: [...filtered, { moduleId, quizId, score, total, completed: true, points, completedAt: new Date().toISOString() }],
            lastActive: new Date().toISOString(),
            totalXp: state.totalXp + Math.max(0, xpToAdd),
            lastEarnedPoints: xpToAdd > 0 ? { amount: xpToAdd, reason: `Quiz: ${score}/${total}${isPerfect ? ' Perfect!' : ''}`, at: new Date().toISOString() } : state.lastEarnedPoints,
          }
        })
        setTimeout(() => {
          get().checkAndUnlockAchievements()
          set({ streak: get().getStreak() })
        }, 100)
        return { points: xpToAdd, isNew: !existing }
      },

      setCurrentModule: (id) => set({ currentModule: id }),

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
        const labsDone = state.completedLabs.filter(l => l.moduleId === moduleId).length
        const quizDone = state.quizScores.filter(q => q.moduleId === moduleId && q.completed).length

        // Denominators come from the content itself: lessons from modules.json, labs from the single
        // catalogue in content/labs.ts (the same list the Labs page renders).
        const meta = (modules as Array<{ id: string; lessons?: unknown[] }>).find(m => m.id === moduleId)
        const lessonTotal = Math.max(1, Array.isArray(meta?.lessons) ? meta!.lessons!.length : 1)
        const labTotal = Math.max(1, LABS.filter(lab => lab.module === moduleId).length)

        const lessonProgress = Math.min((lessonsDone / lessonTotal) * 60, 60)
        const labProgress = Math.min((labsDone / labTotal) * 25, 25)
        const quizProgress = Math.min((quizDone / 1) * 15, 15)

        return Math.round(lessonProgress + labProgress + quizProgress)
      },

      getOverallProgress: () => {
        const state = get()
        // 60% XP against the achievable ceiling, 40% completion of the shipped items. Both halves
        // are content-derived, so the number means the same thing after a content update.
        const xpProgress = Math.min((state.getTotalXp() / MAX_XP) * 100, 100)
        const totalItems = TOTAL_LESSONS + TOTAL_LABS + TOTAL_MODULES
        const completed = state.completedLessons.length + state.completedLabs.length + state.quizScores.length
        const itemProgress = Math.min((completed / totalItems) * 100, 100)
        const value = xpProgress * 0.6 + itemProgress * 0.4
        // Guard against a persisted snapshot from an older release producing NaN.
        return Number.isFinite(value) ? Math.round(value) : 0
      },

      isLessonCompleted: (moduleId, lessonId) => {
        return get().completedLessons.some(l => l.moduleId === moduleId && l.lessonId === lessonId)
      },

      getTotalXp: () => {
        const state = get()
        // Recalculate to be safe
        const lessonXp = state.completedLessons.reduce((s, l) => s + (l.points || POINTS.LESSON), 0)
        const labXp = state.completedLabs.reduce((s, l) => s + (l.points || POINTS.LAB), 0)
        const quizXp = state.quizScores.reduce((s, q) => s + (q.points || POINTS.QUIZ), 0)
        const achievementXp = state.achievements.reduce((s, a) => s + a.points, 0)
        return lessonXp + labXp + quizXp + achievementXp
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
        const labs = state.completedLabs.length
        const quizzes = state.quizScores.length
        const perfectQuiz = state.quizScores.some(q => q.score === q.total && q.total > 0)
        // A module counts as complete once every lesson it ships is done.
        const modulesCompleted = (() => {
          const done: Record<string, number> = {}
          state.completedLessons.forEach(l => { done[l.moduleId] = (done[l.moduleId] || 0) + 1 })
          const list = modules as Array<{ id: string; lessons?: unknown[] }>
          return list.filter(m => (done[m.id] || 0) >= Math.max(1, Array.isArray(m.lessons) ? m.lessons.length : 1)).length
        })()

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
        quizScores: [],
        currentModule: "02-wifi-fundamentals",
        streak: 0,
        totalXp: 0,
        achievements: [],
        lastEarnedPoints: null,
      })
    }),
    {
      name: 'wififorge-progress',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        try {
          if (!persistedState) return persistedState
          if (version === 0 || !persistedState.totalXp) {
            const lessons = persistedState.completedLessons || []
            const labs = persistedState.completedLabs || []
            const quizzes = persistedState.quizScores || []
            const totalXp = lessons.length * POINTS.LESSON + labs.length * POINTS.LAB + quizzes.length * POINTS.QUIZ
            return {
              ...persistedState,
              totalXp,
              achievements: persistedState.achievements || [],
              lastEarnedPoints: null,
              completedLessons: lessons.map((l: any) => ({ ...l, points: l.points || POINTS.LESSON })),
              completedLabs: labs.map((l: any) => ({ ...l, points: l.points || POINTS.LAB })),
              quizScores: quizzes.map((q: any) => ({ ...q, points: q.points || POINTS.QUIZ })),
            }
          }
          return persistedState
        } catch {
          return persistedState
        }
      },
      // Handle corrupted storage gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('WiFiForge progress rehydrate error — clearing corrupted storage', error)
          try { localStorage.removeItem('wififorge-progress') } catch {}
        }
      },
    }
  )
)
