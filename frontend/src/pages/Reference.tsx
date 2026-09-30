import { LoadingPanel } from '@/components/common/LoadingPanel'
import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Filter, Search, ClipboardList, FileText, BookOpen, ChevronRight, MapIcon, ArrowLeft } from 'lucide-react'
import { Link, useSearchParams, useParams } from 'react-router-dom'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import { ChecklistPanel } from '@/components/reference/ChecklistPanel'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { useProgressStore } from '@/store/useProgressStore'

const Flashcards = lazy(() => import('@/components/learning/Flashcards').then(m => ({ default: m.Flashcards })))
const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))

interface Command { category: string; command: string; proves: string; notes: string; learningPathId?: string }
interface FilterEntry { filter: string; purpose: string; learningPathId?: string }

type Tab = 'commands' | 'filters' | 'checklist' | 'method' | 'terminal' | 'flashcards'

export function Reference() {
  const { pathId } = useParams()
  const [searchParams] = useSearchParams()
  const currentPathIdStore = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const queryPath = searchParams.get('path') || pathId
  const effectivePathId = queryPath || currentPathIdStore || 'wireless-pentesting'
  const currentPath = learningPaths.find(p => p.id === effectivePathId) || learningPaths[0]

  const [tab, setTab] = useState<Tab>('commands')
  const [query, setQuery] = useState('')
  const [pathFilter, setPathFilter] = useState<string | null>(effectivePathId)

  // Support both array and object { wireless: [...], web: [...] } formats for future
  const allCommands: Command[] = useMemo(() => {
    if (Array.isArray(commands)) return commands as Command[]
    // Object format: merge
    const obj = commands as Record<string, Command[]>
    return Object.entries(obj).flatMap(([pathKey, list]) => list.map((c: any) => ({ ...c, learningPathId: c.learningPathId || pathKey })))
  }, [])

  const allFilters: FilterEntry[] = useMemo(() => {
    if (Array.isArray(filters)) return filters as FilterEntry[]
    const obj = filters as Record<string, FilterEntry[]>
    return Object.entries(obj).flatMap(([pathKey, list]) => list.map((f: any) => ({ ...f, learningPathId: f.learningPathId || pathKey })))
  }, [])

  const TABS: { id: Tab; label: string; icon: typeof Terminal }[] = [
    { id: 'commands', label: `Commands (${allCommands.length})`, icon: Terminal },
    { id: 'filters', label: `Filters (${allFilters.length})`, icon: Filter },
    { id: 'checklist', label: 'Master checklist', icon: ClipboardList },
    { id: 'method', label: 'Method & reporting', icon: FileText },
    { id: 'terminal', label: 'Terminal sandbox', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
  ]

  const cmdGroups = useMemo(() => {
    const q = query.toLowerCase()
    const groups = new Map<string, Command[]>()
    for (const c of allCommands) {
      // Path filter
      if (pathFilter) {
        const cPath = (c as any).learningPathId || 'wireless-pentesting'
        if (cPath !== pathFilter && !(cPath === 'wireless' && pathFilter === 'wireless-pentesting')) {
          // Allow if no learningPathId (legacy wireless) and filter is wireless
          if (!( ! (c as any).learningPathId && pathFilter === 'wireless-pentesting')) continue
        }
      }
      if (q && !(c.command + c.proves + c.notes + c.category).toLowerCase().includes(q)) continue
      const list = groups.get(c.category) ?? []
      list.push(c)
      groups.set(c.category, list)
    }
    return [...groups.entries()]
  }, [query, allCommands, pathFilter])

  const filterList = useMemo(() => {
    const q = query.toLowerCase()
    return allFilters.filter(f => {
      if (pathFilter) {
        const fPath = (f as any).learningPathId || 'wireless-pentesting'
        if (fPath !== pathFilter && !(fPath === 'wireless' && pathFilter === 'wireless-pentesting')) {
          if (!( !(f as any).learningPathId && pathFilter === 'wireless-pentesting')) return false
        }
      }
      return !q || (f.filter + f.purpose).toLowerCase().includes(q)
    })
  }, [query, allFilters, pathFilter])

  return (
    <div className="ws-legacy max-w-[1200px] mx-auto space-y-5 md:space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-300 transition-colors px-3 py-2 rounded-xl hover:bg-[var(--panel-bg)]/60 border border-transparent hover:border-[var(--line-normal)]/60">
          <ArrowLeft className="w-4 h-4" />
          {currentPath.title} — Path Detail
        </Link>
        <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-bg)] border border-[var(--line-normal)] text-slate-400 font-mono flex items-center gap-1.5">
          <MapIcon className="w-3 h-3" /> {currentPath.icon} {currentPath.title} • {currentPath.status.toUpperCase()} • {platform.name} Reference • Commands, methods & checklists
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-[24px] md:text-[28px] text-[var(--ink-primary)] tracking-tight leading-none flex items-center gap-2 sc-page-title">
              Reference <span className="text-[18px]">{currentPath.icon}</span>
            </h1>
            <p className="mt-2 max-w-[760px] text-[12.5px] text-slate-400 leading-relaxed">
              Platform-level reference — generic methodology + path-specific examples. Commands and filters are organised by <strong className="text-slate-200">what they prove</strong>, not by
              what they do. Memorising flags is not the skill — choosing the test that falsifies a hypothesis is.
              Field names are Wireshark 3.x/4.x (<span className="font-mono text-slate-300">wlan.*</span>); the
              pre-2.0 <span className="font-mono line-through text-slate-400">wlan_mgt.*</span> namespace is gone.
              Current path: {currentPath.title} ({currentPath.status}) • {platform.tagline} • {platform.philosophyShort}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] border transition-colors ${
                tab === t.id ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-[var(--panel-inset)]/50 border-[var(--line-normal)] text-slate-400 hover:border-[var(--line-strong)]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Path filter for commands/filters */}
        {(tab === 'commands' || tab === 'filters') && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Path filter:</span>
            <button onClick={() => setPathFilter(null)} className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors ${!pathFilter ? 'bg-[#1e293b] text-[var(--ink-primary)] border-[var(--line-strong)]' : 'bg-[var(--panel-inset)]/50 border-[var(--line-normal)] text-slate-400 hover:border-[var(--line-strong)]'}`}>All Paths</button>
            {learningPaths.slice(0, 8).map(p => (
              <button key={p.id} onClick={() => setPathFilter(p.id)} className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors flex items-center gap-1 ${pathFilter === p.id ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-[var(--panel-inset)]/50 border-[var(--line-normal)] text-slate-400 hover:border-[var(--line-strong)]'}`}>
                <span>{p.icon}</span> {p.shortTitle} {p.status !== 'available' ? '• planned' : ''}
              </button>
            ))}
          </div>
        )}

        {(tab === 'commands' || tab === 'filters') && (
          <div className="relative mt-4 sticky top-[64px] z-20 bg-[var(--panel-inset)]/90 backdrop-blur-xl p-3 -mx-3 rounded-xl border border-[var(--line-normal)]/30 shadow-lg shadow-black/10">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'commands' ? `Search commands in ${currentPath.title}, e.g. PMKID, RADIUS, deauth, retest…` : `Search filters in ${currentPath.title}, e.g. rsn, eapol, mfpr…`}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[var(--panel-inset)]/70 border border-[var(--line-normal)] text-[12.5px] text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
        )}
      </motion.div>

      {tab === 'commands' && (
        <div className="space-y-4">
          {cmdGroups.length > 0 && <nav aria-label="Command categories" className="sc-reference-categories">{cmdGroups.map(([category], index) => <a key={category} href={`#reference-category-${index}`}>{category}</a>)}</nav>}
          {cmdGroups.map(([category, list]) => (
            <motion.div key={category} id={`reference-category-${cmdGroups.findIndex(([name]) => name === category)}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line-normal)] text-[11px] font-mono uppercase tracking-widest text-cyan-400 flex items-center justify-between">
                <span>{category}</span>
                <span className="text-[10px] text-slate-400">{list.length} commands • {currentPath.shortTitle} • {pathFilter ? 'filtered' : 'all paths'}</span>
              </div>
              <div className="divide-y divide-[#1e293b]/70">
                {list.map((c: any) => (
                  <div key={c.command} className="p-4">
                    <code className="text-[12px] font-mono text-emerald-300 break-all">{c.command}</code>
                    <p className="mt-2 text-[12px] text-slate-300 leading-relaxed">
                      <span className="text-slate-400 font-mono text-[10.5px] uppercase tracking-widest mr-2">proves</span>
                      {c.proves}
                    </p>
                    {c.notes && <p className="mt-1.5 text-[11.5px] text-slate-400 leading-relaxed">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
          {!cmdGroups.length && <EmptyState />}
        </div>
      )}

      {tab === 'filters' && (
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
          <div className="divide-y divide-[#1e293b]/70">
            {filterList.map(f => (
              <div key={f.filter} className="p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                <code className="text-[12px] font-mono text-cyan-300 break-all sm:w-[46%] shrink-0">{f.filter}</code>
                <p className="text-[12px] text-slate-300 leading-relaxed">{f.purpose}</p>
              </div>
            ))}
            {!filterList.length && <div className="p-6"><EmptyState /></div>}
          </div>
        </div>
      )}

      {tab === 'checklist' && <ChecklistPanel engagementId="reference" />}

      {tab === 'method' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
            <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">The loop that replaces command memorisation — {platform.name} generic • {platform.tagline}</h3>
            <ol className="mt-3 space-y-2 text-[12.5px] text-slate-300">
              {['Observation — what does the artefact actually show?',
                'Interpretation — what does it mean, and what else could explain it?',
                'Hypothesis — the specific weakness you believe exists',
                'Test choice — which test falsifies it fastest, and is it authorised?',
                'Execution — bounded, timed, with a stop condition',
                'Evidence — hash + filter + frame numbers (or config/log excerpt)',
                'Conclusion — including the limits of what you proved'].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono flex items-center justify-center shrink-0">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 text-[11px] font-mono text-slate-400 p-3 rounded-xl bg-[var(--panel-inset)]/60 border border-[var(--line-normal)]/40">
              Platform philosophy: {platform.philosophy}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
            <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">Reporting & severity rules — generic VAPT</h3>
            <ul className="mt-3 space-y-2.5 text-[12.5px] text-slate-300 leading-relaxed">
              <li>• A technique has no CVSS score. A finding does — derived from exploitability, impact, scope and this environment.</li>
              <li>• Quote CVSS as an <span className="font-mono">example vector</span> with each metric justified from your evidence.</li>
              <li>• Severity language must survive the sentence "in an environment where…" — if it collapses, the score was a guess.</li>
              <li>• Retest = repeat the original test with the same method and compare extractions; a config change alone is not proof.</li>
              <li>• Negative results and untested areas belong in the report; they define the coverage you are claiming.</li>
              <li>• Evidence standard generic: hash + filter + frame numbers (PCAP) or hash + config line + log excerpt (other artifacts) — works for Web, API, Android, Network, AD, Cloud, AI.</li>
            </ul>
            <div className="mt-4 text-[11.5px] text-slate-400 font-mono space-y-1.5">
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/VAPT_METHODOLOGY.md</div>
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/WIRELESS_VAPT_CHECKLIST.md</div>
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/SIMULATION_VS_HARDWARE.md</div>
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/CONTENT_MODEL.md</div>
            </div>
          </motion.div>
        </div>
      )}

      {tab === 'terminal' && (
        <Suspense fallback={<LoadingPanel label="Loading terminal…" />}>
          <TerminalEmulator />
        </Suspense>
      )}

      {tab === 'flashcards' && (
        <Suspense fallback={<LoadingPanel label="Loading flashcards…" />}>
          <Flashcards />
        </Suspense>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line-strong)]/60 p-8 text-center">
      <p className="text-[12.5px] text-slate-400">Nothing matches that search — try clearing path filter or search query.</p>
    </div>
  )
}
