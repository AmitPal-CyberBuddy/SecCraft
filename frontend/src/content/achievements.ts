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
  { id: 'first_lesson', title: 'First Lesson', description: 'Record completion of your first lesson', icon: '📖', points: 10 },
  { id: 'five_lessons', title: 'Explorer', description: 'Complete 5 lessons', icon: '🧭', points: 25 },
  { id: 'ten_lessons', title: 'Ten Lessons', description: 'Record completion of 10 lessons', icon: '🎓', points: 50 },
  { id: 'twenty_lessons', title: 'Knowledge Seeker', description: 'Complete 20 lessons', icon: '📚', points: 100 },
  { id: 'all_lessons', title: 'Lesson Set Recorded', description: `Record completion of all ${TOTAL_LESSONS} authored lessons`, icon: '🏆', points: 200 },
  { id: 'first_lab', title: 'First Lab Review', description: 'Record a lab review; this does not imply answer validation', icon: '🧪', points: 15 },
  { id: 'five_labs', title: 'Five Lab Reviews', description: 'Record five lab activities; most are self-review, not machine-graded', icon: '🔬', points: 50 },
  { id: 'ten_labs', title: 'Ten Lab Reviews', description: 'Record ten lab activities; this is not a skill assessment', icon: '⚗️', points: 100 },
  { id: 'first_quiz', title: 'First Knowledge Check', description: 'Pass one local knowledge check at the stated threshold', icon: '❓', points: 10 },
  { id: 'perfect_quiz', title: 'Perfect Check', description: 'Score 100% on one local knowledge check', icon: '💯', points: 25 },
  { id: 'five_quizzes', title: 'Five Knowledge Checks', description: 'Pass five local knowledge checks', icon: '🧠', points: 50 },
  { id: 'module_complete', title: 'Module Activities Recorded', description: 'Record all available activities in one module; some are self-review', icon: '✅', points: 50 },
  { id: 'three_modules', title: 'Trifecta', description: 'Complete 3 modules', icon: '🔱', points: 75 },
  { id: 'ten_modules', title: 'Deca', description: 'Complete 10 modules', icon: '💎', points: 150 },
  { id: 'all_modules', title: 'Module Set Recorded', description: `Record available activities in all ${TOTAL_MODULES} modules; not a mastery claim`, icon: '👑', points: 300 },
  { id: 'streak_3', title: 'Consistent', description: 'Record activity on 3 consecutive days', icon: '🔥', points: 30 },
  { id: 'streak_7', title: 'Dedicated', description: 'Record activity on 7 consecutive days', icon: '🔥', points: 70 },
]

/** Sum of every achievement's points. */
export const ACHIEVEMENT_POINTS = ACHIEVEMENTS_DEF.reduce((a, b) => a + b.points, 0)
