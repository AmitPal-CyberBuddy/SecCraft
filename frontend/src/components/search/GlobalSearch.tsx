import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, FlaskConical, Swords, Terminal, FileText, Command, ArrowRight, Clock, Zap, Map, Layers, Shield, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import modules from '@/content/modules.json'
import learningPaths from '@/content/learning-paths.json'
import { LABS } from '@/content/labs'
import challenges from '@/content/challenges.json'
import skills from '@/content/skills.json'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import platform from '@/content/platform.json'

interface SearchItem {
  id: string
  title: string
  description: string
  type: 'path' | 'module' | 'lesson' | 'lab' | 'challenge' | 'skill' | 'command' | 'filter' | 'tool'
  path: string
  keywords: string[]
  xp?: number
  badge?: string
}

function buildIndex(): SearchItem[] {
  const items: SearchItem[] = []

  // Learning Paths — platform-level
  for (const p of learningPaths as any[]) {
    items.push({
      id: p.id,
      title: `${p.icon || ''} ${p.title}`.trim(),
      description: p.description,
      type: 'path',
      path: `/paths/${p.id}`,
      keywords: [p.id, p.title, p.shortTitle, p.category, p.difficulty, ...(p.skills || []), p.tagline || '', p.legacyBrand || ''],
      badge: p.status === 'available' ? 'AVAILABLE' : 'PLANNED',
    })
  }

  // Modules — path-aware
  for (const m of modules as any[]) {
    const pathInfo = (learningPaths as any[]).find(p => p.id === m.learningPathId)
    items.push({
      id: m.id,
      title: m.title,
      description: m.description,
      type: 'module',
      path: m.learningPathId ? `/paths/${m.learningPathId}/modules/${m.id}` : `/modules/${m.id}`,
      keywords: [m.id, m.title, m.description, `phase ${m.phase}`, m.phaseName || '', m.difficulty, ...(m.skills || []), m.learningPathId || '', pathInfo?.title || ''],
      xp: 160,
      badge: pathInfo?.shortTitle || m.learningPathId || 'wireless',
    })
    // Lessons from modules.json
    if (Array.isArray(m.lessons)) {
      for (const l of m.lessons) {
        items.push({
          id: `${m.id}/${l.id}`,
          title: l.title,
          description: `${m.title} • ${l.kind} • ${m.learningPathId || 'wireless'}`,
          type: 'lesson',
          path: m.learningPathId ? `/paths/${m.learningPathId}/modules/${m.id}` : `/modules/${m.id}`,
          keywords: [l.id, l.title, l.kind, m.id, m.title, m.learningPathId || ''],
          xp: 10,
          badge: l.kind,
        })
      }
    }
  }

  // Labs — path-aware
  for (const lab of LABS as any[]) {
    const pathInfo = (learningPaths as any[]).find(p => p.id === lab.learningPathId)
    items.push({
      id: lab.id,
      title: lab.title,
      description: `${lab.type} • ${lab.module} • ${lab.learningPathId || 'wireless'} • ${lab.description}`,
      type: 'lab',
      path: `/labs?path=${lab.learningPathId || 'wireless-pentesting'}`,
      keywords: [lab.id, lab.title, lab.type, lab.module, lab.pcap || '', lab.learningPathId || '', pathInfo?.title || ''],
      badge: pathInfo?.shortTitle || lab.learningPathId || 'lab',
    })
  }

  // Challenges — path-aware
  for (const c of challenges as any[]) {
    const pathInfo = (learningPaths as any[]).find(p => p.id === c.learningPathId)
    items.push({
      id: c.id,
      title: c.title,
      description: `${c.description} • ${c.level} • ${c.difficulty} • ${c.learningPathId}`,
      type: 'challenge',
      path: `/challenges?path=${c.learningPathId || 'wireless-pentesting'}`,
      keywords: [c.id, c.title, c.description, c.module, c.level, c.difficulty, ...(c.skills || []), c.learningPathId || '', pathInfo?.title || ''],
      xp: c.points,
      badge: `${c.level} • ${pathInfo?.shortTitle || c.learningPathId}`,
    })
  }

  // Skills — generic + domain-specific
  for (const s of skills as any[]) {
    items.push({
      id: s.id,
      title: `${s.icon || ''} ${s.name}`.trim(),
      description: s.description,
      type: 'skill',
      path: `/paths`,
      keywords: [s.id, s.name, s.category, s.description, s.level || ''],
      badge: s.category,
    })
  }

  // Commands — generic VAPT but examples wireless for now
  const cmdList = Array.isArray(commands) ? commands : Object.values(commands as any).flat()
  for (const c of cmdList as any[]) {
    const cmdStr = c.command || c.id || ''
    const category = c.category || 'generic'
    items.push({
      id: `cmd-${cmdStr.slice(0, 40)}`,
      title: cmdStr,
      description: `${c.proves || c.description || ''} • ${category}`,
      type: 'command',
      path: '/reference',
      keywords: [cmdStr, c.proves || '', c.notes || '', category],
      badge: category.slice(0, 12),
    })
  }

  // Filters
  const filterList = Array.isArray(filters) ? filters : Object.values(filters as any).flat()
  for (const f of filterList as any[]) {
    const filterStr = f.filter || f.id || ''
    items.push({
      id: `filter-${filterStr.slice(0, 40)}`,
      title: filterStr,
      description: f.purpose || f.description || '',
      type: 'filter',
      path: '/reference',
      keywords: [filterStr, f.purpose || ''],
      badge: 'filter',
    })
  }

  // Platform pages
  items.push(
    { id: 'page-dashboard', title: `${platform.name} Dashboard`, description: `${platform.tagline} • ${platform.secondaryTagline} • Platform overview`, type: 'tool', path: '/', keywords: ['dashboard', 'platform', 'overview', platform.name, platform.tagline], badge: 'platform' },
    { id: 'page-paths', title: 'Learning Paths', description: `All learning paths • ${learningPaths.length} total • ${platform.name}`, type: 'tool', path: '/paths', keywords: ['learning paths', 'paths', 'wireless', 'web', 'api', 'android'], badge: 'platform' },
    { id: 'page-modules', title: 'Modules', description: 'Path-aware modules • 20 wireless • generic engine', type: 'tool', path: '/modules', keywords: ['modules', 'phases', 'foundations', 'recon', 'enterprise'], badge: 'learn' },
    { id: 'page-labs', title: 'Labs — Artifact Library', description: 'Artifact analysis • Config audit • Scenario • Platform generic', type: 'tool', path: '/labs', keywords: ['labs', 'pcap', 'artifact', 'config', 'terminal', 'evidence'], badge: 'practice' },
    { id: 'page-challenges', title: 'Challenges', description: 'Guided → Semi-guided → Assessment • Platform-level', type: 'tool', path: '/challenges', keywords: ['challenges', 'ctf', 'flags', 'guided'], badge: 'practice' },
    { id: 'page-engagement', title: 'Engagements / Assessments', description: 'ENG-01 Northwind Retail • Authorized assessment mode • Platform', type: 'tool', path: '/engagement', keywords: ['engagement', 'assessment', 'northwind', 'ENG-01'], badge: 'assess' },
    { id: 'page-reference', title: 'Reference — Commands, Filters, Checklist, Methodology', description: 'VAPT methodology • Evidence standard • Reporting • Platform generic', type: 'tool', path: '/reference', keywords: ['reference', 'commands', 'filters', 'checklist', 'methodology', 'evidence'], badge: 'reference' },
    { id: 'page-reports', title: 'Reports — Findings & Evidence Vault', description: 'Report editor • Timeline • Evidence vault • Platform generic', type: 'tool', path: '/reports', keywords: ['reports', 'evidence', 'vault', 'findings'], badge: 'track' },
    { id: 'page-settings', title: 'Settings — Profile, Theme, Privacy, Local Data', description: 'Local-first • No account • Theme • Accessibility • Offline', type: 'tool', path: '/settings', keywords: ['settings', 'profile', 'theme', 'privacy', 'accessibility'], badge: 'settings' },
  )

  return items
}

const searchData: SearchItem[] = buildIndex()

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const results = useMemo(() => {
    if (!query.trim()) return searchData.slice(0, 10)
    const q = query.toLowerCase()
    return searchData
      .map(item => {
        const score =
          (item.title.toLowerCase().includes(q) ? 12 : 0) +
          (item.id.toLowerCase().includes(q) ? 10 : 0) +
          (item.keywords.some(k => k.toLowerCase().includes(q)) ? 6 : 0) +
          (item.description.toLowerCase().includes(q) ? 3 : 0) +
          (item.type === 'path' && q.includes('path') ? 2 : 0)
        return { ...item, score }
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => document.getElementById('global-search-input')?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
        else {
          document.dispatchEvent(new CustomEvent('open-search'))
        }
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const getIcon = (type: string) => {
    switch(type) {
      case 'path': return Map
      case 'module': return BookOpen
      case 'lesson': return FileText
      case 'lab': return FlaskConical
      case 'challenge': return Swords
      case 'skill': return Target
      case 'command': return Terminal
      case 'filter': return Search
      case 'tool': return Layers
      default: return Search
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'path': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'module': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'lesson': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'lab': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'challenge': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'skill': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'command': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'filter': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'tool': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] xs:pt-[15vh] p-3 xs:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[640px] rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Search Input — platform-level */}
          <div className="relative flex items-center gap-3 p-4 border-b border-[#1e293b]/60">
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
            <input
              id="global-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${platform.name} — paths, modules, labs, challenges, skills, commands, filters... (e.g., WPA3, deauth, hashcat, ${platform.name})`}
              className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder:text-slate-500 focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e293b] border border-[#334155] text-[10px] font-mono text-slate-400">
                <Command className="w-3 h-3" />K
              </kbd>
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors">
                <span className="text-[12px] text-slate-400">✕</span>
              </button>
            </div>
          </div>

          {/* Results — generic */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-slate-500" />
                </div>
                <div className="text-[13px] text-slate-400">No results for "{query}" in {platform.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">Try: wireless, web, api, WPA3, handshake, deauth, hashcat, reconnaissance, evidence</div>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => {
                  const Icon = getIcon(item.type)
                  return (
                    <motion.button
                      key={`${item.type}-${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => {
                        navigate(item.path)
                        onClose()
                      }}
                      className="w-full text-left p-3 rounded-xl flex items-center gap-3 hover:bg-[#1e293b] border border-transparent hover:border-[#334155]/60 transition-all duration-200 group min-w-0"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#020617] border border-[#1e293b] flex items-center justify-center group-hover:border-[#334155] transition-colors shrink-0">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-[13px] font-medium text-slate-200 truncate group-hover:text-slate-100">{item.title}</span>
                          <span className={`hidden xs:inline-flex text-[9px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${getTypeColor(item.type)}`}>{item.type.toUpperCase()}</span>
                          {item.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono shrink-0">{item.badge}</span>}
                          {item.xp ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono shrink-0">+{item.xp} XP</span> : null}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 hidden xs:block" />
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — platform */}
          <div className="p-3 border-t border-[#1e293b]/60 bg-[#020617]/40 flex flex-col xs:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">↵</kbd> Select</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[10px]">ESC</kbd> Close</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{searchData.length} items • {platform.name} • local index • {platform.tagline}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
