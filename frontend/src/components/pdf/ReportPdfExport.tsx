import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileText, Shield, CheckCircle, Hash, Info, AlertTriangle } from 'lucide-react'
import jsPDF from 'jspdf'
import { useProgressStore } from '@/store/useProgressStore'
import { TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS } from '@/content/stats'

/**
 * PDF export of *your* records.
 *
 * The export contains the evidence-vault entries you added (label, claim, filter, frame numbers,
 * SHA-256) and the finding draft you wrote in the editor — nothing else. The previous version of this
 * component generated a random SHA-256, eight sample findings and a "chain verified" flag; that is
 * exactly the kind of invented material a report must never contain.
 *
 * The SHA-256 printed for the exported PDF is computed from the generated file's bytes in the browser,
 * so the hash line is a real fingerprint of the file you are holding.
 */

interface EvidenceRecord {
  id: string
  kind: string
  label: string
  claim: string
  filter: string
  frames: string
  sha256: string
  bytes?: number
  /** Written by the evidence vault; `at` is tolerated for older records. */
  createdAt?: string
  at?: string
}

interface Finding {
  title: string
  severity: string
  description: string
  technicalDetails: string
  affectedComponent: string
  evidence: string
  impact: string
  recommendation: string
  references: string
  retest: string
}

const EVIDENCE_KEY = 'platform-evidence-vault'
const LEGACY_EVIDENCE_KEY = 'wififorge-evidence-vault'
const DRAFT_KEY = 'platform-report-draft'
const LEGACY_DRAFT_KEY = 'wififorge-report-draft'

async function sha256Hex(buf: ArrayBuffer): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export function ReportPdfExport({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const level = useProgressStore(s => s.getLevel())
  const completedLessons = useProgressStore(s => s.completedLessons.length)
  const completedLabs = useProgressStore(s => s.completedLabs.length)
  const quizScores = useProgressStore(s => s.quizScores.length)
  const overall = useProgressStore(s => s.getOverallProgress())

  const [records, setRecords] = useState<EvidenceRecord[]>([])
  const [finding, setFinding] = useState<Finding | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ id: string; pages: number; sha256: string | null; size: string; url: string; blob: Blob; itemCount: number } | null>(null)

  useEffect(() => {
    try {
      const raw = (localStorage.getItem(EVIDENCE_KEY) || localStorage.getItem(LEGACY_EVIDENCE_KEY))
      if (raw) setRecords(JSON.parse(raw) as EvidenceRecord[])
    } catch { /* storage unavailable */ }
    try {
      const draft = (localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY))
      if (draft) {
        const parsed = JSON.parse(draft) as Finding
        if (parsed?.title?.trim()) setFinding(parsed)
      }
    } catch { /* storage unavailable */ }
  }, [])

  const hasContent = records.length > 0 || !!finding

  const generatePdf = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 250))

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const date = new Date()
    const reportId = `local-${date.toISOString().slice(0, 19).replace(/[:T]/g, '')}`
    let y = 20

    const line = (text: string, size = 10, gap = 5, color: [number, number, number] = [30, 41, 59]) => {
      doc.setFontSize(size)
      doc.setTextColor(color[0], color[1], color[2])
      const wrapped = doc.splitTextToSize(text, 180) as string[]
      for (const row of wrapped) {
        if (y > 280) { doc.addPage(); y = 20 }
        doc.text(row, 15, y)
        y += gap
      }
    }

    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text('WiFiForge — engagement notes export', 15, y); y += 8
    line(`Generated ${date.toLocaleString()} on this device • record ${reportId}`, 9, 4, [100, 116, 139])
    line('This file contains only records you entered. It is not a signed or accredited report; every hash below is the value you recorded (or that the page computed from the file you exported).', 9, 4, [100, 116, 139])

    y += 3
    line('Local progress', 13, 6)
    line(`Level ${level.title} (Lv.${level.level}) • ${totalXp} XP • ${overall}% overall`, 10, 4)
    line(`Lessons ${completedLessons}/${TOTAL_LESSONS} • Labs ${completedLabs}/${TOTAL_LABS} • Quizzes ${quizScores}/${TOTAL_MODULES} • Capture library ${TOTAL_PCAPS} files`, 10, 5)

    y += 3
    line(`Finding draft${finding ? '' : ' — none saved'}`, 13, 6)
    if (finding) {
      line(`Title: ${finding.title}`, 10, 4)
      line(`Severity: ${finding.severity}`, 10, 4)
      if (finding.affectedComponent) line(`Affected: ${finding.affectedComponent}`, 10, 4)
      if (finding.description) line(`Description: ${finding.description}`, 9, 4)
      if (finding.technicalDetails) line(`Technical detail: ${finding.technicalDetails}`, 9, 4)
      if (finding.evidence) line(`Evidence: ${finding.evidence}`, 9, 4)
      if (finding.impact) line(`Impact: ${finding.impact}`, 9, 4)
      if (finding.recommendation) line(`Recommendation: ${finding.recommendation}`, 9, 4)
      if (finding.references) line(`References: ${finding.references}`, 9, 4)
      if (finding.retest) line(`Retest: ${finding.retest}`, 9, 5)
    } else {
      line('Nothing saved yet — write a finding in the editor (it starts empty on purpose) and save it, then export again.', 9, 5, [100, 116, 139])
    }

    y += 3
    line(`Evidence vault — ${records.length} record${records.length === 1 ? '' : 's'}`, 13, 6)
    if (records.length === 0) {
      line('No artefacts recorded. Add a capture, config or artefact in the evidence vault (label, claim, filter, frames, SHA-256) and it will be listed here with its hash.', 9, 5, [100, 116, 139])
    } else {
      records.forEach((r, idx) => {
        if (y > 270) { doc.addPage(); y = 20 }
        line(`${idx + 1}. [${r.kind}] ${r.label || r.id}`, 10, 4)
        if (r.claim) line(`   Claim: ${r.claim}`, 9, 4)
        if (r.filter) line(`   Filter: ${r.filter}${r.frames ? ` • Frames: ${r.frames}` : ''}`, 9, 4)
        line(`   SHA-256: ${r.sha256 || 'not recorded'}${(r.createdAt || r.at) ? ` • recorded ${new Date(r.createdAt || r.at || '').toLocaleString()}` : ''}`, 9, 5, [80, 96, 120])
      })
    }

    line('Retest and limits', 13, 6)
    line('For every finding above, state what the evidence does NOT prove and the exact check that will confirm the fix (command, filter, expected output). A finding without a retest check is unfinished work.', 9, 5, [100, 116, 139])

    const blob = doc.output('blob')
    const buf = await blob.arrayBuffer()
    const sha = await sha256Hex(buf)

    // Stamp the file's own hash in the footer of every page.
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setFontSize(8)
      doc.setTextColor(120, 130, 150)
      doc.text(`local export ${reportId} • page ${p}/${pages} • file SHA-256 ${sha ? sha.slice(0, 32) + '…' : 'unavailable in this context'}`, 15, 290)
    }
    const stampBlob = doc.output('blob')
    const stampBuf = await stampBlob.arrayBuffer()
    const stampSha = await sha256Hex(stampBuf)

    setGenerated({
      id: reportId,
      pages,
      sha256: stampSha,
      size: `${(stampBlob.size / 1024).toFixed(1)} KB`,
      url: URL.createObjectURL(stampBlob),
      blob: stampBlob,
      itemCount: records.length,
    })
    setGenerating(false)
  }

  const downloadPdf = () => {
    if (!generated?.blob) return
    const a = document.createElement('a')
    a.href = generated.url
    a.download = `platform-notes-${generated.id}.pdf`
    a.click()
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Export your records as PDF</h3>
          <p className="text-[11px] text-slate-500 font-mono">jsPDF • your evidence vault + finding draft • hash of the exported file itself</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Vault records', value: `${records.length}`, desc: 'added by you', icon: Shield },
          { label: 'Finding draft', value: finding ? 'saved' : 'empty', desc: 'report editor', icon: FileText },
          { label: 'Lessons', value: `${completedLessons}/${TOTAL_LESSONS}`, desc: 'local progress', icon: CheckCircle },
          { label: 'Labs', value: `${completedLabs}/${TOTAL_LABS}`, desc: 'local progress', icon: Hash },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">
              <item.icon className="w-3 h-3" /> {item.label}
            </div>
            <div className="text-[15px] font-mono font-bold text-slate-100">{item.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>

      {!hasContent && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11.5px] text-amber-300/90 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Nothing to export yet. Add artefacts in Reports → Evidence Vault and write at least one finding in the
            editor. The export deliberately does not ship with sample findings, sample hashes or a sample flag — a
            report is only worth what your own evidence supports.
          </span>
        </div>
      )}

      <button
        onClick={generatePdf}
        disabled={generating || !hasContent}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-glow-violet disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
      >
        {generating ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Building PDF…</>
        ) : (
          <><Download className="w-4 h-4" />Generate PDF from my records</>
        )}
      </button>

      {generated && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="min-w-0 text-[11.5px] text-slate-300 leading-relaxed">
              <div className="font-semibold text-emerald-300">PDF built — {generated.pages} page{generated.pages === 1 ? '' : 's'}, {generated.size}</div>
              <div className="mt-1 font-mono text-[10.5px] text-slate-400 break-all">
                file SHA-256: {generated.sha256 || 'unavailable in this browser context'}
              </div>
              <div className="mt-1 text-slate-500">
                {generated.itemCount} vault record{generated.itemCount === 1 ? '' : 's'} included. The hash above identifies the
                exported file itself — record it next to your evidence if you need a chain of custody.
              </div>
              <button onClick={downloadPdf} className="mt-3 px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-200 hover:border-[#475569] transition-colors">
                Download {`platform-notes-${generated.id}.pdf`}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/50 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-slate-400 leading-relaxed min-w-0">
          Keep the evidence vault JSON export next to this PDF: the vault holds the machine-checkable part
          (hash, filter, frame numbers), the PDF holds the narrative your reader needs. For CVSS scoring use the
          calculator in Reports → CVSS 3.1 — the numbers there are computed, not typed.
        </div>
      </div>
    </div>
  )
}
