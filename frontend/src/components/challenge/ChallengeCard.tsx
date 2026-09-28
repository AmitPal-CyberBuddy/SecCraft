import { Link } from 'react-router-dom'
import { Swords, Clock, Trophy, Shield, FlaskConical, FileText, Terminal, Search, ChevronRight, Sparkles, Target, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  id: string
  title: string
  module: string
  difficulty: string
  type: string
  level: string
  estimated_time: string
  points: number
  status: string
  description: string
  skills: string[]
}

const levelConfig: Record<string, { bg: string, text: string, border: string, glow: string, label: string }> = {
  'guided': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-glow-cyan', label: 'GUIDED' },
  'semi-guided': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', glow: '', label: 'SEMI' },
  'assessment': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: '', label: 'ASSESS' },
}

const difficultyConfig: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  'Beginner': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  'Intermediate': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'Advanced': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
  'Professional': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
}

const typeIcons: Record<string, any> = {
  'pcap_analysis': FlaskConical,
  'config_analysis': FileText,
  'investigation': Search,
  'terminal': Terminal,
  'knowledge_check': Shield,
}

export function ChallengeCard({ id, title, module, difficulty, type, level, estimated_time, points, status, description, skills }: Props) {
  const Icon = typeIcons[type] || Swords
  const lvl = levelConfig[level] || levelConfig['guided']
  const diff = difficultyConfig[difficulty] || difficultyConfig['Beginner']

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/challenges/${id}`} className="group relative rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5 hover:border-[#334155] hover:bg-[#111d33] hover:shadow-medium transition-all duration-300 ease-smooth block overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#020617]/60 border border-[#1e293b]/60 group-hover:bg-[#1e293b]/80 group-hover:border-[#334155]/60 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-1">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors duration-200" />
              </div>
              <div>
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <span>{module}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-slate-600">{id}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{estimated_time}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-medium backdrop-blur-sm tracking-widest ${lvl.bg} ${lvl.text} ${lvl.border} ${lvl.glow}`}>
                {lvl.label}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${diff.bg} ${diff.text} ${diff.border}`}>
                <span className={`w-1 h-1 rounded-full ${diff.dot}`} />
                {difficulty.toUpperCase()}
              </span>
            </div>
          </div>

          <h3 className="font-heading font-bold text-[14px] text-slate-100 mb-2 leading-tight group-hover:text-white transition-colors duration-200 line-clamp-2">
            {title}
          </h3>
          <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2 mb-4 group-hover:text-slate-300 transition-colors duration-200">{description}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.slice(0, 3).map(skill => (
              <span key={skill} className="px-2 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/60 text-[10px] font-mono text-slate-500 group-hover:bg-[#020617]/80 group-hover:text-slate-400 transition-all duration-200">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-2 py-1 rounded-full bg-[#1e293b]/60 border border-[#334155]/40 text-[10px] font-mono text-slate-500">
                +{skills.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#020617]/60 border border-[#1e293b]/40">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-mono font-bold text-amber-400">{points}</span>
              </div>
              <span className={`px-2 py-1 rounded-full border font-mono text-[10px] font-medium ${
                status === 'simulated' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {status === 'simulated' ? '● SIM' : '◐ RF'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200">
              <span>Solve</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
