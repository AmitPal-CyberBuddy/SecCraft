import { useState } from 'react'
import { ProgressBar } from '../../src/components/common/Workspace'
import { ResultTransition } from '../../src/components/common/ResultTransition'
import { TextField } from '../../src/components/common/Controls'

/** Dev-only controllable state transitions; no storage or fake product progress. */
export function MotionContract() {
  const [value, setValue] = useState(60)
  const [selection, setSelection] = useState(0)
  return <section style={{display:'grid',gap:16}}>
    <button className="ws-action" onClick={() => setValue(value === 60 ? 85 : 60)}>Update progress</button>
    <ProgressBar value={value} label="Motion test progress" />
    <button className="ws-action" onClick={() => setSelection(current => current + 1)}>Change results</button>
    <ResultTransition identity={String(selection)}><p>Selection {selection}</p></ResultTransition>
    <TextField label="Retained input" defaultValue="Keep this draft" />
    <p id="motion-layout-anchor">Content below the updates stays in place.</p>
  </section>
}
