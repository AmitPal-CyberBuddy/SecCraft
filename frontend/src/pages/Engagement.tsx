import { ViewSwitcher } from '@/components/common/Controls'
import { ScrollRegion } from '@/components/common/TechnicalContent'
import { updateQuery } from '@/lib/learningNavigation'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Briefcase, ShieldCheck, Scale, Target, FileArchive, ListChecks, Award, AlertTriangle,
  ChevronDown, FlaskConical, ClipboardCheck, BookOpen, ExternalLink, ArrowLeft, Map as MapIcon, Clock, Layers
} from 'lucide-react'
import engagements from '@/content/engagements.json'
import artifacts from '@/content/lab-artifacts.json'
import learningPaths from '@/content/learning-paths.json'
import platform from '@/content/platform.json'
import { TierBadge, TierLegend, HarwareModeNote } from '@/components/common/TierBadge'
import { ChecklistPanel } from '@/components/reference/ChecklistPanel'
import { DecisionPractice, getScenariosForModule } from '@/components/learning/DecisionPractice'
import { useProgressStore } from '@/store/useProgressStore'

interface Engagement {
  id: string
  learningPathId?: string
  name: string
  subtitle: string
  tier: string
  time_estimate: string
  summary: string
  client_background: string[]
  objectives: string[]
  scope: { in_scope: string[]; out_of_scope: string[]; prohibited: string[]; windows: string }
  roe_clauses: string[]
  targets: { ssid: string; band: string; documented_security: string; purpose: string }[]
  provided_artefacts: { item: string; note: string }[]
  deliverables: string[]
  tasks: { id: string; title: string; detail: string; output: string }[]
  marking_guide: { criterion: string; weight: string; looks_like: string }[]
  notes: string[]
  companion_assets: { label: string; path: string }[]
}

const SECTIONS = [
  { id: 'brief', label: 'Client brief', icon: Briefcase },
  { id: 'scope', label: 'Scope & RoE', icon: Scale },
  { id: 'targets', label: 'Targets & artefacts', icon: Target },
  { id: 'tasks', label: 'Your tasks', icon: ClipboardCheck },
  { id: 'checklist', label: 'Master checklist', icon: ListChecks },
  { id: 'reasoning', label: 'Decision practice', icon: BookOpen },
  { id: 'grading', label: 'Marking guide', icon: Award },
]

function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: typeof Briefcase; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-[var(--panel-raised)] transition-colors text-left">
        <span className="flex items-center gap-2.5 text-base font-semibold text-[var(--ink-primary)]">
          <Icon className="w-4 h-4 text-[var(--learning)]" /> {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--ink-muted)] sc-disclosure-cue ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} hidden={!open} className="px-4 pb-4 border-t border-[var(--line-normal)] pt-4">{children}</div>
    </div>
  )
}

function Bullets({ items, tone = 'slate' }: { items: string[]; tone?: 'slate' | 'emerald' | 'rose' | 'amber' }) {
  const colors = { slate: 'text-[var(--ink-secondary)]', emerald: 'text-[var(--success)]', rose: 'text-[var(--danger)]', amber: 'text-[var(--attention)]' }
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className={`flex items-start gap-2 text-sm leading-relaxed ${colors[tone]}`}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current  shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

export function Engagement() {
  const { id, pathId } = useParams<{ id?: string; pathId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPathIdStore = useProgressStore(s => s.currentLearningPathId) || 'wireless-pentesting'
  const queryPath = searchParams.get('path') || pathId
  const effectivePathId = queryPath || currentPathIdStore || 'wireless-pentesting'
  const currentPath = learningPaths.find(p => p.id === effectivePathId) || learningPaths[0]

  const list = (engagements as { engagements: Engagement[] }).engagements
  const filteredList = useMemo(() => {
    if (queryPath || pathId) {
      return list.filter(e => (e as any).learningPathId === effectivePathId || (!(e as any).learningPathId && effectivePathId === 'wireless-pentesting'))
    }
    return list
  }, [effectivePathId, queryPath, pathId, list])

  const engagement = id ? filteredList.find(e => e.id.toLowerCase() === id.toLowerCase()) : (filteredList.length === 1 ? filteredList[0] : undefined)
  const section = SECTIONS.some(item => item.id === searchParams.get('section')) ? searchParams.get('section')! : 'brief'
  const setSection = (value: string) => setSearchParams(previous => updateQuery(previous, { section: value === 'brief' ? null : value }))
  const sectionRef = useRef<HTMLElement>(null)
  const previousSection = useRef(section)
  useEffect(() => {
    if (previousSection.current === section) return
    previousSection.current = section
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    sectionRef.current?.focus({ preventScroll: true })
  }, [section])

  const artList = useMemo(() => {
    const a = (artifacts as { artifacts: Record<string, { group: string; frames: number; bytes: number; path: string; sha256: string; real: string; synthetic: string }> }).artifacts
    return Object.entries(a).map(([pid, meta]) => ({ pid, ...meta }))
  }, [])

  // List view when no id and multiple engagements
  if (!id && filteredList.length !== 1) {
    return (
      <div className="ws-legacy max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] transition-colors px-3 py-2 rounded-xl hover:bg-[var(--panel-bg)] border border-transparent hover:border-[var(--line-normal)]">
            <ArrowLeft className="w-4 h-4" />
            {currentPath.title} — Path Detail
          </Link>
          <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[var(--ink-secondary)] font-mono flex items-center gap-1.5">
            <MapIcon className="w-3 h-3" /> {currentPath.icon} {currentPath.title} • {filteredList.length} assessments • Local self-review
          </span>
        </div>

        <div className="relative rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-6 overflow-hidden">

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-bg)] to-[var(--owner-bg)] border border-[var(--accent-border)] flex items-center justify-center">
                <Target className="w-5 h-5 text-[var(--learning)]" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-[24px] md:text-[28px] text-[var(--ink-primary)] tracking-tight leading-none flex items-center gap-2 sc-page-title">
                  Assessments / Engagements <span className="text-[18px]">{currentPath.icon}</span>
                </h1>
                <p className="text-[13px] text-[var(--ink-secondary)] mt-1.5">
                  Scoped assessment briefs • local self-review • {filteredList.length} available in this catalogue
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
              <div className="text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-widest mb-1">Assessment Workflow — Generic VAPT</div>
              <div className="text-[12px] font-mono text-[var(--ink-secondary)] leading-relaxed">{platform.philosophy}</div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-2">Use the supplied brief to work through scope, rules, evidence, tasks and reporting. Other domains appear only when an authored engagement is available. There is no independent grader.</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map(e => {
            const pathForEng = learningPaths.find(p => p.id === (e as any).learningPathId) || currentPath
            return (
              <Link key={e.id} to={`/engagement/${e.id}?path=${(e as any).learningPathId || effectivePathId}`} className="group rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 hover:border-[var(--line-strong)] hover:bg-[var(--panel-raised)] sc-surface-transition block">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{e.id}</span>
                  <TierBadge tier={e.tier} size="xs" />
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{e.time_estimate}</span>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)]">{pathForEng.icon} {pathForEng.shortTitle}</span>
                </div>
                <h3 className="mt-3 text-[16px] font-bold text-[var(--ink-primary)] group-hover:text-[var(--ink-primary)] transition-colors">{e.name}</h3>
                <p className="text-[12px] text-[var(--ink-secondary)] mt-1">{e.subtitle}</p>
                <p className="text-[12px] text-[var(--ink-muted)] mt-2 line-clamp-3 leading-relaxed">{e.summary}</p>
                <div className="mt-4 flex items-center gap-2 text-[12px] text-[var(--learning)] font-medium group-hover:gap-3 sc-surface-transition">
                  Enter assessment <ExternalLink className="w-4 h-4" />
                </div>
              </Link>
            )
          })}
        </div>

        {filteredList.length === 0 && (
          <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-[var(--ink-muted)]" />
            </div>
            <div className="text-[14px] font-semibold text-[var(--ink-primary)]">No assessments for {currentPath.title} yet</div>
            <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-[600px] mx-auto leading-relaxed">
              Architecture is ready — same assessment engine will be reused. Wireless ENG-01 is reference implementation.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-[var(--owner)]" />
            <span className="text-[12px] font-semibold text-[var(--ink-primary)]">Planned Expansion</span>
          </div>
          <div className="text-[12px] text-[var(--ink-muted)] leading-relaxed">
            Future engagements: ENG-02 Web Application Security (planned), ENG-03 API Security (planned), ENG-04 Android (planned), etc.
            Each will reuse same structure: scope, RoE, targets, artefacts, tasks, marking guide, evidence standard, reporting, retest.
            One excellent path first — Wireless Pentesting ENG-01 (6-10h, 4 SSIDs, RADIUS review, 8 tasks) is mature reference.
          </div>
        </div>
      </div>
    )
  }

  if (!engagement) {
    return (
      <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-8 text-center max-w-[800px] mx-auto">
        <p className="text-[var(--ink-secondary)]">Unknown engagement {id}. Available: {filteredList.map(e => e.id).join(', ') || 'none for this path'}</p>
        <Link to={`/engagement?path=${effectivePathId}`} className="mt-4 inline-block text-[12px] font-mono text-[var(--learning)]">← back to assessments for {currentPath.title}</Link>
      </div>
    )
  }

  const reasoning = getScenariosForModule('20-final-assessment')

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Path-aware breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/paths/${effectivePathId}`} className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] transition-colors px-3 py-2 rounded-xl hover:bg-[var(--panel-bg)] border border-transparent hover:border-[var(--line-normal)]">
          <ArrowLeft className="w-4 h-4" />
          {currentPath.title}
        </Link>
        <Link to={`/engagement?path=${effectivePathId}`} className="text-[11px] px-2 py-1 rounded-full bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[var(--ink-secondary)] font-mono hover:border-[var(--line-strong)] transition-colors">Assessments • {currentPath.shortTitle}</Link>
        <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)] font-mono">{currentPath.icon} {currentPath.title} • {engagement.id}</span>
      </div>

      {/* Header */}
      <div className="assessment-dossier-header relative rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-5 sm:p-6 overflow-hidden">

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{engagement.id}</span>
            <TierBadge tier={engagement.tier} />
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-secondary)]">{engagement.time_estimate}</span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)]">{currentPath.icon} {currentPath.title} • {currentPath.id}</span>
          </div>
          <h1 className="mt-3 text-[24px] sm:text-[28px] font-heading font-bold text-[var(--ink-primary)] leading-tight sc-page-title">{engagement.name}</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">{engagement.subtitle} • Local self-review assessment engine • {platform.tagline}</p>
          <p className="mt-3 max-w-[820px] text-sm text-[var(--ink-secondary)] leading-relaxed">{engagement.summary}</p>
          <div className="assessment-section-nav mt-5" aria-label="Assessment workpapers">
            <div className="assessment-section-meta"><span>ENGAGEMENT WORKPAPERS</span><span>{String(SECTIONS.findIndex(s => s.id === section) + 1).padStart(2, '0')} <i>/</i> {String(SECTIONS.length).padStart(2, '0')}</span></div>
            <ViewSwitcher label="Assessment sections" value={section} onChange={setSection} options={SECTIONS.map((item, index) => ({ id: item.id, label: `${index + 1}. ${item.label}`, icon: <item.icon size={16} /> }))} />
          </div>
        </div>
      </div>

      <section ref={sectionRef} tabIndex={-1} className="ws-assessment-content" aria-label={SECTIONS.find(item => item.id === section)?.label}>
      {section === 'brief' && (
        <div className="space-y-4">
          <Section title="Client background" icon={Briefcase}>
            <Bullets items={engagement.client_background} />
            <div className="mt-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3.5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] mb-2">Objectives (as the client stated them)</div>
              <Bullets items={engagement.objectives} tone="emerald" />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5">
              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--attention)] mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Read before you start
              </div>
              <Bullets items={engagement.notes} tone="amber" />
            </div>
          </Section>
          <Section title="How this assessment works — platform-level" icon={BookOpen}>
            <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
              You are given artefacts, not answers. The package contains at least one <strong className="text-[var(--ink-primary)]">red herring</strong> (a
              configuration that looks severe but is not reachable in this environment) and at least one SSID with
              <strong className="text-[var(--ink-primary)]"> no exploitable weakness</strong> — documenting a control that held is part of the grade.
              Nothing about the vulnerabilities is disclosed anywhere in the pack. Same workflow for any path: {platform.philosophy}
            </p>
            <div className="mt-4">
              <TierLegend />
            </div>
            <HarwareModeNote className="mt-3" />
          </Section>
        </div>
      )}

      {section === 'scope' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="In scope" icon={ShieldCheck}>
              <Bullets items={engagement.scope.in_scope} tone="emerald" />
            </Section>
            <Section title="Out of scope" icon={AlertTriangle}>
              <Bullets items={engagement.scope.out_of_scope} tone="amber" />
            </Section>
          </div>
          <Section title="Prohibited techniques" icon={AlertTriangle}>
            <Bullets items={engagement.scope.prohibited} tone="rose" />
            <p className="mt-3 text-[12px] text-[var(--ink-secondary)] leading-relaxed">Testing windows: {engagement.scope.windows}</p>
          </Section>
          <Section title="Rules of engagement (extract)" icon={Scale}>
            <Bullets items={engagement.roe_clauses} />
            <p className="mt-4 text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
              The full template lives in <Link to="/reference" className="text-[var(--learning)] font-mono">Reference → Methodology</Link> and
              <span className="font-mono"> docs/VAPT_METHODOLOGY.md</span>. Expanding these clauses into a test plan is task T2.
            </p>
          </Section>
        </div>
      )}

      {section === 'targets' && (
        <div className="space-y-4">
          <Section title="Target information" icon={Target}>
            <ScrollRegion label="Assessment reference table — scroll horizontally for more columns">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)]">
                    <th className="py-2 pr-4">SSID</th><th className="py-2 pr-4">Band</th><th className="py-2 pr-4">Documented security</th><th className="py-2">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line-normal)]">
                  {engagement.targets.map(t => (
                    <tr key={t.ssid}>
                      <td className="py-2.5 pr-4 font-mono text-[var(--ink-primary)]">{t.ssid}</td>
                      <td className="py-2.5 pr-4 text-[var(--ink-secondary)]">{t.band}</td>
                      <td className="py-2.5 pr-4 text-[var(--ink-secondary)]">{t.documented_security}</td>
                      <td className="py-2.5 text-[var(--ink-secondary)]">{t.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
            <p className="mt-3 text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
              The "documented" column is the client's claim. Whether reality matches it is something you determine
              from the artefacts — not something this table tells you.
            </p>
          </Section>

          <Section title="Provided artefacts" icon={FileArchive}>
            <Bullets items={engagement.provided_artefacts.map(a => `${a.item} — ${a.note}`)} />
          </Section>

          <Section title="Artefact bundle (verified captures) — platform generic" icon={FlaskConical}>
            <p className="text-[12px] text-[var(--ink-secondary)] leading-relaxed mb-3">
              All {artList.length} captures are generated with real radiotap/802.11 structure and verified by
              <span className="font-mono"> scripts/verify-lab-artifacts.py</span>. Open one in the inspector to
              analyse it; hashes are the values recorded in <span className="font-mono">MANIFEST.md</span>. Generic engine will support HTTP, APK, logs, IAM, Terraform for future paths.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {artList.map(a => (
                <Link
                  key={a.pid}
                  to={`/labs?pcap=${a.pid}&path=${effectivePathId}`}
                  className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3 hover:border-[var(--accent-border)] transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-mono text-[var(--ink-primary)] truncate">{a.pid}</span>
                    <ExternalLink className="w-3 h-3 text-[var(--ink-secondary)] group-hover:text-[var(--learning)] shrink-0" />
                  </div>
                  <div className="mt-1.5 text-[10.5px] font-mono text-[var(--ink-muted)]">{a.frames} frames • {a.bytes} B</div>
                  <div className="mt-1 text-[10px] text-[var(--ink-secondary)] truncate">{a.sha256.slice(0, 16)}…</div>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}

      {section === 'tasks' && (
        <div className="space-y-3">
          {engagement.tasks.map(t => (
            <div key={t.id} className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--learning)]">{t.id}</span>
                <h3 className="text-base font-semibold text-[var(--ink-primary)]">{t.title}</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-secondary)] leading-relaxed">{t.detail}</p>
              <p className="mt-2 text-[11.5px] font-mono text-[var(--ink-muted)]">output: {t.output}</p>
            </div>
          ))}
          <Section title="Deliverables" icon={ClipboardCheck}>
            <Bullets items={engagement.deliverables} tone="emerald" />
          </Section>
        </div>
      )}

      {section === 'checklist' && <ChecklistPanel engagementId={engagement.id} />}

      {section === 'reasoning' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4">
            <h3 className="text-base font-semibold text-[var(--ink-primary)]">Decision practice for the final engagement — {currentPath.title}</h3>
            <p className="mt-1 text-[12px] text-[var(--ink-secondary)] leading-relaxed">
              The same loop runs through the whole academy: <span className="font-mono text-[var(--ink-secondary)]">Observe → Interpret →
              Hypothesise → Choose the test → Execute → Evidence → Conclude</span>. Work these before writing the report. Platform philosophy: {platform.tagline}
            </p>
          </div>
          <DecisionPractice scenarioIds={reasoning.map(s => s.id)} />
        </div>
      )}

      {section === 'grading' && (
        <Section title="Marking guide — platform generic" icon={Award}>
          <ScrollRegion label="Assessment reference table — scroll horizontally for more columns">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)]">
                  <th className="py-2 pr-4">Criterion</th><th className="py-2 pr-4">Weight</th><th className="py-2">What "professional" looks like</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-normal)]">
                {engagement.marking_guide.map(m => (
                  <tr key={m.criterion}>
                    <td className="py-2.5 pr-4 text-[var(--ink-primary)]">{m.criterion}</td>
                    <td className="py-2.5 pr-4 font-mono text-[var(--learning)]">{m.weight}</td>
                    <td className="py-2.5 text-[var(--ink-secondary)]">{m.looks_like}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {engagement.companion_assets.map(a => (
              <div key={a.label} className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-3">
                <div className="text-[12px] text-[var(--ink-primary)]">{a.label}</div>
                <div className="mt-1 text-[10.5px] font-mono text-[var(--ink-muted)] break-all">{a.path}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
      </section>
      <nav className="ws-step-navigation" aria-label="Assessment section navigation">
        <button type="button" className="ws-action ws-action-secondary" disabled={section === SECTIONS[0].id} onClick={() => setSection(SECTIONS[Math.max(0, SECTIONS.findIndex(item => item.id === section) - 1)].id)}>Previous section</button>
        <span className="ws-muted">Section {SECTIONS.findIndex(item => item.id === section) + 1} of {SECTIONS.length} · not a completion grade</span>
        <button type="button" className="ws-action" disabled={section === SECTIONS[SECTIONS.length - 1].id} onClick={() => setSection(SECTIONS[Math.min(SECTIONS.length - 1, SECTIONS.findIndex(item => item.id === section) + 1)].id)}>Next section</button>
      </nav>
    </div>
  )
}
