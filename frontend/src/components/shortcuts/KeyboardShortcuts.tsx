import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Keyboard, X, Command, Zap } from 'lucide-react'

const shortcuts = [
  { keys: ['⌘', 'K'], desc: 'Global search — modules, lessons, commands, filters', section: 'Navigation' },
  { keys: ['G', 'D'], desc: 'Go to Dashboard', section: 'Navigation' },
  { keys: ['G', 'M'], desc: 'Go to Modules', section: 'Navigation' },
  { keys: ['G', 'L'], desc: 'Go to Labs — PCAP + Terminal + Vault', section: 'Navigation' },
  { keys: ['G', 'C'], desc: 'Go to Challenges', section: 'Navigation' },
  { keys: ['G', 'R'], desc: 'Go to Reports & Certificate', section: 'Navigation' },
  { keys: ['J'], desc: 'Next lesson / next item', section: 'Learning' },
  { keys: ['K'], desc: 'Previous lesson', section: 'Learning' },
  { keys: ['C'], desc: 'Mark complete — earn XP', section: 'Learning' },
  { keys: ['T'], desc: 'Open terminal emulator', section: 'Labs' },
  { keys: ['F'], desc: 'Focus filter — PcapInspector', section: 'Labs' },
  { keys: ['?'], desc: 'Show shortcuts — this panel', section: 'Help' },
  { keys: ['Esc'], desc: 'Close modal / search', section: 'Help' },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
      // G + D etc quick nav — client-side so the router basename (Pages sub-path) is respected
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        const nextHandler = (ev: KeyboardEvent) => {
          const k = ev.key.toLowerCase()
          if (k === 'd') navigate('/')
          if (k === 'm') navigate('/modules')
          if (k === 'l') navigate('/labs')
          if (k === 'c') navigate('/challenges')
          if (k === 'r') navigate('/reports')
          document.removeEventListener('keydown', nextHandler)
        }
        document.addEventListener('keydown', nextHandler, { once: true })
        setTimeout(() => document.removeEventListener('keydown', nextHandler), 2000)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, navigate])

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-medium hover:bg-[#1e293b] hover:border-[#334155] transition-all z-30 touch-manipulation" aria-label="Keyboard shortcuts ?">
        <Keyboard className="w-5 h-5 text-slate-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md" onClick={() => setOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="w-full max-w-[560px] rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-5 border-b border-[#1e293b] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-[14px] text-slate-100">Keyboard shortcuts</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Vim-style navigation • handled in the browser</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="overflow-y-auto scrollbar-thin p-4 space-y-5 flex-1">
                {['Navigation', 'Learning', 'Labs', 'Help'].map(section => (
                  <div key={section}>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-violet-400" />{section}
                    </div>
                    <div className="space-y-1">
                      {shortcuts.filter(s => s.section === section).map(s => (
                        <div key={s.desc} className="flex items-center justify-between p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:bg-[#020617]/80 hover:border-[#334155]/40 transition-colors">
                          <span className="text-[12px] text-slate-400">{s.desc}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.keys.map(k => (
                              <kbd key={k} className="px-2 py-1 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] font-mono font-medium text-slate-300 min-w-[28px] text-center">{k}</kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#1e293b] bg-[#020617]/40 flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Pro tip: <span className="text-slate-400 font-mono">⌘K</span> fuzzy-searches the local index — modules, lessons, commands and filters.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
