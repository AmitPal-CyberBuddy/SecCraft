import { LearningPathScope } from '@/components/common/LearningPathScope'
import { CodeSnippet } from '@/components/common/TechnicalContent'
import { EmptyState, PageHeader } from '@/components/common/Workspace'
import { TextField, ViewSwitcher } from '@/components/common/Controls'
import { LoadingPanel } from '@/components/common/LoadingPanel'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Terminal, Filter, ClipboardList, FileText, BookOpen, MapIcon, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import { ChecklistPanel } from '@/components/reference/ChecklistPanel'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'

const Flashcards = lazy(() => import('@/components/learning/Flashcards').then(m => ({ default: m.Flashcards })))
const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))

interface Command { category: string; command: string; proves: string; notes: string; learningPathId?: string }
interface FilterEntry { filter: string; purpose: string; learningPathId?: string }

type Tab = 'commands' | 'filters' | 'checklist' | 'method' | 'terminal' | 'flashcards'

export function Reference() {
  return <LearningPathScope area="reference">{id => <ReferenceContent key={id} effectivePathId={id} />}</LearningPathScope>
}
function ReferenceContent({ effectivePathId }: { effectivePathId: string }) {
  const currentPath = learningPaths.find(p => p.id === effectivePathId)!

  const [tab, setTab] = useState<Tab>(effectivePathId === 'wireless-pentesting' ? 'commands' : 'method')
  const [query, setQuery] = useState('')
  const pathFilter = effectivePathId

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
        <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-secondary)] transition-colors px-3 py-2 rounded-xl hover:bg-[var(--panel-bg)] border border-transparent hover:border-[var(--line-normal)]">
          <ArrowLeft className="w-4 h-4" />
          {currentPath.title} — Path Detail
        </Link>
        <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[var(--ink-secondary)] font-mono flex items-center gap-1.5">
          <MapIcon className="w-3 h-3" /> {currentPath.icon} {currentPath.title} • {currentPath.status.toUpperCase()} • {platform.name} Reference • Commands, methods & checklists
        </span>
      </div>

      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5">
        <PageHeader eyebrow={`Reference / ${currentPath.title}`} title="Reference" description="Commands and filters organised by what they prove. Choose a test that challenges your hypothesis, not just a command to memorise." />
        {effectivePathId === 'wireless-pentesting' && <p className="ws-muted mt-4">Wireless field names use Wireshark 3.x/4.x (<code>wlan.*</code>); the pre-2.0 <code>wlan_mgt.*</code> namespace is obsolete. Examples are path-specific; methodology applies across paths.</p>}

        {effectivePathId !== 'wireless-pentesting' && <p className="ws-muted mt-4">Use the method below alongside your module’s source cases. A dedicated command and filter library is not available for this path yet.</p>}
        <ViewSwitcher label="Reference views" value={tab} onChange={setTab} options={TABS.filter(item => effectivePathId === 'wireless-pentesting' || item.id === 'method').map(item => ({ id: item.id, label: item.label, icon: <item.icon size={16} /> }))} />

        {(tab === 'commands' || tab === 'filters') && (
          <div className="relative mt-4 sc-sticky-tool z-20 bg-[var(--panel-inset)] backdrop-blur-xl p-3 -mx-3 rounded-xl border border-[var(--line-normal)] shadow-lg shadow-black/10">
            <TextField
              type="search"
              label={tab === 'commands' ? 'Search commands' : 'Search filters'}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={tab === 'commands' ? 'Try PMKID, RADIUS or retest' : 'Try rsn, eapol or mfpr'}
            />
          </div>
        )}
      </div>

      {tab === 'commands' && (
        <div className="space-y-4">
          {cmdGroups.length > 0 && <nav aria-label="Command categories" className="sc-reference-categories">{cmdGroups.map(([category], index) => <a key={category} href={`#reference-category-${index}`}>{category}</a>)}</nav>}
          {cmdGroups.map(([category, list]) => (
            <div key={category} id={`reference-category-${cmdGroups.findIndex(([name]) => name === category)}`} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line-normal)] text-[11px] font-mono uppercase tracking-widest text-[var(--learning)] flex items-center justify-between">
                <span>{category}</span>
                <span className="text-[10px] text-[var(--ink-secondary)]">{list.length} commands • {currentPath.shortTitle} • {pathFilter ? 'filtered' : 'all paths'}</span>
              </div>
              <div className="divide-y divide-[var(--line-normal)]">
                {list.map((c: any) => (
                  <div key={c.command} className="p-4">
                    <CodeSnippet text={c.command} label="Command" />
                    <p className="mt-2 text-sm text-[var(--ink-secondary)] leading-relaxed">
                      <span className="text-[var(--ink-secondary)] font-mono text-[10.5px] uppercase tracking-widest mr-2">proves</span>
                      {c.proves}
                    </p>
                    {c.notes && <p className="mt-1.5 text-sm text-[var(--ink-secondary)] leading-relaxed">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!cmdGroups.length && <EmptyState title="No matching results" description="Try another search in this path." action={<button type="button" className="ws-action ws-action-secondary" onClick={() => { setQuery('') }}>Clear search</button>} />}
        </div>
      )}

      {tab === 'filters' && (
        <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
          <div className="divide-y divide-[var(--line-normal)]">
            {filterList.map(f => (
              <div key={f.filter} className="p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                <div className="min-w-0 sm:w-1/2"><CodeSnippet text={f.filter} label="Filter" /></div>
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">{f.purpose}</p>
              </div>
            ))}
            {!filterList.length && <div className="p-6"><EmptyState title="No matching results" description="Try another search in this path." action={<button type="button" className="ws-action ws-action-secondary" onClick={() => { setQuery('') }}>Clear search</button>} /></div>}
          </div>
        </div>
      )}

      {tab === 'checklist' && <ChecklistPanel engagementId="reference" />}

      {tab === 'method' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
            <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">From observation to a supported conclusion</h3>
            <ol className="mt-3 space-y-2 text-sm text-[var(--ink-secondary)]">
              {['Observation — what does the artefact actually show?',
                'Interpretation — what does it mean, and what else could explain it?',
                'Hypothesis — the specific weakness you believe exists',
                'Test choice — which test falsifies it fastest, and is it authorised?',
                'Execution — bounded, timed, with a stop condition',
                'Evidence — hash + filter + frame numbers (or config/log excerpt)',
                'Conclusion — including the limits of what you proved'].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)] text-[10px] font-mono flex items-center justify-center shrink-0">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 text-[11px] font-mono text-[var(--ink-secondary)] p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
              Platform philosophy: {platform.philosophy}
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
            <h3 className="text-[13.5px] font-semibold text-[var(--ink-primary)]">Reporting & severity rules — generic VAPT</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-[var(--ink-secondary)] leading-relaxed">
              <li>• A technique has no CVSS score. A finding does — derived from exploitability, impact, scope and this environment.</li>
              <li>• Quote CVSS as an <span className="font-mono">example vector</span> with each metric justified from your evidence.</li>
              <li>• Severity language must survive the sentence "in an environment where…" — if it collapses, the score was a guess.</li>
              <li>• Retest = repeat the original test with the same method and compare extractions; a config change alone is not proof.</li>
              <li>• Negative results and untested areas belong in the report; they define the coverage you are claiming.</li>
              <li>• Evidence standard generic: hash + filter + frame numbers (PCAP) or hash + config line + log excerpt (other artifacts) — works for Web, API, Android, Network, AD, Cloud, AI.</li>
            </ul>

          </div>
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
