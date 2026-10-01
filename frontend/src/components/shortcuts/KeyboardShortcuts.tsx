import { useMotionPolicy } from '@/components/animations/motionPolicy'
import { panelMotion } from '@/lib/motion'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Keyboard, X, Zap } from 'lucide-react'

const shortcuts = [
  { keys: ['⌘', 'K'], desc: 'Global search — modules, lessons, commands, filters', section: 'Navigation' },
  { keys: ['G', 'D'], desc: 'Go to Dashboard', section: 'Navigation' },
  { keys: ['G', 'M'], desc: 'Go to Modules', section: 'Navigation' },
  { keys: ['G', 'L'], desc: 'Go to Labs — PCAP + Terminal + Vault', section: 'Navigation' },
  { keys: ['G', 'C'], desc: 'Go to Challenges', section: 'Navigation' },
  { keys: ['G', 'R'], desc: 'Go to Reports & Certificates', section: 'Navigation' },
  { keys: ['?'], desc: 'Show shortcuts — this panel', section: 'Help' },
  { keys: ['Esc'], desc: 'Close modal / search', section: 'Help' },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const entrance = panelMotion('search', useMotionPolicy())

  useEffect(() => {
    let armedUntil = 0
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (event.defaultPrevented || event.isComposing || event.repeat || event.metaKey || event.ctrlKey || event.altKey || target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) { armedUntil = 0; return }
      if (open || document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]')) { armedUntil = 0; return }
      if (event.key === '?') { event.preventDefault(); armedUntil = 0; setOpen(true); return }
      const destination = ({ d:'/app', m:'/modules', l:'/labs', c:'/challenges', r:'/reports' } as Record<string,string>)[event.key.toLowerCase()]
      if (armedUntil > Date.now() && destination) { event.preventDefault(); armedUntil = 0; navigate(destination); return }
      armedUntil = event.key.toLowerCase() === 'g' ? Date.now() + 1500 : 0
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, navigate, location.key])

  useEffect(() => {
    if (!open) return
    const node = dialog.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    node?.showModal()
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      node?.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 w-11 h-11 rounded-xl bg-[var(--panel-bg)] border border-[var(--line-normal)] flex items-center justify-center shadow-medium hover:bg-[var(--panel-raised)] hover:border-[var(--line-strong)] sc-surface-transition z-30 touch-manipulation" aria-label="Keyboard shortcuts ?">
        <Keyboard className="w-5 h-5 text-[var(--ink-secondary)]" />
      </button>

      <>
        {open && (
          <dialog ref={dialog} aria-labelledby="shortcut-title" onCancel={event => { event.preventDefault(); setOpen(false) }} className="sc-shortcut-dialog fixed inset-0 z-[100] m-0 w-full h-full max-w-none max-h-none items-center justify-center p-4 bg-[var(--scrim)]" onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
            <motion.div {...entrance} onClick={e => e.stopPropagation()} className="w-full max-w-[560px] rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-5 border-b border-[var(--line-normal)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-[var(--owner)]" />
                  </div>
                  <div>
                    <h3 id="shortcut-title" className="font-heading font-bold text-[14px] text-[var(--ink-primary)]">Keyboard shortcuts</h3>
                    <p className="text-[11px] text-[var(--ink-muted)] font-mono">Vim-style navigation • handled in the browser</p>
                  </div>
                </div>
                <button ref={closeButton} aria-label="Close keyboard shortcuts" onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--panel-raised)] transition-colors touch-manipulation">
                  <X className="w-4 h-4 text-[var(--ink-secondary)]" />
                </button>
              </div>

              <div tabIndex={0} role="region" aria-label="Shortcut reference" className="overflow-y-auto scrollbar-thin p-4 space-y-5 flex-1">
                {['Navigation', 'Help'].map(section => (
                  <div key={section}>
                    <div className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--owner)]" />{section}
                    </div>
                    <div className="space-y-1">
                      {shortcuts.filter(s => s.section === section).map(s => (
                        <div key={s.desc} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] transition-colors">
                          <span className="text-[12px] text-[var(--ink-secondary)]">{s.desc}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map(k => (
                              <kbd key={k} className="px-2 py-1 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[11px] font-mono font-medium text-[var(--ink-secondary)] min-w-[28px] text-center">{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[var(--line-normal)] bg-[var(--panel-inset)] flex items-center gap-2 text-[11px] text-[var(--ink-muted)] shrink-0">
                <Zap className="w-3.5 h-3.5 text-[var(--attention)]" />
                <span>Pro tip: <span className="text-[var(--ink-secondary)] font-mono">⌘K</span> fuzzy-searches the local index — modules, lessons, commands and filters.</span>
              </div>
            </motion.div>
          </dialog>
        )}
      </>
    </>
  )
}
