import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckSquare, Square, ClipboardList, RotateCcw, Printer, ChevronDown } from 'lucide-react'
import checklist from '@/content/reference/checklist.json'

interface ChecklistItem { id: string; text: string; evidence: string }
interface ChecklistGroup { group: string; items: ChecklistItem[] }

/**
 * Wireless PT master checklist — the same 42 items a professional works through, with the evidence each
 * item demands. Progress is stored locally per engagement so a learner can hand in a completed checklist.
 */
export function ChecklistPanel({ engagementId = 'general', className = '' }: { engagementId?: string; className?: string }) {
  const groups = checklist as ChecklistGroup[]
  const STORE_KEY = `platform-checklist-${engagementId}`
  const LEGACY_STORE_KEY = `wififorge-checklist-${engagementId}`
  const storeKey = STORE_KEY
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_STORE_KEY)
      if (raw) setDone(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [storeKey])

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(done)); try { localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(done)) } catch {} } catch { /* ignore */ }
  }, [done, storeKey])

  const totals = useMemo(() => {
    const all = groups.flatMap(g => g.items)
    const completed = all.filter(i => done[i.id]).length
    return { completed, all: all.length, pct: all.length ? Math.round((completed / all.length) * 100) : 0 }
  }, [groups, done])

  function toggle(id: string) { setDone(d => ({ ...d, [id]: !d[id] })) }
  function reset() { if (confirm('Clear the checklist for this engagement?')) setDone({}) }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-slate-100">Wireless PT master checklist</h3>
              <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
                Scope → reconnaissance → authentication → management frames → rogue infrastructure → segmentation →
                enterprise → evidence → reporting. Each item names the evidence it requires; tick items only when
                the evidence exists.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[20px] font-bold font-mono text-slate-100 leading-none">{totals.completed}/{totals.all}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">{totals.pct}% complete</div>
            </div>
            <button onClick={reset} title="Reset checklist"
              className="w-9 h-9 rounded-xl bg-[#020617]/60 border border-[#1e293b] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} title="Print / save as PDF"
              className="w-9 h-9 rounded-xl bg-[#020617]/60 border border-[#1e293b] flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#020617] border border-[#1e293b]/60 overflow-hidden">
          <motion.div animate={{ width: `${totals.pct}%` }} transition={{ duration: 0.5 }} className="h-full bg-gradient-to-r from-cyan-400 to-violet-400" />
        </div>
      </div>

      {groups.map(g => {
        const items = g.items
        const completed = items.filter(i => done[i.id]).length
        const isCollapsed = collapsed[g.group]
        return (
          <div key={g.group} className="rounded-2xl bg-[#0f172a] border border-[#1e293b] overflow-hidden">
            <button
              onClick={() => setCollapsed(c => ({ ...c, [g.group]: !c[g.group] }))}
              className="w-full flex items-center justify-between gap-3 p-3.5 hover:bg-[#131f36] transition-colors text-left"
            >
              <span className="text-[13px] font-semibold text-slate-200">{g.group}</span>
              <span className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[10.5px] font-mono ${completed === items.length ? 'text-emerald-400' : 'text-slate-500'}`}>{completed}/{items.length}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
              </span>
            </button>
            {!isCollapsed && (
              <div className="border-t border-[#1e293b] divide-y divide-[#1e293b]/70">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-[#131f36]/60 transition-colors"
                  >
                    {done[item.id]
                      ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] leading-relaxed ${done[item.id] ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.text}</span>
                      <span className="mt-1 block text-[11px] font-mono text-slate-500">evidence: {item.evidence}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] font-mono text-slate-400">{item.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
