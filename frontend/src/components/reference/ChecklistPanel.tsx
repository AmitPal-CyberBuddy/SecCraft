import { LearningProgress } from '@/components/learning/LearningProgress'
import { useEffect, useMemo, useState } from 'react'
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
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-[var(--learning)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[var(--ink-primary)]">Wireless PT master checklist</h3>
              <p className="mt-1 text-[12px] text-[var(--ink-secondary)] leading-relaxed">
                Scope → reconnaissance → authentication → management frames → rogue infrastructure → segmentation →
                enterprise → evidence → reporting. Each item names the evidence it requires; tick items only when
                the evidence exists.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[20px] font-bold font-mono text-[var(--ink-primary)] leading-none">{totals.completed}/{totals.all}</div>
              <div className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">{totals.pct}% complete</div>
            </div>
            <button onClick={reset} title="Reset checklist"
              className="w-9 h-9 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} title="Print / save as PDF"
              className="w-9 h-9 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] overflow-hidden">
          <LearningProgress value={totals.pct} label="Local checklist completion" />
        </div>
      </div>

      {groups.map(g => {
        const items = g.items
        const completed = items.filter(i => done[i.id]).length
        const isCollapsed = collapsed[g.group]
        return (
          <div key={g.group} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
            <button
              onClick={() => setCollapsed(c => ({ ...c, [g.group]: !c[g.group] }))}
              className="w-full flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--panel-raised)] transition-colors text-left"
            >
              <span className="text-[13px] font-semibold text-[var(--ink-primary)]">{g.group}</span>
              <span className="flex items-center gap-2.5 shrink-0">
                <span className={`text-[10.5px] font-mono ${completed === items.length ? 'text-[var(--success)]' : 'text-[var(--ink-muted)]'}`}>{completed}/{items.length}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--ink-muted)] sc-disclosure-cue ${isCollapsed ? '' : 'rotate-180'}`} />
              </span>
            </button>
            {!isCollapsed && (
              <div className="border-t border-[var(--line-normal)] divide-y divide-[var(--line-normal)]">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-[var(--panel-raised)] transition-colors"
                  >
                    {done[item.id]
                      ? <CheckSquare className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                      : <Square className="w-4 h-4 text-[var(--ink-secondary)] shrink-0 mt-0.5" />}
                    <span className="min-w-0">
                      <span className={`block text-[12.5px] leading-relaxed ${done[item.id] ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink-primary)]'}`}>{item.text}</span>
                      <span className="mt-1 block text-[11px] font-mono text-[var(--ink-muted)]">evidence: {item.evidence}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] font-mono text-[var(--ink-secondary)]">{item.id}</span>
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
