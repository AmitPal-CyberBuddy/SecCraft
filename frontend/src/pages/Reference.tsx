import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Filter, Search, ClipboardList, FileText, BookOpen, ChevronRight } from 'lucide-react'
import commands from '@/content/reference/commands.json'
import filters from '@/content/reference/filters.json'
import { ChecklistPanel } from '@/components/reference/ChecklistPanel'

const Flashcards = lazy(() => import('@/components/learning/Flashcards').then(m => ({ default: m.Flashcards })))
const TerminalEmulator = lazy(() => import('@/components/terminal/TerminalEmulator').then(m => ({ default: m.TerminalEmulator })))

interface Command { category: string; command: string; proves: string; notes: string }
interface FilterEntry { filter: string; purpose: string }

type Tab = 'commands' | 'filters' | 'checklist' | 'method' | 'terminal' | 'flashcards'

const TABS: { id: Tab; label: string; icon: typeof Terminal }[] = [
  { id: 'commands', label: `Commands (${(commands as Command[]).length})`, icon: Terminal },
  { id: 'filters', label: `Filters (${(filters as FilterEntry[]).length})`, icon: Filter },
  { id: 'checklist', label: 'Master checklist', icon: ClipboardList },
  { id: 'method', label: 'Method & reporting', icon: FileText },
  { id: 'terminal', label: 'Terminal sandbox', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
]

export function Reference() {
  const [tab, setTab] = useState<Tab>('commands')
  const [query, setQuery] = useState('')

  const cmdGroups = useMemo(() => {
    const q = query.toLowerCase()
    const groups = new Map<string, Command[]>()
    for (const c of commands as Command[]) {
      if (q && !(c.command + c.proves + c.notes + c.category).toLowerCase().includes(q)) continue
      const list = groups.get(c.category) ?? []
      list.push(c)
      groups.set(c.category, list)
    }
    return [...groups.entries()]
  }, [query])

  const filterList = useMemo(() => {
    const q = query.toLowerCase()
    return (filters as FilterEntry[]).filter(f => !q || (f.filter + f.purpose).toLowerCase().includes(q))
  }, [query])

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 md:space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-[24px] md:text-[28px] text-slate-100 tracking-tight leading-none">Reference</h1>
            <p className="mt-2 max-w-[760px] text-[12.5px] text-slate-400 leading-relaxed">
              Commands and filters are organised by <strong className="text-slate-200">what they prove</strong>, not by
              what they do. Memorising flags is not the skill — choosing the test that falsifies a hypothesis is.
              Field names are Wireshark 3.x/4.x (<span className="font-mono text-slate-300">wlan.*</span>); the
              pre-2.0 <span className="font-mono line-through text-slate-500">wlan_mgt.*</span> namespace is gone.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] border transition-colors ${
                tab === t.id ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-[#020617]/50 border-[#1e293b] text-slate-400 hover:border-[#334155]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {(tab === 'commands' || tab === 'filters') && (
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'commands' ? 'Search commands, e.g. PMKID, RADIUS, deauth, retest…' : 'Search filters, e.g. rsn, eapol, mfpr…'}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#020617]/70 border border-[#1e293b] text-[12.5px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
        )}
      </motion.div>

      {tab === 'commands' && (
        <div className="space-y-4">
          {cmdGroups.map(([category, list]) => (
            <motion.div key={category} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b] text-[11px] font-mono uppercase tracking-widest text-cyan-400">{category}</div>
              <div className="divide-y divide-[#1e293b]/70">
                {list.map(c => (
                  <div key={c.command} className="p-4">
                    <code className="text-[12px] font-mono text-emerald-300 break-all">{c.command}</code>
                    <p className="mt-2 text-[12px] text-slate-300 leading-relaxed">
                      <span className="text-slate-500 font-mono text-[10.5px] uppercase tracking-widest mr-2">proves</span>
                      {c.proves}
                    </p>
                    {c.notes && <p className="mt-1.5 text-[11.5px] text-slate-500 leading-relaxed">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
          {!cmdGroups.length && <EmptyState />}
        </div>
      )}

      {tab === 'filters' && (
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden">
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
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4">
            <h3 className="text-[13.5px] font-semibold text-slate-100">The loop that replaces command memorisation</h3>
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
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4">
            <h3 className="text-[13.5px] font-semibold text-slate-100">Reporting & severity rules</h3>
            <ul className="mt-3 space-y-2.5 text-[12.5px] text-slate-300 leading-relaxed">
              <li>• A technique has no CVSS score. A finding does — derived from exploitability, impact, scope and this environment.</li>
              <li>• Quote CVSS as an <span className="font-mono">example vector</span> with each metric justified from your evidence.</li>
              <li>• Severity language must survive the sentence "in an environment where…" — if it collapses, the score was a guess.</li>
              <li>• Retest = repeat the original test with the same method and compare extractions; a config change alone is not proof.</li>
              <li>• Negative results and untested areas belong in the report; they define the coverage you are claiming.</li>
            </ul>
            <div className="mt-4 text-[11.5px] text-slate-500 font-mono space-y-1.5">
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/VAPT_METHODOLOGY.md</div>
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/WIRELESS_VAPT_CHECKLIST.md</div>
              <div className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" /> docs/SIMULATION_VS_HARDWARE.md</div>
            </div>
          </motion.div>
        </div>
      )}

      {tab === 'terminal' && (
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading terminal…</div>}>
          <TerminalEmulator />
        </Suspense>
      )}

      {tab === 'flashcards' && (
        <Suspense fallback={<div className="p-8 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-[13px] text-slate-500 font-mono">Loading flashcards…</div>}>
          <Flashcards />
        </Suspense>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#334155]/60 p-8 text-center">
      <p className="text-[12.5px] text-slate-500">Nothing matches that search.</p>
    </div>
  )
}
