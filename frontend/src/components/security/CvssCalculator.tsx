import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Calculator, Info, ShieldCheck, Target } from 'lucide-react'

/**
 * CVSS 3.1 base-score calculator (specification-accurate).
 *
 * The point of this component is not to produce a number — it is to make the learner justify each metric
 * from their own findings. Wireless-specific guidance:
 *  - AV:A is correct for RF-proximity attacks (adjacent network), NOT AV:N.
 *  - S:C when the attack crosses a security boundary (guest VLAN → internal network).
 *  - PR: from the attacker's position before the attack (a rogue AP is PR:N; a misconfigured client is PR:N).
 *  - UI:N only when the client acts without user involvement (auto-connect); UI:R when a user must join.
 */

const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }
const AC: Record<string, number> = { L: 0.77, H: 0.44 }
const PR_U: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 }
const PR_C: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 }
const UI: Record<string, number> = { N: 0.85, R: 0.62 }
const CIA: Record<string, number> = { H: 0.56, L: 0.22, N: 0 }

function roundUp(value: number): number {
  // CVSS 3.1 Roundup: round up to one decimal place, using integer arithmetic on tenths.
  const int = Math.round(value * 100000)
  if (int % 10000 === 0) return int / 100000
  return (Math.floor(int / 10000) + 1) / 10
}

function severityOf(score: number) {
  if (score === 0) return { label: 'None', color: 'text-slate-400', border: 'border-slate-500/25', bg: 'bg-slate-500/10' }
  if (score < 4) return { label: 'Low', color: 'text-emerald-400', border: 'border-emerald-500/25', bg: 'bg-emerald-500/10' }
  if (score < 7) return { label: 'Medium', color: 'text-amber-400', border: 'border-amber-500/25', bg: 'bg-amber-500/10' }
  if (score < 9) return { label: 'High', color: 'text-orange-400', border: 'border-orange-500/25', bg: 'bg-orange-500/10' }
  return { label: 'Critical', color: 'text-rose-400', border: 'border-rose-500/25', bg: 'bg-rose-500/10' }
}

const METRIC_HELP: Record<string, string> = {
  AV: 'Attack vector. A = adjacent network (RF proximity) — this is the normal wireless answer. N = network (a RADIUS server reachable remotely). P = physical (attacker must reach a locked comms room).',
  AC: 'Attack complexity. H only when the attacker must win an unlikely race or bypass anti-clogging/rate limits in an uncontrolled way.',
  PR: 'Privileges required, measured before the attack. Rogue infrastructure and misconfigured clients are PR:N; abusing an existing authenticated session is PR:L.',
  UI: 'User interaction. N when the client acts automatically (auto-connect, PMKID caching). R when a human must join, click or approve.',
  S: 'Scope. C when the compromise crosses a security boundary (guest VLAN → corporate network, client → wired LAN).',
  C: 'Confidentiality. Rate what was actually demonstrated: traffic decryption for users of the same BSS is a real C impact; guessing a PSK on an isolated VLAN is not automatically High.',
  I: 'Integrity. Modifying traffic or injecting frames you can prove is a real impact; mere association is not.',
  A: 'Availability. Deauth/DoS: rate the demonstrated outage, its duration and the affected population.',
}

function MetricRow({
  code,
  value,
  options,
  onChange,
}: {
  code: string
  value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono font-semibold text-slate-300 w-8">{code}</span>
        <div className="flex flex-wrap gap-1.5">
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                value === o.id
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  : 'bg-[#020617]/60 border-[#1e293b] text-slate-400 hover:border-[#334155]'
              }`}
              title={o.label}
            >
              {o.id}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed pl-10">{METRIC_HELP[code]}</p>
    </div>
  )
}

export function CvssCalculator({ className = '' }: { className?: string }) {
  const [m, setM] = useState<Record<string, string>>({
    AV: 'A', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'N', A: 'N',
  })
  const [context, setContext] = useState('')

  const { score, vector, impact, exploitability, severity } = useMemo(() => {
    const iss = 1 - (1 - CIA[m.C]) * (1 - CIA[m.I]) * (1 - CIA[m.A])
    const changed = m.S === 'C'
    const impactScore = changed
      ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
      : 6.42 * iss
    const pr = changed ? PR_C[m.PR] : PR_U[m.PR]
    const exploitability = 8.22 * AV[m.AV] * AC[m.AC] * pr * UI[m.UI]
    let base = 0
    if (impactScore > 0) {
      base = roundUp(Math.min(changed ? 1.08 * (impactScore + exploitability) : impactScore + exploitability, 10))
    }
    const v = `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`
    return { score: base, vector: v, impact: impactScore, exploitability, severity: severityOf(base) }
  }, [m])

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-slate-100">CVSS 3.1 base score — a calculation, not a label</h3>
            <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">
              A technique does not have a CVSS score. Only a finding does — with this environment's
              exploitability, impact and scope. Rate each metric from evidence, write the justification, and
              label the result as an <span className="font-mono text-slate-300">example vector</span> derived from the stated assumptions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 sm:p-5 space-y-4">
          <MetricRow code="AV" value={m.AV} onChange={v => setM(s => ({ ...s, AV: v }))}
            options={[{ id: 'N', label: 'Network' }, { id: 'A', label: 'Adjacent (RF)' }, { id: 'L', label: 'Local' }, { id: 'P', label: 'Physical' }]} />
          <MetricRow code="AC" value={m.AC} onChange={v => setM(s => ({ ...s, AC: v }))}
            options={[{ id: 'L', label: 'Low' }, { id: 'H', label: 'High' }]} />
          <MetricRow code="PR" value={m.PR} onChange={v => setM(s => ({ ...s, PR: v }))}
            options={[{ id: 'N', label: 'None' }, { id: 'L', label: 'Low' }, { id: 'H', label: 'High' }]} />
          <MetricRow code="UI" value={m.UI} onChange={v => setM(s => ({ ...s, UI: v }))}
            options={[{ id: 'N', label: 'None' }, { id: 'R', label: 'Required' }]} />
          <MetricRow code="S" value={m.S} onChange={v => setM(s => ({ ...s, S: v }))}
            options={[{ id: 'U', label: 'Unchanged' }, { id: 'C', label: 'Changed' }]} />
          <MetricRow code="C" value={m.C} onChange={v => setM(s => ({ ...s, C: v }))}
            options={[{ id: 'H', label: 'High' }, { id: 'L', label: 'Low' }, { id: 'N', label: 'None' }]} />
          <MetricRow code="I" value={m.I} onChange={v => setM(s => ({ ...s, I: v }))}
            options={[{ id: 'H', label: 'High' }, { id: 'L', label: 'Low' }, { id: 'N', label: 'None' }]} />
          <MetricRow code="A" value={m.A} onChange={v => setM(s => ({ ...s, A: v }))}
            options={[{ id: 'H', label: 'High' }, { id: 'L', label: 'Low' }, { id: 'N', label: 'None' }]} />

          <div className="pt-3 border-t border-[#1e293b]">
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Justify each metric (this text belongs in the report)
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={4}
              placeholder={'e.g. AV:A — attacker within RF range of the store front; AC:L — one unauthorised deauth and the client auto-reconnects to the twin; S:C — guest VLAN reaches the server VLAN (demonstrated); A:N — availability not tested.'}
              className="mt-2 w-full rounded-xl bg-[#020617]/60 border border-[#1e293b] p-3 text-[12px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-3">
          <motion.div
            layout
            className={`rounded-2xl border ${severity.border} ${severity.bg} p-5 text-center`}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Example base score</div>
            <div className={`mt-2 text-[40px] font-bold font-mono leading-none ${severity.color}`}>{score.toFixed(1)}</div>
            <div className={`mt-2 text-[12px] font-semibold uppercase tracking-widest ${severity.color}`}>{severity.label}</div>
            <div className="mt-3 text-[10.5px] font-mono text-slate-400 break-all">{vector}</div>
          </motion.div>

          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Target className="w-3.5 h-3.5 text-cyan-400" /> Impact sub-score: <span className="text-slate-200">{impact.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" /> Exploitability sub-score: <span className="text-slate-200">{exploitability.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scope changes affect both the impact and the privilege-required weights (CVSS 3.1 §7.1). Compare with
              the client's own scoring conventions before quoting a number, and never quote a score without the
              environment assumptions behind it.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Do not do this
            </div>
            <ul className="text-[11.5px] text-slate-400 leading-relaxed space-y-1.5 list-disc pl-4">
              <li>"WPS enabled = 7.4" — the score depends on whether the PIN is reachable, locked out, and what the PSK grants.</li>
              <li>"WEP = 7.5" — RC4/IV reuse is a certainty, but impact depends on the segment's isolation and data value.</li>
              <li>Copying the CVSS of a CVE onto a configuration finding.</li>
            </ul>
            <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              When the environment is unknown, state the assumption and give a range with the reasoning — that is
              more useful than a false-precision number.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
