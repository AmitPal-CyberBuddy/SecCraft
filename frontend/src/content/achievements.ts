import { TOTAL_LESSONS, TOTAL_MODULES } from '@/content/stats'

/**
 * Achievement definitions — one source of truth for the progress store, the badge showcase and the
 * XP ceiling. Thresholds reference the shipped content (TOTAL_LESSONS / TOTAL_MODULES), so adding a
 * lesson or module can never leave a "complete all 80 lessons" style claim behind.
 */

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  points: number
}

export const ACHIEVEMENTS_DEF: AchievementDef[] = [
  { id: 'first_lesson', title: 'First Blood', description: 'Complete your first lesson', icon: '📖', points: 10 },
  { id: 'five_lessons', title: 'Explorer', description: 'Complete 5 lessons', icon: '🧭', points: 25 },
  { id: 'ten_lessons', title: 'Scholar', description: 'Complete 10 lessons', icon: '🎓', points: 50 },
  { id: 'twenty_lessons', title: 'Knowledge Seeker', description: 'Complete 20 lessons', icon: '📚', points: 100 },
  { id: 'all_lessons', title: 'Completionist', description: `Complete all ${TOTAL_LESSONS} lessons`, icon: '🏆', points: 200 },
  { id: 'first_lab', title: 'Lab Rat', description: 'Complete your first lab', icon: '🧪', points: 15 },
  { id: 'five_labs', title: 'Hands-On', description: 'Complete 5 labs', icon: '🔬', points: 50 },
  { id: 'ten_labs', title: 'Lab Master', description: 'Complete 10 labs', icon: '⚗️', points: 100 },
  { id: 'first_quiz', title: 'Quiz Novice', description: 'Complete your first quiz', icon: '❓', points: 10 },
  { id: 'perfect_quiz', title: 'Perfectionist', description: 'Get 100% on a quiz', icon: '💯', points: 25 },
  { id: 'five_quizzes', title: 'Quiz Master', description: 'Complete 5 quizzes', icon: '🧠', points: 50 },
  { id: 'module_complete', title: 'Module Conqueror', description: 'Complete a full module', icon: '✅', points: 50 },
  { id: 'three_modules', title: 'Trifecta', description: 'Complete 3 modules', icon: '🔱', points: 75 },
  { id: 'ten_modules', title: 'Deca', description: 'Complete 10 modules', icon: '💎', points: 150 },
  { id: 'all_modules', title: 'Forge Legend', description: `Complete all ${TOTAL_MODULES} modules`, icon: '👑', points: 300 },
  { id: 'streak_3', title: 'Consistent', description: '3 day streak', icon: '🔥', points: 30 },
  { id: 'streak_7', title: 'Dedicated', description: '7 day streak', icon: '🔥', points: 70 },
]

/** Sum of every achievement's points. */
export const ACHIEVEMENT_POINTS = ACHIEVEMENTS_DEF.reduce((a, b) => a + b.points, 0)
