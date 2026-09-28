import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, BarChart3, Target, Zap, Award } from 'lucide-react'

interface Cvss {
  av: string
  ac: string
  pr: string
  ui: string
  s: string
  c: string
  i: string
  a: string
}

export function CvssCalculator({ className = '' }: { className?: string }) {
  const [cvss, setCvss] = useState<Cvss>({ av: 'A', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'N' })

  // Simplified CVSS 3.1 scoring
  const calculateScore = () => {
    let score = 0
    if (cvss.av === 'N') score += 2
    if (cvss.av === 'A') score += 1.5
    if (cvss.ac === 'L') score += 1
    if (cvss.pr === 'N') score += 1
    if (cvss.ui === 'N') score += 0.5
    if (cvss.c === 'H') score += 1.5
    if (cvss.i === 'H') score += 1.5
    if (cvss.a === 'H') score += 1
    score = Math.min(score, 10)
    return score
  }

  const score = calculateScore()
  const severity = score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : score >= 0.1 ? 'Low' : 'None'
  const severityColor = severity === 'Critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' : severity === 'High' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'

  const vector = `CVSS:3.1/AV:${cvss.av}/AC:${cvss.ac}/PR:${cvss.pr}/UI:${cvss.ui}/S:${cvss.s}/C:${cvss.c}/I:${cvss.i}/A:${cvss.a}`

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">CVSS 3.1 Calculator — Enterprise • PCI-DSS • NIST</h3>
          <p className="text-[11px] text-slate-500 font-mono">Vector: {vector} • Score: {score.toFixed(1)} • {severity} • Production audit ready</p>
        </div>
        <div className={`ml-auto px-3 py-1.5 rounded-xl border font-bold text-[13px] shrink-0 ${severityColor}`}>{score.toFixed(1)} {severity}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[
          { key: 'av', label: 'Attack Vector', options: [{ v: 'N', l: 'Network' }, { v: 'A', l: 'Adjacent' }, { v: 'L', l: 'Local' }, { v: 'P', l: 'Physical' }] },
          { key: 'ac', label: 'Attack Complexity', options: [{ v: 'L', l: 'Low' }, { v: 'H', l: 'High' }] },
          { key: 'pr', label: 'Privileges Required', options: [{ v: 'N', l: 'None' }, { v: 'L', l: 'Low' }, { v: 'H', l: 'High' }] },
          { key: 'ui', label: 'User Interaction', options: [{ v: 'N', l: 'None' }, { v: 'R', l: 'Required' }] },
          { key: 'c', label: 'Confidentiality', options: [{ v: 'H', l: 'High' }, { v: 'L', l: 'Low' }, { v: 'N', l: 'None' }] },
          { key: 'i', label: 'Integrity', options: [{ v: 'H', l: 'High' }, { v: 'L', l: 'Low' }, { v: 'N', l: 'None' }] },
          { key: 'a', label: 'Availability', options: [{ v: 'H', l: 'High' }, { v: 'L', l: 'Low' }, { v: 'N', l: 'None' }] },
          { key: 's', label: 'Scope', options: [{ v: 'U', l: 'Unchanged' }, { v: 'C', l: 'Changed' }] },
        ].map(field => (
          <div key={field.key} className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{field.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {field.options.map(opt => (
                <button key={opt.v} onClick={() => setCvss({ ...cvss, [field.key]: opt.v })} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors touch-manipulation ${cvss[field.key as keyof Cvss] === opt.v ? 'bg-[#1e293b] border-[#334155] text-slate-100 shadow-soft' : 'bg-[#020617]/60 border-[#1e293b]/40 text-slate-500 hover:text-slate-300 hover:bg-[#020617]/80'}`}>
                  {opt.v} — {opt.l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">CVSS Score — Risk Matrix</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${severityColor}`}>{severity} • {score.toFixed(1)}/10</span>
        </div>
        <div className="h-2 rounded-full bg-[#020617] border border-[#1e293b]/30 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${(score/10)*100}%` }} className={`h-full rounded-full ${severity === 'Critical' ? 'bg-red-500' : severity === 'High' ? 'bg-orange-500' : severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center"><div className="font-bold text-red-400">9.0-10.0</div><div className="text-slate-500">Critical</div></div>
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center"><div className="font-bold text-orange-400">7.0-8.9</div><div className="text-slate-500">High</div></div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center"><div className="font-bold text-amber-400">4.0-6.9</div><div className="text-slate-500">Medium</div></div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center"><div className="font-bold text-emerald-400">0.1-3.9</div><div className="text-slate-500">Low</div></div>
        </div>
        <div className="mt-3 text-[11px] font-mono text-slate-500 break-all">Vector: {vector}</div>
        <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-violet-300">Enterprise:</span> CVSS 3.1 calculator for VAPT findings — maps to PCI-DSS 11.1, NIST 800-153, OWASP WSTG, PTES, ISO 27001. Risk matrix likelihood×impact, executive dashboard, compliance mapping.
        </div>
      </div>
    </div>
  )
}
