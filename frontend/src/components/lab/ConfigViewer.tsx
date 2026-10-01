import { SelectionMarker } from '@/components/common/SelectionMarker'
import { useState, useId } from 'react'
import { FileCode, AlertTriangle, CheckCircle, XCircle, Shield, Zap, Eye, EyeOff } from 'lucide-react'

interface ConfigIssue {
  line: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  message: string
  recommendation: string
}

interface Props {
  title: string
  config: string
  issues?: ConfigIssue[]
  onFix?: (fixedConfig: string) => void
}

export function ConfigViewer({ title, config, issues = [], onFix }: Props) {
  const configId = useId()
  const [showFixed, setShowFixed] = useState(false)

  const severityConfig = (sev: string) => {
    switch(sev) {
      case 'critical': return { bg: 'bg-[var(--danger-bg)]', border: 'border-[var(--danger-border)]', text: 'text-[var(--danger)]', badge: 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]', icon: 'bg-[var(--danger-bg)] border-[var(--danger-border)]' }
      case 'high': return { bg: 'bg-[var(--warning-bg)]', border: 'border-[var(--warning-border)]', text: 'text-[var(--attention)]', badge: 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--attention)]', icon: 'bg-[var(--warning-bg)] border-[var(--warning-border)]' }
      case 'medium': return { bg: 'bg-[var(--warning-bg)]', border: 'border-[var(--warning-border)]', text: 'text-[var(--attention)]', badge: 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--attention)]', icon: 'bg-[var(--warning-bg)] border-[var(--warning-border)]' }
      case 'low': return { bg: 'bg-[var(--accent-bg)]', border: 'border-[var(--accent-border)]', text: 'text-[var(--learning)]', badge: 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--learning)]', icon: 'bg-[var(--accent-bg)] border-[var(--accent-border)]' }
      default: return { bg: 'bg-[var(--panel-raised)]', border: 'border-[var(--line-strong)]', text: 'text-[var(--ink-secondary)]', badge: 'bg-[var(--panel-raised)] border-[var(--line-strong)] text-[var(--ink-secondary)]', icon: 'bg-[var(--panel-raised)] border-[var(--line-strong)]' }
    }
  }

  const suggestedConfig = config
    .replace('WPS: ENABLED', 'WPS: DISABLED')
    .replace('wps_state=2', 'wps_state=0')
    .replace('PMF: DISABLED', 'PMF: REQUIRED')
    .replace('ieee80211w=0', 'ieee80211w=2')
    .replace('HT: 40MHz in 2.4GHz', 'HT: 20MHz in 2.4GHz')
    .replace('wpa=1', 'wpa=2')
    .replace('rsn_pairwise=TKIP', 'rsn_pairwise=CCMP')

  const hasSuggestedChanges = suggestedConfig !== config

  return (
    <div
      className="sc-technical-surface rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] overflow-hidden hover:border-[var(--line-strong)] sc-technical-transition relative group min-w-0 w-full"
    >


      <div className="relative flex flex-col xs:flex-row xs:items-center justify-between gap-3 p-4 xs:p-5 border-b border-[var(--line-normal)] bg-[var(--panel-inset)] min-w-0">
        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
            <FileCode className="w-5 h-5 text-[var(--owner)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <span className="text-[13px] font-bold text-[var(--ink-primary)]">{title}</span>
              {issues.length > 0 ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] font-mono font-medium tracking-widest flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {issues.filter(issue => issue.severity !== 'info').length || issues.length} {issues.every(issue => issue.severity === 'info') ? 'NOTES' : 'ISSUES'}
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--panel-raised)] text-[var(--ink-secondary)] border border-[var(--line-strong)] font-mono font-medium tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  NO NOTES SUPPLIED
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)] font-mono mt-0.5">Illustrative config view • No runtime validation</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
          <button
            aria-pressed={showFixed}
            aria-controls={configId}
            onClick={() => setShowFixed(!showFixed)}
            disabled={!hasSuggestedChanges}
            className={`px-4 py-2 rounded-xl text-[11px] font-medium border sc-technical-transition flex items-center gap-2 ${
              showFixed
                ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)] shadow-soft'
                : 'bg-[var(--panel-raised)] border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)]'
            }`}
          >
            {showFixed ? <><EyeOff className="w-3.5 h-3.5" /> Show Original</> : <><Eye className="w-3.5 h-3.5" /> Show Example Suggestions</>}
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
        <div className="sc-technical-detail p-5 bg-[var(--panel-inset)] border-r border-[var(--line-normal)]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center">
                <span className="text-[8px]">#</span>
              </div>
              {showFixed ? 'Illustrative Suggestions' : 'Current Config'}
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-muted)] font-mono">
              {showFixed ? suggestedConfig.split('\n').length : config.split('\n').length} lines
            </div>
          </div>
          <SelectionMarker value={showFixed ? 'suggestions' : 'original'} />
          <pre id={configId} tabIndex={0} aria-label={showFixed ? 'Illustrative suggested configuration' : 'Current configuration'} className="font-mono text-[12px] text-[var(--ink-secondary)] leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] overflow-x-auto scrollbar-thin">
            {showFixed ? suggestedConfig : config}
          </pre>
        </div>

        <div role="region" aria-label="Configuration issues" tabIndex={0} className="p-5 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[var(--ink-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Review Notes
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[var(--ink-muted)] font-mono">
              {issues.length} findings
            </div>
          </div>

          {issues.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-secondary)]">No review notes supplied</div>
                <div className="text-[11px] text-[var(--ink-muted)] mt-1">This view does not validate a running service or prove the configuration is secure.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, idx) => {
                const sev = severityConfig(issue.severity)
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border  sc-technical-transition ${sev.bg} ${sev.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${sev.icon}`}>
                        <XCircle className={`w-4 h-4 ${sev.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[12px] font-mono font-medium text-[var(--ink-primary)] truncate">{issue.line}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border font-bold tracking-widest shrink-0 ${sev.badge}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] mt-2 leading-relaxed text-[var(--ink-secondary)]">{issue.message}</div>
                        <div className="mt-3 p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex gap-2">
                          <Shield className="w-3.5 h-3.5 text-[var(--success)] shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-bold text-[var(--success)]">Fix:</span>
                            <span className="text-[var(--ink-secondary)] ml-1.5">{issue.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <>
            {showFixed && (
              <div
                className="p-4 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] "
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--success-bg)] border border-[var(--success-border)] flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                  </div>
                  <div className="text-[11px] font-bold text-[var(--success)] uppercase tracking-widest">Example changes only</div>
                </div>
                <div className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                  These text substitutions are examples only, not a validated remediation. Check protocol/version compatibility, all related settings, the effective runtime configuration, and retest the actual service.
                </div>
                {onFix && (
                  <button
                    onClick={() => onFix(suggestedConfig)}
                    className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[11px] font-semibold text-[var(--success)] hover:bg-[var(--success-bg)] hover:border-[var(--success-border)] sc-technical-transition flex items-center justify-center gap-2 shadow-soft"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Copy Suggested Text
                  </button>
                )}
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  )
}
