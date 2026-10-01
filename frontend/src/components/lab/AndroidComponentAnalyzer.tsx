import { useState, useId, useMemo } from 'react'
import { Shield, Smartphone, Terminal, Play, AlertTriangle, CheckCircle, Copy, Check, Lock, Unlock, RefreshCw, Eye, ExternalLink } from 'lucide-react'

export interface AndroidComponent {
  id: string
  name: string
  type: 'Activity' | 'BroadcastReceiver' | 'Service' | 'ContentProvider'
  exported: boolean
  permission: string | null
  protectionLevel?: 'normal' | 'dangerous' | 'signature'
  intentFilter?: {
    actions: string[]
    categories: string[]
    dataSchemes: string[]
    dataHosts?: string[]
  }
  vulnerabilityDescription: string
  fixedDescription: string
  vulnerableCode: string
  fixedCode: string
  sampleExtras: Record<string, string>
  sampleDataUri?: string
  masvsControl: string
}

const SAMPLE_COMPONENTS: AndroidComponent[] = [
  {
    id: 'notes-view',
    name: 'com.example.notevault.NotesViewActivity',
    type: 'Activity',
    exported: true,
    permission: null,
    intentFilter: {
      actions: ['android.intent.action.VIEW'],
      categories: ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
      dataSchemes: ['notevault', 'https'],
      dataHosts: ['notes', 'notevault.example.com'],
    },
    vulnerabilityDescription: 'Exported with BROWSABLE filter and no permission checks. Any third-party app or web link can invoke this activity with an arbitrary note ID extra, bypassing the authentication screen.',
    fixedDescription: 'Set android:exported="false" for internal flows, or validate incoming intent calling package and verify account session ownership before displaying notes.',
    vulnerableCode: `<!-- AndroidManifest.xml -->\n<activity\n    android:name=".NotesViewActivity"\n    android:exported="true">\n    <intent-filter>\n        <action android:name="android.intent.action.VIEW" />\n        <category android:name="android.intent.category.DEFAULT" />\n        <category android:name="android.intent.category.BROWSABLE" />\n        <data android:scheme="notevault" android:host="notes" />\n    </intent-filter>\n</activity>`,
    fixedCode: `<!-- AndroidManifest.xml - Restrict to verified App Links & auth checks -->\n<activity\n    android:name=".NotesViewActivity"\n    android:exported="false" />\n<!-- Require explicit router authentication check before rendering -->`,
    sampleExtras: { note_id: '1337', skip_pin: 'true' },
    sampleDataUri: 'notevault://notes/view?id=1337',
    masvsControl: 'MASVS-PLATFORM-1 (Component Exposure)',
  },
  {
    id: 'auth-receiver',
    name: 'com.example.notevault.receiver.ExportAuthReceiver',
    type: 'BroadcastReceiver',
    exported: true,
    permission: null,
    intentFilter: {
      actions: ['com.example.notevault.ACTION_EXPORT_CREDENTIALS'],
      categories: ['android.intent.category.DEFAULT'],
      dataSchemes: [],
    },
    vulnerabilityDescription: 'BroadcastReceiver is exported without guarding permissions. An untrusted local app can broadcast ACTION_EXPORT_CREDENTIALS with a response messenger or callback, leaking session tokens.',
    fixedDescription: 'Enforce signature-level permission (protectionLevel="signature") so only applications signed with the same developer certificate can dispatch this broadcast.',
    vulnerableCode: `<!-- AndroidManifest.xml -->\n<receiver\n    android:name=".receiver.ExportAuthReceiver"\n    android:exported="true">\n    <intent-filter>\n        <action android:name="com.example.notevault.ACTION_EXPORT_CREDENTIALS" />\n    </intent-filter>\n</receiver>`,
    fixedCode: `<!-- AndroidManifest.xml - Signature Guarded -->\n<permission\n    android:name="com.example.notevault.permission.AUTH_SYNC"\n    android:protectionLevel="signature" />\n<receiver\n    android:name=".receiver.ExportAuthReceiver"\n    android:exported="true"\n    android:permission="com.example.notevault.permission.AUTH_SYNC">\n    <intent-filter>\n        <action android:name="com.example.notevault.ACTION_EXPORT_CREDENTIALS" />\n    </intent-filter>\n</receiver>`,
    sampleExtras: { export_format: 'json', reply_token: 'att_callback_4421' },
    masvsControl: 'MASVS-PLATFORM-1 (Unprotected Broadcast)',
  },
  {
    id: 'backup-service',
    name: 'com.example.notevault.service.BackgroundSyncService',
    type: 'Service',
    exported: true,
    permission: null,
    vulnerabilityDescription: 'Exported background service accepting intent commands to synchronize or wipe cache. External applications can trigger unintended sync loops or resource exhaustion.',
    fixedDescription: 'Declare android:exported="false" or migrate to Android WorkManager / JobScheduler with internal component scoping.',
    vulnerableCode: `<!-- AndroidManifest.xml -->\n<service\n    android:name=".service.BackgroundSyncService"\n    android:exported="true" />`,
    fixedCode: `<!-- AndroidManifest.xml -->\n<service\n    android:name=".service.BackgroundSyncService"\n    android:exported="false" />`,
    sampleExtras: { sync_mode: 'force_full', endpoint: 'http://malicious.example' },
    masvsControl: 'MASVS-PLATFORM-2 (Background Service IPC)',
  },
  {
    id: 'notes-provider',
    name: 'com.example.notevault.provider.NotesContentProvider',
    type: 'ContentProvider',
    exported: true,
    permission: 'com.example.notevault.READ_NOTES',
    protectionLevel: 'normal',
    vulnerabilityDescription: 'ContentProvider is exported with protectionLevel="normal". Any installed app declaring <uses-permission android:name="com.example.notevault.READ_NOTES" /> is granted immediate access without user confirmation.',
    fixedDescription: 'Elevate protectionLevel to "signature", or implement path-permission restrictions with custom database query parametrization to prevent cross-account disclosures.',
    vulnerableCode: `<!-- AndroidManifest.xml -->\n<permission\n    android:name="com.example.notevault.READ_NOTES"\n    android:protectionLevel="normal" />\n<provider\n    android:name=".provider.NotesContentProvider"\n    android:authorities="com.example.notevault.provider"\n    android:exported="true"\n    android:permission="com.example.notevault.READ_NOTES" />`,
    fixedCode: `<!-- AndroidManifest.xml -->\n<permission\n    android:name="com.example.notevault.READ_NOTES"\n    android:protectionLevel="signature" />\n<provider\n    android:name=".provider.NotesContentProvider"\n    android:authorities="com.example.notevault.provider"\n    android:exported="true"\n    android:permission="com.example.notevault.READ_NOTES" />`,
    sampleExtras: { projection: 'id,title,secret_body' },
    sampleDataUri: 'content://com.example.notevault.provider/notes',
    masvsControl: 'MASVS-PLATFORM-3 (Content Provider Permissions)',
  },
]

export function AndroidComponentAnalyzer({ className = '' }: { className?: string }) {
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_COMPONENTS[0].id)
  const [isFixedBuild, setIsFixedBuild] = useState(false)
  const [targetUri, setTargetUri] = useState<string>('notevault://notes/view?id=1337')
  const [extraKey, setExtraKey] = useState<string>('note_id')
  const [extraVal, setExtraVal] = useState<string>('1337')
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [simulatedExecution, setSimulatedExecution] = useState(false)

  const component = useMemo(() => SAMPLE_COMPONENTS.find(c => c.id === selectedId) || SAMPLE_COMPONENTS[0], [selectedId])

  // Select component and reset fields
  const handleSelect = (comp: AndroidComponent) => {
    setSelectedId(comp.id)
    setTargetUri(comp.sampleDataUri || '')
    const firstKey = Object.keys(comp.sampleExtras)[0] || 'id'
    setExtraKey(firstKey)
    setExtraVal(comp.sampleExtras[firstKey] || '1')
    setSimulatedExecution(false)
  }

  // Generate ADB command
  const generatedAdb = useMemo(() => {
    if (component.type === 'Activity') {
      let cmd = `adb shell am start -n ${component.name}`
      if (targetUri) cmd += ` -d "${targetUri}"`
      if (extraKey && extraVal) cmd += ` --es ${extraKey} "${extraVal}"`
      return cmd
    }
    if (component.type === 'BroadcastReceiver') {
      const action = component.intentFilter?.actions[0] || 'com.example.notevault.ACTION_SYNC'
      let cmd = `adb shell am broadcast -a ${action}`
      if (extraKey && extraVal) cmd += ` --es ${extraKey} "${extraVal}"`
      return cmd
    }
    if (component.type === 'Service') {
      let cmd = `adb shell am startservice -n ${component.name}`
      if (extraKey && extraVal) cmd += ` --es ${extraKey} "${extraVal}"`
      return cmd
    }
    if (component.type === 'ContentProvider') {
      const uri = targetUri || 'content://com.example.notevault.provider/notes'
      return `adb shell content query --uri ${uri}`
    }
    return `adb shell am start -n ${component.name}`
  }, [component, targetUri, extraKey, extraVal])

  const copyCommand = () => {
    navigator.clipboard.writeText(generatedAdb)
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  return (
    <div className={`rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 space-y-6 ${className}`} aria-labelledby="android-analyzer-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line-normal)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[var(--learning)]" />
            <h3 id="android-analyzer-title" className="font-heading font-bold text-base text-[var(--ink-primary)]">
              Android Component & IPC Boundary Analyzer
            </h3>
          </div>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">
            Interactive manifest triage, ADB intent payload constructor, and runtime boundary verification simulator.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setIsFixedBuild(!isFixedBuild); setSimulatedExecution(false) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isFixedBuild
                ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]'
                : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]'
            }`}
          >
            {isFixedBuild ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isFixedBuild ? 'Build Variant: Fixed & Hardened' : 'Build Variant: Vulnerable Target'}
          </button>
        </div>
      </div>

      {/* Component Selector Pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--ink-secondary)] uppercase tracking-wider block">
          Target Component Declaration
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SAMPLE_COMPONENTS.map(c => {
            const isSelected = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                  isSelected
                    ? 'bg-[var(--panel-raised)] border-[var(--accent-border)] text-[var(--ink-primary)] shadow-sm'
                    : 'bg-[var(--panel-inset)] border-[var(--line-normal)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] font-bold text-[var(--learning)]">{c.type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    !isFixedBuild && c.exported && !c.permission
                      ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                      : 'bg-[var(--success-bg)] text-[var(--success)]'
                  }`}>
                    {isFixedBuild ? 'Guarded' : c.exported ? 'Exported' : 'Internal'}
                  </span>
                </div>
                <div className="font-medium truncate">{c.name.split('.').pop()}</div>
                <div className="text-[10px] text-[var(--ink-muted)] truncate mt-0.5">{c.masvsControl}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Manifest & Source Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-secondary)] uppercase tracking-wider">
              Manifest XML ({isFixedBuild ? 'Remediated Variant' : 'Vulnerable Variant'})
            </span>
            <span className="text-[11px] font-mono text-[var(--ink-muted)]">AndroidManifest.xml</span>
          </div>
          <pre className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-xs font-mono text-[var(--ink-primary)] overflow-x-auto whitespace-pre leading-relaxed">
            {isFixedBuild ? component.fixedCode : component.vulnerableCode}
          </pre>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--ink-secondary)] uppercase tracking-wider block">
            Analysis & Security Finding
          </span>
          <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] space-y-3 text-xs leading-relaxed text-[var(--ink-secondary)]">
            <div>
              <strong className="text-[var(--ink-primary)] block mb-1">Vulnerability Context:</strong>
              <p>{isFixedBuild ? component.fixedDescription : component.vulnerabilityDescription}</p>
            </div>
            <div>
              <strong className="text-[var(--ink-primary)] block mb-1">Standard Alignment:</strong>
              <p className="font-mono text-[11px] text-[var(--learning)]">{component.masvsControl}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Payload Constructor */}
      <div className="rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--learning)]" />
            <h4 className="font-semibold text-xs text-[var(--ink-primary)] uppercase tracking-wide">
              ADB Intent Payload Constructor
            </h4>
          </div>
          <span className="text-[11px] text-[var(--ink-muted)] font-mono">am start / broadcast / content</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {component.sampleDataUri !== undefined && (
            <label className="text-xs text-[var(--ink-secondary)] block">
              Data URI (-d):
              <input
                type="text"
                value={targetUri}
                onChange={e => setTargetUri(e.target.value)}
                placeholder="notevault://notes/view?id=1337"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--line-normal)] text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
              />
            </label>
          )}
          <label className="text-xs text-[var(--ink-secondary)] block">
            Extra Key (--es):
            <input
              type="text"
              value={extraKey}
              onChange={e => setExtraKey(e.target.value)}
              placeholder="key"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--line-normal)] text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </label>
          <label className="text-xs text-[var(--ink-secondary)] block">
            Extra Value:
            <input
              type="text"
              value={extraVal}
              onChange={e => setExtraVal(e.target.value)}
              placeholder="val"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--line-normal)] text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </label>
        </div>

        {/* Generated Shell Command */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--line-normal)] text-xs font-mono text-[var(--learning)] overflow-x-auto whitespace-nowrap">
            {generatedAdb}
          </div>
          <button
            type="button"
            onClick={copyCommand}
            aria-label="Copy ADB Command"
            className="p-2.5 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-normal)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
          >
            {copiedCmd ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSimulatedExecution(true)}
            className="px-4 py-2.5 rounded-lg sc-learning-action text-xs font-semibold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Simulate Execution
          </button>
        </div>
      </div>

      {/* Simulated Device Execution Output */}
      {simulatedExecution && (
        <div className="rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-4 space-y-3" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--ink-primary)] uppercase tracking-wider flex items-center gap-1.5">
              {isFixedBuild ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  Boundary Defense Result: Blocked & Enforced
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />
                  Execution Result: Component Vulnerability Confirmed
                </>
              )}
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-muted)]">API Level 34 · Android Runtime</span>
          </div>

          <pre className="p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--line-normal)] text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
            {isFixedBuild ? (
              <span className="text-[var(--warning)]">
                {`$ ${generatedAdb}\n`}
                {`Starting: Intent { act=android.intent.action.VIEW cmp=${component.name} }\n`}
                {`java.lang.SecurityException: Permission Denial: starting Intent { act=android.intent.action.VIEW cmp=${component.name} } from null (pid=12401, uid=2000) not exported from uid 10142\n`}
                {`    at android.os.Parcel.createExceptionOrNull(Parcel.java:3057)\n`}
                {`    at com.android.server.wm.ActivityStackSupervisor.checkStartAnyActivityPermission(ActivityStackSupervisor.java:1082)\n`}
                {`[+] Negative Control Verified: Untrusted invocation rejected across kernel UID boundary.`}
              </span>
            ) : (
              <span className="text-[var(--success)]">
                {`$ ${generatedAdb}\n`}
                {`Starting: Intent { act=android.intent.action.VIEW cmp=${component.name} }\n`}
                {`I/ActivityManager: START u0 {act=android.intent.action.VIEW cmp=${component.name}} from uid 2000\n`}
                {`D/NoteVault: ${component.name.split('.').pop()} initialized via external IPC\n`}
                {`D/NoteVault: Extracted parameter '${extraKey}': '${extraVal}'\n`}
                {`W/NoteVault: Loaded target data without session authentication check!\n`}
                {`[!] Positive Control Verified: Vulnerability reproducible via unprivileged external Intent.`}
              </span>
            )}
          </pre>
        </div>
      )}
    </div>
  )
}
