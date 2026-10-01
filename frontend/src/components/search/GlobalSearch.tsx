import { useMotionPolicy } from '@/components/animations/motionPolicy'
import { panelMotion, motionTiming } from '@/lib/motion'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, FlaskConical, Swords, Terminal, FileText, Command, ArrowRight, Zap, Map, Layers, Target } from 'lucide-react'
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
      path: `/challenges/${c.id}?path=${c.learningPathId || 'wireless-pentesting'}`,
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
    // The dashboard lives at /app; / is the public homepage.
    { id: 'page-dashboard', title: `${platform.name} Dashboard`, description: `${platform.tagline} • Your next step • Local-first progress`, type: 'tool', path: '/app', keywords: ['dashboard', 'workspace', 'home', 'start', 'next step', platform.name, platform.tagline], badge: 'platform' },
    { id: 'page-paths', title: 'Learning Paths', description: `All learning paths • ${learningPaths.length} total • ${platform.name}`, type: 'tool', path: '/paths', keywords: ['learning paths', 'paths', 'wireless', 'web', 'api', 'android'], badge: 'platform' },
    { id: 'page-modules', title: 'Modules', description: 'Path-aware modules • 20 wireless • generic engine', type: 'tool', path: '/modules', keywords: ['modules', 'phases', 'foundations', 'recon', 'enterprise'], badge: 'learn' },
    { id: 'page-labs', title: 'Labs — Artifact Library', description: 'Artifact analysis • Config audit • Scenario • Platform generic', type: 'tool', path: '/labs', keywords: ['labs', 'pcap', 'artifact', 'config', 'terminal', 'evidence'], badge: 'practice' },
    { id: 'page-challenges', title: 'Challenges', description: 'Guided → Semi-guided → Assessment • Platform-level', type: 'tool', path: '/challenges', keywords: ['challenges', 'ctf', 'flags', 'guided'], badge: 'practice' },
    { id: 'page-engagement', title: 'Engagements / Assessments', description: 'ENG-01 Northwind Retail • Authorized assessment mode • Platform', type: 'tool', path: '/engagement', keywords: ['engagement', 'assessment', 'northwind', 'ENG-01'], badge: 'assess' },
    { id: 'page-reference', title: 'Reference — Commands, Filters, Checklist, Methodology', description: 'VAPT methodology • Evidence standard • Reporting • Platform generic', type: 'tool', path: '/reference', keywords: ['reference', 'commands', 'filters', 'checklist', 'methodology', 'evidence'], badge: 'reference' },
    { id: 'page-reports', title: 'Reports — Findings & Evidence Vault', description: 'Report editor • Timeline • Evidence vault • Platform generic', type: 'tool', path: '/reports', keywords: ['reports', 'evidence', 'vault', 'findings'], badge: 'track' },
    { id: 'page-profile', title: 'Profile — Identity, Account State, Display Name', description: 'Who you are in SecCraft • Guest display name • Local record', type: 'tool', path: '/profile', keywords: ['profile', 'identity', 'account', 'display name', 'guest'], badge: 'account' },
    { id: 'page-sync', title: 'Progress Sync — Import, Export, Merge', description: 'Local vs account vs imported records • Manual synchronization', type: 'tool', path: '/sync', keywords: ['sync', 'import', 'export', 'merge', 'backup', 'transfer', 'progress'], badge: 'account' },
    { id: 'page-account', title: 'Account Status — Verification & Approval', description: 'Email verification • Owner approval • Sign out', type: 'tool', path: '/account', keywords: ['account', 'status', 'approval', 'pending', 'verify', 'sign out'], badge: 'account' },
    { id: 'page-settings', title: 'Settings — Appearance, Accessibility, Local Data', description: 'Theme • Accessibility • Local data management • Account links', type: 'tool', path: '/settings', keywords: ['settings', 'theme', 'accessibility', 'local data', 'appearance'], badge: 'settings' },
  )

  return items
}

const searchData: SearchItem[] = buildIndex()

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const policy = useMotionPolicy()
  const entrance = panelMotion('search', policy)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const closeSearch = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }, [onClose])

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
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus())
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    document.getElementById(`search-result-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) closeSearch()
        else document.dispatchEvent(new CustomEvent('open-search'))
        return
      }
      if (!open) return
      if (e.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('.search-dialog')
        const focusables = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
        if (focusables?.length) {
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeSearch()
      } else if (e.key === 'ArrowDown' && results.length) {
        e.preventDefault()
        setActiveIndex(i => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp' && results.length) {
        e.preventDefault()
        setActiveIndex(i => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault()
        navigate(results[activeIndex].path)
        closeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, closeSearch, navigate, results, activeIndex])

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
      case 'path': return 'bg-[var(--accent-bg)] text-[var(--learning)] border-[var(--accent-border)]'
      case 'module': return 'bg-[var(--owner-bg)] text-[var(--owner)] border-[var(--owner-border)]'
      case 'lesson': return 'bg-[var(--owner-bg)] text-[var(--owner)] border-[var(--owner-border)]'
      case 'lab': return 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]'
      case 'challenge': return 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]'
      case 'skill': return 'bg-[var(--accent-bg)] text-[var(--learning)] border-[var(--accent-border)]'
      case 'command': return 'bg-[var(--warning-bg)] text-[var(--attention)] border-[var(--warning-border)]'
      case 'filter': return 'bg-[var(--owner-bg)] text-[var(--owner)] border-[var(--owner-border)]'
      case 'tool': return 'bg-[var(--panel-raised)] text-[var(--ink-secondary)] border-[var(--line-strong)]'
      default: return 'bg-[var(--panel-raised)] text-[var(--ink-secondary)] border-[var(--line-strong)]'
    }
  }

  if (!open) return null

  return (
      <div className="ws-search-overlay">
        <motion.div
          initial={policy.reduced || policy.paused ? false : { opacity: 0 }}
          transition={{ type: 'tween', duration: policy.reduced || policy.paused ? 0 : motionTiming.control }}
          animate={{ opacity: 1 }}
          className="search-backdrop absolute inset-0 bg-[var(--scrim)]"
          onClick={closeSearch}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${platform.name} search`}
          {...entrance}
          className="search-dialog relative w-full max-w-[680px] rounded-xl bg-[var(--overlay-bg)] border border-[var(--line-normal)] shadow-lg overflow-hidden  flex flex-col"
        >
          {/* Search Input — platform-level */}
          <div className="relative flex items-center gap-3 p-4 border-b border-[var(--line-normal)]">
            <Search className="w-5 h-5 text-[var(--ink-muted)] shrink-0" />
            <input
              ref={inputRef}
              id="global-search-input"
              aria-label="Search paths, learning content, labs, and references"
              role="combobox"
              aria-expanded="true"
              aria-controls="global-search-results"
              aria-activedescendant={results.length ? `search-result-${activeIndex}` : undefined}
              autoComplete="off"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
              placeholder="Search paths, modules, labs, commands…"
              className="flex-1 bg-transparent text-[14px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[10px] font-mono text-[var(--ink-secondary)]">
                <Command className="w-3 h-3" />K
              </kbd>
              <button onClick={closeSearch} aria-label="Close search" className="w-9 h-9 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] transition-colors">
                <span className="text-[12px] text-[var(--ink-secondary)]">✕</span>
              </button>
            </div>
          </div>

          {/* Results — generic */}
          <div role="region" aria-label="Search suggestions and results" tabIndex={0} className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-[var(--ink-muted)]" />
                </div>
                <div className="text-[13px] text-[var(--ink-secondary)]">No results for "{query}" in {platform.name}</div>
                <div className="text-[11px] text-[var(--ink-secondary)] mt-1">Try: wireless, web, api, WPA3, handshake, deauth, hashcat, reconnaissance, evidence</div>
              </div>
            ) : (
              <div id="global-search-results" role="listbox" aria-label="Search results" className="space-y-1">
                {results.map((item, idx) => {
                  const Icon = getIcon(item.type)
                  return (
                    <div
                      id={`search-result-${idx}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={activeIndex === idx}
                      key={`${item.type}-${item.id}-${idx}`}
                      onMouseDown={e => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        navigate(item.path)
                        onClose()
                      }}
                      className={`w-full text-left p-3 rounded-xl flex items-center gap-3 border sc-surface-transition group min-w-0 ${activeIndex === idx ? 'bg-[var(--panel-raised)] border-[var(--accent-border)] shadow-soft' : 'hover:bg-[var(--panel-raised)] border-transparent hover:border-[var(--line-strong)]'}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-center justify-center group-hover:border-[var(--line-strong)] transition-colors shrink-0">
                        <Icon className="w-4 h-4 text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-[13px] font-medium text-[var(--ink-primary)] truncate group-hover:text-[var(--ink-primary)]">{item.title}</span>
                          <span className={`hidden xs:inline-flex text-[9px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${getTypeColor(item.type)}`}>{item.type.toUpperCase()}</span>
                          {item.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono shrink-0">{item.badge}</span>}
                          {item.xp ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--attention)] border border-[var(--warning-border)] font-mono shrink-0">+{item.xp} XP</span> : null}
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">{item.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--ink-secondary)] group-hover:text-[var(--ink-secondary)] sc-surface-transition shrink-0 hidden xs:block" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer — platform */}
          <div className="p-3 border-t border-[var(--line-normal)] bg-[var(--panel-inset)] flex flex-col xs:flex-row items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[10px]">↵</kbd> Select</span>
              <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[10px]">ESC</kbd> Close</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[var(--attention)]" />
              <span>{searchData.length} items • {platform.name} • local index • {platform.tagline}</span>
            </div>
          </div>
        </motion.div>
      </div>
  )
}
