import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
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
    setError('')
    setMessage(`Download requested: ${anchor.download}. Your browser chooses where to save it. The file contains browser-local, unverified practice.`)
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
    setError('')
    setMessage(`Download requested: ${anchor.download}. Your browser chooses where to save it. Re-imported account records remain unverified.`)
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

  return <section className="ws-sync-panel ws-panel" aria-labelledby="sync-actions-title">
    <div className="ws-panel-heading"><div><h2 id="sync-actions-title">Move progress</h2><p className="ws-muted">Preview first, then merge. Imported records remain unverified and never replace verified server records.</p></div></div>
    <div className="ws-sync-group"><h3>Source · practice data</h3><div className="ws-sync-actions">
      <button type="button" onClick={() => { setFileRecords(null); setFileName(''); setPreviewState(null); setError(''); setMessage('') }} aria-pressed={!fileRecords}>This browser</button>
      <label className="ws-file-picker">Choose progress JSON<input type="file" accept="application/json,.json" onChange={readFile} className="sr-only" /></label>
      <button type="button" onClick={() => void downloadLocalExport()}>Export local progress</button>
    </div><p className="ws-muted">{records.length} item(s) selected{fileName ? ` from ${fileName}` : ' from this browser'}. Scores, XP and achievements cannot become verified through import.</p></div>
    <div className="ws-sync-group"><h3>Account record</h3><div className="ws-sync-actions"><button type="button" onClick={() => void refreshServerProgress()} disabled={serverBusy}>{serverBusy ? 'Reading account record…' : 'Fetch account progress'}</button>{serverProgress && <button type="button" onClick={downloadServerExport}>Export account snapshot</button>}</div>
      {serverProgress && <p role="status" className="ws-muted">Read at {serverProgress.checkedAt}: {serverProgress.records.length} record(s) · {serverProgress.verifiedRecords} verified · {serverProgress.unverifiedRecords} unverified · {serverProgress.xp} server XP · {serverProgress.achievements.length} achievement(s). Exported records remain unverified if re-imported.</p>}
    </div>
    {error && <div role="alert" className="ws-sync-error">{error}{error.includes('pending') || error.includes('active') || error.includes('token') ? <Link to="/login">Sign in →</Link> : null}</div>}
    {message && <div role="status" className="ws-sync-success">{message}</div>}
    <div className="ws-sync-group"><h3>Preview and merge</h3>
      {preview && <div className="ws-sync-preview" role="status"><div className="ws-row-meta">Import preview · unverified</div><dl>{[
        ['New', preview.would_insert], ['Advance unverified', preview.would_upgrade_unverified_progress], ['Verified preserved', preview.verified_server_records_preserved], ['Unchanged', preview.unchanged],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Merge awards 0 verified XP and does not create certificates.</p></div>}
      {records.length > 500 && <p className="ws-sync-error">The API accepts at most 500 records per preview. Select a smaller batch.</p>}
      <div className="ws-sync-actions"><button type="button" onClick={() => void requestPreview()} disabled={busy || records.length === 0 || records.length > 500}>{busy ? 'Working…' : 'Preview merge'}</button>{preview && <button type="button" className="ws-action" onClick={() => void merge()} disabled={busy}>Confirm merge</button>}</div>
      {busy && <p role="status" className="ws-muted">Contacting the account API…</p>}
    </div>
  </section>
}
