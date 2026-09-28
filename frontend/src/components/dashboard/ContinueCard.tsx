import { ArrowRight, Clock, BookOpen, FlaskConical, Sparkles, Target, Zap, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface Props {
  moduleId: string
  title: string
  description: string
  progress: number
  lessonsCompleted: number
  totalLessons: number
  estimatedTime: string
}

export function ContinueCard({ moduleId, title, description, progress, lessonsCompleted, totalLessons, estimatedTime }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 overflow-hidden hover:border-[#334155]/60 hover:bg-[#111d33] hover:shadow-medium transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] via-violet-500/[0.02] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 shadow-glow-cyan/20">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase">Continue Learning</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-glow-cyan" />
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                <span>{moduleId}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{estimatedTime}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium tracking-widest flex items-center gap-1">
              <Zap className="w-3 h-3" />
              ACTIVE
            </span>
          </div>
        </div>

        <h3 className="font-heading font-bold text-[18px] md:text-[20px] text-slate-100 mb-2 leading-tight tracking-tight group-hover:text-white transition-colors duration-200">{title}</h3>
        <p className="text-[13px] text-slate-400 leading-relaxed mb-6 line-clamp-2 group-hover:text-slate-300 transition-colors duration-200">{description}</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-500 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center">
                <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="font-mono">{lessonsCompleted} / {totalLessons} lessons</span>
            </span>
            <span className="text-[13px] font-bold text-slate-200 font-mono">{progress}%</span>
          </div>
          
          <div className="relative h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-violet-500 rounded-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </div>

        <Link 
          to={`/modules/${moduleId}`}
          className="mt-6 group/btn relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold text-[13px] shadow-glow-cyan hover:shadow-glow-violet transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-2">
            Continue
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </span>
        </Link>
      </div>
    </motion.div>
  )
}
