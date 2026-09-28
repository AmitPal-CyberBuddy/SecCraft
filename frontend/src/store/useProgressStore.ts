import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LessonProgress {
  moduleId: string
  lessonId: string
  completed: boolean
  completedAt?: string
}

interface LabProgress {
  moduleId: string
  labId: string
  completed: boolean
  score?: number
}

interface QuizProgress {
  moduleId: string
  quizId: string
  score: number
  total: number
  completed: boolean
}

interface ProgressState {
  overallProgress: number
  completedLessons: LessonProgress[]
  completedLabs: LabProgress[]
  quizScores: QuizProgress[]
  currentModule: string | null
  streak: number
  lastActive: string | null

  // actions
  completeLesson: (moduleId: string, lessonId: string) => void
  completeLab: (moduleId: string, labId: string, score?: number) => void
  completeQuiz: (moduleId: string, quizId: string, score: number, total: number) => void
  setCurrentModule: (id: string) => void
  getModuleProgress: (moduleId: string) => number
  getOverallProgress: () => number
  isLessonCompleted: (moduleId: string, lessonId: string) => boolean
  resetProgress: () => void
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

      completeLesson: (moduleId, lessonId) => {
        const exists = get().completedLessons.find(l => l.moduleId === moduleId && l.lessonId === lessonId)
        if (exists) return
        set(state => ({
          completedLessons: [...state.completedLessons, { moduleId, lessonId, completed: true, completedAt: new Date().toISOString() }],
          lastActive: new Date().toISOString(),
        }))
      },

      completeLab: (moduleId, labId, score) => {
        const exists = get().completedLabs.find(l => l.moduleId === moduleId && l.labId === labId)
        if (exists) return
        set(state => ({
          completedLabs: [...state.completedLabs, { moduleId, labId, completed: true, score }],
          lastActive: new Date().toISOString(),
        }))
      },

      completeQuiz: (moduleId, quizId, score, total) => {
        set(state => {
          const filtered = state.quizScores.filter(q => !(q.moduleId === moduleId && q.quizId === quizId))
          return {
            quizScores: [...filtered, { moduleId, quizId, score, total, completed: true }],
            lastActive: new Date().toISOString(),
          }
        })
      },

      setCurrentModule: (id) => set({ currentModule: id }),

      getModuleProgress: (moduleId) => {
        const state = get()
        // Simple heuristic: lessons 60%, labs 25%, quiz 15%
        // For MVP, assume 4 lessons per module
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
        // 20 modules, average progress
        // For MVP, we have 20 modules defined, so overall = avg of all modules progress
        // Simplified: total completed items / total expected
        const totalItems = 20 * 7 // rough
        const completed = state.completedLessons.length + state.completedLabs.length + state.quizScores.length
        return Math.min(Math.round((completed / totalItems) * 100), 100)
      },

      isLessonCompleted: (moduleId, lessonId) => {
        return get().completedLessons.some(l => l.moduleId === moduleId && l.lessonId === lessonId)
      },

      resetProgress: () => set({
        overallProgress: 0,
        completedLessons: [],
        completedLabs: [],
        quizScores: [],
        currentModule: "02-wifi-fundamentals",
        streak: 0,
      })
    }),
    {
      name: 'wififorge-progress',
    }
  )
)
