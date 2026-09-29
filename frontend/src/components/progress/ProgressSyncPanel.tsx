import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, CloudDownload, FileDown, FileUp, LoaderCircle, RefreshCw, ShieldAlert, UploadCloud } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import modules from '@/content/modules.json'
import { useProgressStore } from '@/store/useProgressStore'

type ActivityType = 'lesson' | 'lab' | 'quiz' | 'challenge' | 'assessment' | 'other'
interface ProgressItem {
  path_id: string
  module_id: string
  activity_type: ActivityType
  activity_id: string
  content_version: string
  state: 'started' | 'completed'
}
interface ServerProgress {
  records: ProgressItem[]
  verifiedRecords: number
  unverifiedRecords: number
  xp: number
  achievements: Array<{ id: string; verified: boolean }>
  checkedAt: string
}
interface PreviewResult {
  incoming_records: number
  unique_records: number
  would_insert: number
  would_upgrade_unverified_progress: number
  verified_server_records_preserved: number
  unchanged: number
  imported_records_are_verified: false
}

const modulePath = new Map((modules as Array<{ id: string; learningPathId?: string }>).map(module => [module.id, module.learningPathId || 'general']))

function toProgressItem(record: any, activityType: unknown, moduleId: unknown, activityId: unknown, pathId?: unknown): ProgressItem | null {
  const allowedTypes: ActivityType[] = ['lesson', 'lab', 'quiz', 'challenge', 'assessment', 'other']
  if (typeof moduleId !== 'string' || !moduleId.trim() || moduleId.length > 128 || typeof activityId !== 'string' || !activityId.trim() || activityId.length > 160) return null
  if (typeof activityType !== 'string' || !allowedTypes.includes(activityType as ActivityType)) return null
  const resolvedPath = pathId ?? modulePath.get(moduleId) ?? 'general'
  if (typeof resolvedPath !== 'string' || !resolvedPath.trim() || resolvedPath.length > 128) return null
  return {
    path_id: resolvedPath,
    module_id: moduleId,
    activity_type: activityType as ActivityType,
    activity_id: activityId,
    content_version: typeof record?.content_version === 'string' && record.content_version.length > 0 && record.content_version.length <= 64 ? record.content_version : 'guest-local',
    state: record?.state === 'started' || record?.completed === false ? 'started' : 'completed',
  }
}

function errorMessage(body: any, status: number, action: string): string {
  if (typeof body?.detail === 'string') return body.detail
  if (typeof body?.detail?.message === 'string') return body.detail.message
  if (body?.detail?.code === 'email_not_verified') return 'Verify your email before using account synchronization.'
  return `${action} unavailable (${status}).`
}

function localProgressRecords(state: Record<string, any>): ProgressItem[] {
  const records: ProgressItem[] = []
  for (const item of Array.isArray(state.completedLessons) ? state.completedLessons : []) {
    const mapped = toProgressItem(item, 'lesson', item?.moduleId, item?.lessonId)
    if (mapped) records.push(mapped)
  }
  for (const item of Array.isArray(state.completedLabs) ? state.completedLabs : Array.isArray(state.labs) ? state.labs : []) {
    const mapped = toProgressItem(item, 'lab', item?.moduleId, item?.labId)
    if (mapped) records.push(mapped)
  }
  for (const item of Array.isArray(state.quizScores) ? state.quizScores : []) {
    const mapped = toProgressItem(item, 'quiz', item?.moduleId, item?.quizId)
    if (mapped) records.push(mapped)
  }
  for (const item of Array.isArray(state.completedChallenges) ? state.completedChallenges : []) {
    const mapped = toProgressItem(item, 'challenge', item?.moduleId, item?.challengeId)
    if (mapped) records.push(mapped)
  }
  return records
}

function decodeProgressFile(value: unknown): ProgressItem[] {
  if (!value || typeof value !== 'object') throw new Error('Choose a SecCraft progress JSON export.')
  const envelope = value as Record<string, any>
  const source = envelope.state && typeof envelope.state === 'object' ? envelope.state : envelope
  if (Array.isArray(envelope.records)) {
    const records = envelope.records.map((item: any) => item && typeof item === 'object'
      ? toProgressItem(item, item.activity_type, item.module_id, item.activity_id, item.path_id)
      : null)
    if (!records.length || records.some(item => item === null)) throw new Error('The progress export contains no valid records or has invalid fields.')
    return records as ProgressItem[]
  }
  const hasLocalRecords = ['completedLessons', 'completedLabs', 'labs', 'quizScores', 'completedChallenges', 'lessons'].some(key => Array.isArray(source[key]))
  if (!hasLocalRecords) throw new Error('This JSON file is not a supported SecCraft progress export.')
  const records = localProgressRecords(source)
  // Accept the older Settings export field names without treating scores or rewards as evidence.
  if (!Array.isArray(source.completedLessons) && Array.isArray(source.lessons)) {
    records.push(...localProgressRecords({ ...source, completedLessons: source.lessons, completedLabs: source.labs }))
  }
  return records
}

export function ProgressSyncPanel() {
  const completedLessons = useProgressStore(state => state.completedLessons)
  const completedLabs = useProgressStore(state => state.completedLabs)
  const quizScores = useProgressStore(state => state.quizScores)
  const completedChallenges = useProgressStore(state => state.completedChallenges)
  const currentLocalState = useMemo(() => ({ completedLessons, completedLabs, quizScores, completedChallenges }), [completedLessons, completedLabs, quizScores, completedChallenges])
  const localRecords = useMemo(() => localProgressRecords(currentLocalState), [currentLocalState])
  const [fileRecords, setFileRecords] = useState<ProgressItem[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [previewState, setPreviewState] = useState<{ result: PreviewResult; signature: string } | null>(null)
  const [serverProgress, setServerProgress] = useState<ServerProgress | null>(null)
  const [serverBusy, setServerBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const records = fileRecords ?? localRecords
  const recordsSignature = JSON.stringify(records)
  const preview = previewState?.signature === recordsSignature ? previewState.result : null

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    setMessage('')
    setPreviewState(null)
    if (!file) { setFileRecords(null); setFileName(''); return }
    if (file.size > 2 * 1024 * 1024) { setFileRecords(null); setFileName(''); setError('Progress files must be 2 MB or smaller.'); return }
    try {
      const records = decodeProgressFile(JSON.parse(await file.text()))
      if (!records.length) throw new Error('No supported progress items were found in that file.')
      if (records.length > 500) throw new Error('A single import is limited to 500 progress items.')
      setFileRecords(records)
      setFileName(file.name)
    } catch (cause) {
      setFileRecords(null)
      setFileName('')
      setError(cause instanceof Error ? cause.message : 'That JSON file could not be read.')
    }
  }

  async function downloadLocalExport() {
    const payload = { format: 'seccraft-local-progress-v1', exported_at: new Date().toISOString(), records: localRecords }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `seccraft-local-progress-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function refreshServerProgress() {
    setServerBusy(true); setError(''); setMessage('')
    try {
      const response = await apiFetch('/api/v1/progress')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(body, response.status, 'Account progress'))
      if (!body || !Array.isArray(body.records) || typeof body.xp?.total !== 'number') throw new Error('The account API returned an invalid progress response. Check the configured API origin.')
      const rawRecords = body.records
      const parsed = rawRecords.map((item: any) => item && typeof item === 'object'
        ? toProgressItem(item, item.activity_type, item.module_id, item.activity_id, item.path_id)
        : null)
      if (parsed.some((item: ProgressItem | null) => item === null)) throw new Error('The server returned an invalid progress record.')
      const records = parsed as ProgressItem[]
      setServerProgress({
        records,
        verifiedRecords: rawRecords.filter((item: any) => item?.verified === true).length,
        unverifiedRecords: rawRecords.filter((item: any) => item?.verified !== true).length,
        xp: Number.isFinite(body.xp?.total) ? body.xp.total : 0,
        achievements: Array.isArray(body.achievements) ? body.achievements.map((item: any) => ({ id: String(item.id), verified: item.verified === true })) : [],
        checkedAt: new Date().toLocaleTimeString(),
      })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Account progress could not be loaded.') }
    finally { setServerBusy(false) }
  }

  function downloadServerExport() {
    if (!serverProgress) return
    const payload = { format: 'seccraft-server-progress-v1', exported_at: new Date().toISOString(), records: serverProgress.records }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `seccraft-account-progress-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function requestPreview() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await apiFetch('/api/v1/progress/import/preview', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ records }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(body, response.status, 'Import preview'))
      if (!body || !['incoming_records', 'unique_records', 'would_insert', 'would_upgrade_unverified_progress', 'verified_server_records_preserved', 'unchanged'].every(key => Number.isInteger(body[key])) || body.imported_records_are_verified !== false) {
        throw new Error('The account API returned an invalid import preview. Check the configured API origin.')
      }
      setPreviewState({ result: body as PreviewResult, signature: recordsSignature })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Import preview failed.') }
    finally { setBusy(false) }
  }

  async function merge() {
    if (!preview) return
    if (!window.confirm(`Merge ${preview.unique_records} progress item(s) into this account? Imported items remain unverified and cannot grant XP or certificates.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await apiFetch('/api/v1/progress/import', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ records }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(errorMessage(body, response.status, 'Progress merge'))
      if (!body || !Number.isInteger(body.inserted) || !Number.isInteger(body.upgraded_unverified_progress) || !Number.isInteger(body.verified_server_records_preserved) || body.xp_awarded !== 0) {
        throw new Error('The account API returned an invalid merge response. Check the configured API origin.')
      }
      setMessage(`Merged ${body.inserted + body.upgraded_unverified_progress} item(s). ${body.verified_server_records_preserved} verified server record(s) were left unchanged; no XP was awarded.`)
      setPreviewState(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Progress merge failed.') }
    finally { setBusy(false) }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10"><UploadCloud className="h-4 w-4 text-cyan-200" /></span><div><h3 className="text-sm font-semibold text-slate-100">Sync or import local progress</h3><p className="mt-1 text-xs leading-5 text-slate-400">Preview first, then merge. Imported records are always marked unverified and never overwrite verified server records.</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => { setFileRecords(null); setFileName(''); setPreviewState(null); setError(''); setMessage('') }} className={`min-h-9 rounded-lg border px-3 text-xs ${!fileRecords ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-slate-700 text-slate-300'}`}>This browser</button>
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"><FileUp className="h-3.5 w-3.5" />{fileName || 'Choose progress JSON'}<input type="file" accept="application/json,.json" onChange={readFile} className="sr-only" /></label>
        <button type="button" onClick={() => void downloadLocalExport()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"><FileDown className="h-3.5 w-3.5" />Export local progress</button>
      </div>
      <div className="mt-3 text-xs text-slate-500">{records.length} local item(s) selected{fileName ? ` from ${fileName}` : ''}. Local XP, scores, and achievements are not imported as verified rewards.</div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void refreshServerProgress()} disabled={serverBusy} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"><CloudDownload className={`h-3.5 w-3.5 ${serverBusy ? 'animate-pulse' : ''}`} />Fetch account progress</button>{serverProgress && <button type="button" onClick={downloadServerExport} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:bg-slate-800"><FileDown className="h-3.5 w-3.5" />Export synced snapshot</button>}</div>
      {serverProgress && <div role="status" className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">Account snapshot at {serverProgress.checkedAt}: {serverProgress.records.length} progress item(s) ({serverProgress.verifiedRecords} verified, {serverProgress.unverifiedRecords} unverified), {serverProgress.xp} server XP, {serverProgress.achievements.length} achievement(s). Exported snapshots remain unverified if imported again.</div>}
      {error && <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] p-3 text-xs text-rose-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}{error.includes('pending') || error.includes('active') || error.includes('token') ? <Link to="/login" className="ml-auto underline">Sign in</Link> : null}</div>}
      {message && <div role="status" className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-xs text-emerald-100">{message}</div>}
      {preview && <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><Check className="h-4 w-4" />Import preview</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{[
        ['New', preview.would_insert], ['Advance unverified', preview.would_upgrade_unverified_progress], ['Verified preserved', preview.verified_server_records_preserved], ['Unchanged', preview.unchanged],
      ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2"><div className="font-mono text-base text-slate-100">{value}</div><div className="text-[10px] text-slate-500">{label}</div></div>)}</div><p className="mt-3 text-xs text-slate-400">These records remain unverified. This merge awards 0 XP and does not create certificates.</p></div>}
      {records.length > 500 && <p className="mt-2 text-xs text-amber-200">The API accepts at most 500 records per preview. Export and select a smaller batch before importing.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void requestPreview()} disabled={busy || records.length === 0 || records.length > 500} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Preview merge</button>{preview && <button type="button" onClick={() => void merge()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-xs font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Confirm merge</button>}{busy && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Contacting the account API</span>}</div>
    </section>
  )
}
