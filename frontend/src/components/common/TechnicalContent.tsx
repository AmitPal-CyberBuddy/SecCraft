import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy() {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied')
      timer.current = setTimeout(() => setStatus(''), 2500)
    } catch {
      setStatus('Copy unavailable. Select the text and copy it manually.')
    }
  }
  return <span className="ws-copy-control" data-copy-state={status === 'Copied' ? 'copied' : 'idle'}><button type="button" className="ws-action ws-action-secondary" onClick={() => void copy()}><span className="sc-copy-feedback-mark" aria-hidden="true">{status === 'Copied' && <Check size={16} />}</span>{label}</button><span role="status">{status}</span></span>
}

export function CodeSnippet({ text, label }: { text: string; label: string }) {
  return <div className="ws-code-snippet"><div className="ws-code-heading"><span>{label}</span><CopyButton text={text} label={`Copy ${label.toLowerCase()}`} /></div><pre tabIndex={0} aria-label={label}><code>{text}</code></pre></div>
}

/** Only technical content scrolls; ordinary page content must reflow. */
export function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ws-scroll-region" role="region" aria-label={label} tabIndex={0}>{children}</div>
}

export function WorkflowSteps({ steps, current, label }: { steps: readonly string[]; current: number; label: string }) {
  return <ol className="ws-workflow-steps" aria-label={label}>{steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol>
}
