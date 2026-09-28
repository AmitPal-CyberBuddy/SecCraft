import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const LEVELS: Level[] = [
  { level: 1, title: 'Initiate', minXp: 0, maxXp: 99, color: 'slate', icon: '🌱' },
  { level: 2, title: 'Scout', minXp: 100, maxXp: 299, color: 'cyan', icon: '🔍' },
  { level: 3, title: 'Analyst', minXp: 300, maxXp: 599, color: 'emerald', icon: '📡' },
  { level: 4, title: 'Operator', minXp: 600, maxXp: 999, color: 'violet', icon: '⚡' },
  { level: 5, title: 'Specialist', minXp: 1000, maxXp: 1499, color: 'amber', icon: '🛡️' },
  { level: 6, title: 'Expert', minXp: 1500, maxXp: 1999, color: 'pink', icon: '🎯' },
  { level: 7, title: 'Master', minXp: 2000, maxXp: 2449, color: 'cyan', icon: '👑' },
  { level: 8, title: 'Forge Master', minXp: 2450, maxXp: 9999, color: 'amber', icon: '🔥' },
]

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

export const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_lesson', title: 'First Blood', description: 'Complete your first lesson', icon: '📖', points: 10 },
  { id: 'five_lessons', title: 'Explorer', description: 'Complete 5 lessons', icon: '🧭', points: 25 },
  { id: 'ten_lessons', title: 'Scholar', description: 'Complete 10 lessons', icon: '🎓', points: 50 },
  { id: 'twenty_lessons', title: 'Knowledge Seeker', description: 'Complete 20 lessons', icon: '📚', points: 100 },
  { id: 'fifty_lessons', title: 'Lore Master', description: 'Complete 50 lessons', icon: '📜', points: 150 },
  { id: 'all_lessons', title: 'Completionist', description: 'Complete all 80 lessons', icon: '🏆', points: 200 },
  { id: 'first_lab', title: 'Lab Rat', description: 'Complete your first lab', icon: '🧪', points: 15 },
  { id: 'five_labs', title: 'Hands-On', description: 'Complete 5 labs', icon: '🔬', points: 50 },
  { id: 'ten_labs', title: 'Lab Master', description: 'Complete 10 labs', icon: '⚗️', points: 100 },
  { id: 'first_quiz', title: 'Quiz Novice', description: 'Complete your first quiz', icon: '❓', points: 10 },
  { id: 'perfect_quiz', title: 'Perfectionist', description: 'Get 100% on a quiz', icon: '💯', points: 25 },
  { id: 'five_quizzes', title: 'Quiz Master', description: 'Complete 5 quizzes', icon: '🧠', points: 50 },
  { id: 'module_complete', title: 'Module Conqueror', description: 'Complete a full module', icon: '✅', points: 50 },
  { id: 'phase_complete', title: 'Phase Conqueror', description: 'Complete a full phase', icon: '🚩', points: 100 },
  { id: 'three_modules', title: 'Trifecta', description: 'Complete 3 modules', icon: '🔱', points: 75 },
  { id: 'ten_modules', title: 'Deca', description: 'Complete 10 modules', icon: '💎', points: 150 },
  { id: 'all_modules', title: 'Forge Legend', description: 'Complete all 20 modules', icon: '👑', points: 300 },
  { id: 'final_assessment', title: 'Certified', description: 'Complete final assessment', icon: '🎖️', points: 200 },
  { id: 'streak_3', title: 'Consistent', description: '3 day streak', icon: '🔥', points: 30 },
  { id: 'streak_7', title: 'Dedicated', description: '7 day streak', icon: '🔥', points: 70 },
]

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
      streak: 1,
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
        setTimeout(() => get().checkAndUnlockAchievements(), 100)
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
        setTimeout(() => get().checkAndUnlockAchievements(), 100)
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
        setTimeout(() => get().checkAndUnlockAchievements(), 100)
        return { points: xpToAdd, isNew: !existing }
      },

      setCurrentModule: (id) => set({ currentModule: id }),

      getModuleProgress: (moduleId) => {
        const state = get()
        const lessonsDone = state.completedLessons.filter(l => l.moduleId === moduleId).length
        const labsDone = state.completedLabs.filter(l => l.moduleId === moduleId).length
        const quizDone = state.quizScores.filter(q => q.moduleId === moduleId && q.completed).length

        const lessonProgress = Math.min((lessonsDone / 4) * 60, 60)
        const labProgress = Math.min((labsDone / 2) * 25, 25)
        const quizProgress = Math.min((quizDone / 1) * 15, 15)

        return Math.round(lessonProgress + labProgress + quizProgress)
      },

      getOverallProgress: () => {
        const state = get()
        // More accurate: avg of module progress
        // 20 modules
        const totalModules = 20
        let sum = 0
        // We don't have modules list here, approximate via completed items
        // Use XP based progress as well
        const maxXp = 2450
        const xpProgress = Math.min((state.totalXp / maxXp) * 100, 100)
        const totalItems = 20 * 7
        const completed = state.completedLessons.length + state.completedLabs.length + state.quizScores.length
        const itemProgress = Math.min((completed / totalItems) * 100, 100)
        // Weighted avg: 60% xp, 40% items
        return Math.round(xpProgress * 0.6 + itemProgress * 0.4)
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
        const modulesCompleted = (() => {
          // Count modules with 100% progress
          // We approximate: if 4 lessons + 1 lab + 1 quiz done, consider module complete
          // For simplicity, count distinct modules where lessons >=4
          const map: Record<string, number> = {}
          state.completedLessons.forEach(l => { map[l.moduleId] = (map[l.moduleId] || 0) + 1 })
          return Object.values(map).filter(c => c >= 4).length
        })()

        const checks: { id: string; condition: boolean }[] = [
          { id: 'first_lesson', condition: lessons >= 1 },
          { id: 'five_lessons', condition: lessons >= 5 },
          { id: 'ten_lessons', condition: lessons >= 10 },
          { id: 'twenty_lessons', condition: lessons >= 20 },
          { id: 'fifty_lessons', condition: lessons >= 50 },
          { id: 'all_lessons', condition: lessons >= 80 },
          { id: 'first_lab', condition: labs >= 1 },
          { id: 'five_labs', condition: labs >= 5 },
          { id: 'ten_labs', condition: labs >= 10 },
          { id: 'first_quiz', condition: quizzes >= 1 },
          { id: 'perfect_quiz', condition: perfectQuiz },
          { id: 'five_quizzes', condition: quizzes >= 5 },
          { id: 'module_complete', condition: modulesCompleted >= 1 },
          { id: 'three_modules', condition: modulesCompleted >= 3 },
          { id: 'ten_modules', condition: modulesCompleted >= 10 },
          { id: 'all_modules', condition: modulesCompleted >= 20 },
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
        if (version === 0 || !persistedState.totalXp) {
          // Migrate old state: recalculate XP
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
      }
    }
  )
)
