import { Link } from 'react-router-dom'
import { Clock, BookOpen, FlaskConical, Lock, CheckCircle, Circle, Loader2, ArrowRight, Sparkles, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import modules from '@/content/modules.json'
import { AVAILABLE_LABS } from '@/content/labs'
import { POINTS } from '@/store/useProgressStore'
import type { ContentTier } from '@/lib/contentAccess'

interface Props {
  id: string
  title: string
  phase: number
  difficulty: string
  estimated_hours: number
  status: string
  progress?: number
  description?: string
  locked?: boolean
  /**
   * Curriculum tier. Drives a marker only — never a lock and never a blocked navigation.
   * The content is public on this site, so presenting it as unreachable would be false.
   */
  tier?: ContentTier
  /** True when the viewer's account does not carry the record benefits of the full tier. */
  tierIsAccountContent?: boolean
}

const phaseConfig: Record<number, { gradient: string, border: string, text: string, glow: string, label: string }> = {
  1: { gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-glow-cyan', label: 'FOUNDATIONS' },
  2: { gradient: 'from-violet-500/10 via-violet-500/5 to-transparent', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-glow-violet', label: 'RECON' },
  3: { gradient: 'from-amber-500/10 via-amber-500/5 to-transparent', border: 'border-amber-500/20', text: 'text-amber-400', glow: '', label: 'WPA/WPS' },
  4: { gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-glow-emerald', label: 'ATTACK' },
  5: { gradient: 'from-pink-500/10 via-pink-500/5 to-transparent', border: 'border-pink-500/20', text: 'text-pink-400', glow: '', label: 'ENTERPRISE' },
  6: { gradient: 'from-slate-500/10 via-slate-500/5 to-transparent', border: 'border-slate-500/20', text: 'text-slate-400', glow: '', label: 'FINAL' },
}

const difficultyConfig: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  'Beginner': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  'Intermediate': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'Advanced': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
  'Professional': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
}

export function ModuleCard({ id, title, phase, difficulty, estimated_hours, status, progress = 0, description, locked, tier = 'preview', tierIsAccountContent = false }: Props) {
  // Counts come from the module definition itself, so a card can never advertise lessons or labs
  // that the module does not ship.
  const moduleDef = (modules as any[]).find(m => m.id === id)
  const lessonCount = moduleDef?.lessons?.length ?? 0
  const labCount = AVAILABLE_LABS.filter(lab => lab.module === id).length
  const moduleXp = lessonCount * POINTS.LESSON + labCount * POINTS.LAB

  const phaseStyle = phaseConfig[phase] || phaseConfig[1]
  const diffStyle = difficultyConfig[difficulty] || difficultyConfig['Beginner']
  const isCompleted = progress === 100
  const isInProgress = progress > 0 && progress < 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={!locked ? { y: -3, scale: 1.01 } : undefined}
      className={`
        group relative rounded-2xl border bg-[#0f172a] overflow-hidden transition-all duration-300 ease-smooth
        ${locked 
          ? 'border-[#1e293b]/60 opacity-60' 
          : `border-[#1e293b] hover:border-[#334155] hover:shadow-medium ${phaseStyle.glow} hover:bg-[#111d33]`
        }
      `}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${phaseStyle.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${phaseStyle.text.split('-')[1]}-500/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

      {tier === 'full' && (
        <div className="absolute right-3 top-3 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-widest backdrop-blur-sm ${
              tierIsAccountContent
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            }`}
            title={
              tierIsAccountContent
                ? 'Full Curriculum — part of the account learning experience'
                : 'Full Curriculum — included in your account'
            }
          >
            {tierIsAccountContent ? 'FULL CURRICULUM' : 'FULL'}
          </span>
        </div>
      )}
      {tier === 'preview' && (
        <div className="absolute right-3 top-3 z-10">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold tracking-widest text-cyan-300 backdrop-blur-sm"
            title="Preview Curriculum — open to everyone"
          >
            PREVIEW
          </span>
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-[1px] z-20 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#0f172a]/90 border border-[#1e293b] shadow-medium backdrop-blur-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-center">
              <div className="text-[12px] font-medium text-slate-300">Locked</div>
              <div className="text-[11px] text-slate-500 mt-1">Complete previous modules</div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative p-5">
        {/* Header badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
            <div className={`
              px-2.5 py-1 rounded-full bg-[#020617]/80 border text-[10px] font-semibold tracking-widest backdrop-blur-sm
              ${phaseStyle.border} ${phaseStyle.text}
            `}>
              {phaseStyle.label} • P{phase}
            </div>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-glow-emerald"
              >
                <CheckCircle className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </div>
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide backdrop-blur-sm
            ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}
          `}>
            <div className={`w-1.5 h-1.5 rounded-full ${diffStyle.dot} ${isInProgress ? 'animate-pulse' : ''}`} />
            {difficulty.toUpperCase()}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-slate-500 tracking-wide">{id}</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#1e293b] to-transparent" />
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-medium backdrop-blur-sm ${
              status === 'simulated' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {status === 'simulated' ? '● SIM' : '◐ RF'}
            </span>
          </div>
          <h3 className="font-heading font-bold text-[16px] text-slate-100 leading-tight line-clamp-2 group-hover:text-white transition-colors duration-200">
            {title}
          </h3>
          {description && (
            <p className="text-[13px] text-slate-400 mt-2 line-clamp-2 leading-relaxed group-hover:text-slate-300 transition-colors duration-200">
              {description}
            </p>
          )}
        </div>

        {/* Meta — Consistent with points payoff */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/60 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="font-mono font-medium">{estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/60 text-[11px] text-slate-400">
            <BookOpen className="w-3 h-3" />
            <span className="font-mono">{lessonCount} lesson{lessonCount === 1 ? '' : 's'} • {lessonCount * POINTS.LESSON} XP</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/60 text-[11px] text-slate-400">
            <FlaskConical className="w-3 h-3" />
            <span className="font-mono">{labCount} lab{labCount === 1 ? '' : 's'} • {labCount * POINTS.LAB} XP</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-mono">
            <span>🏆</span>
            <span>{moduleXp} XP max from lesson{lessonCount === 1 ? '' : 's'} &amp; labs</span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300
                ${isCompleted 
                  ? 'bg-emerald-500 border-emerald-500 shadow-glow-emerald' 
                  : isInProgress 
                  ? 'bg-cyan-500/20 border-cyan-500/30' 
                  : 'bg-[#020617] border-[#1e293b] group-hover:border-[#334155]'
                }
              `}>
                {progress === 0 && <Circle className="w-3 h-3 text-slate-400 group-hover:text-slate-500 transition-colors" />}
                {isInProgress && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className={`text-[12px] font-medium transition-colors duration-200 ${
                isCompleted ? 'text-emerald-400' : isInProgress ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
              }`}>
                {progress === 0 ? 'Not started' : isCompleted ? 'Completed' : `${progress}% complete`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
              <Target className="w-3 h-3" />
              {progress}%
            </div>
          </div>
          
          <div className="relative h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
              style={{
                background: isCompleted 
                  ? 'linear-gradient(90deg, #10b981, #34d399)' 
                  : 'linear-gradient(90deg, #22d3ee, #a78bfa)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
              {isInProgress && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>
        </div>

        {/* Action */}
        {!locked && (
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="mt-5"
          >
            <Link
              to={`/modules/${id}`}
              className={`
                group/btn relative w-full py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ease-smooth
                ${isCompleted
                  ? 'bg-[#1e293b] hover:bg-[#25354f] border border-[#334155] text-slate-300 hover:text-slate-100 hover:border-[#475569]'
                  : isInProgress
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-glow-cyan hover:shadow-glow-violet border border-cyan-500/20'
                  : 'bg-[#1e293b] hover:bg-[#25354f] border border-[#334155] text-slate-300 hover:text-slate-100 hover:border-[#475569] hover:shadow-soft'
                }
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-smooth" />
              <span className="relative flex items-center gap-2">
                {progress === 0 ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Module
                  </>
                ) : isCompleted ? (
                  <>
                    <BookOpen className="w-4 h-4" />
                    Review
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    Continue
                  </>
                )}
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
              </span>
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
