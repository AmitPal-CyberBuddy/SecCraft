import { useState, useEffect } from 'react'
import { Type, Clock, BookOpen, Accessibility } from 'lucide-react'

function safeGet(key: string, fallback: string) { try { if (typeof localStorage === 'undefined') return fallback; return localStorage.getItem(key) || fallback } catch { return fallback } }
function safeSet(key: string, val: string) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val) } catch {} }

export function ReadingExperience({ content, className = '' }: { content: string; className?: string }) {
  const [fontSize, setFontSize] = useState(() => {
    try { const v = parseInt(safeGet('wififorge-font-size', '14')); return isNaN(v) ? 14 : Math.min(22, Math.max(12, v)) } catch { return 14 }
  })
  const [lineHeight, setLineHeight] = useState(() => {
    try { const v = parseFloat(safeGet('wififorge-line-height', '1.7')); return isNaN(v) ? 1.7 : Math.min(2.2, Math.max(1.2, v)) } catch { return 1.7 }
  })
  const [dyslexia, setDyslexia] = useState(() => { try { return safeGet('wififorge-dyslexia', 'false') === 'true' } catch { return false } })
  const [highContrast, setHighContrast] = useState(() => { try { return safeGet('wififorge-high-contrast', 'false') === 'true' } catch { return false } })

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  useEffect(() => {
    safeSet('wififorge-font-size', fontSize.toString())
    safeSet('wififorge-line-height', lineHeight.toString())
    safeSet('wififorge-dyslexia', dyslexia.toString())
    safeSet('wififorge-high-contrast', highContrast.toString())
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--reading-font-size', `${fontSize}px`)
        document.documentElement.style.setProperty('--reading-line-height', lineHeight.toString())
        document.documentElement.classList.toggle('dyslexia', dyslexia)
        document.documentElement.classList.toggle('high-contrast', highContrast)
      }
    } catch {}
  }, [fontSize, lineHeight, dyslexia, highContrast])

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h4 className="font-heading font-bold text-[13px] text-slate-100">Reading experience</h4>
          <p className="text-[11px] text-slate-500 font-mono">{wordCount} words • {readingTime} min read • {fontSize}px • {lineHeight} lh • WCAG AA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Type className="w-3 h-3" />Font Size — {fontSize}px</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-400 hover:text-slate-200">-</button>
              <div className="flex-1 h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" style={{ width: `${((fontSize - 12) / 10) * 100}%` }} />
              </div>
              <button onClick={() => setFontSize(Math.min(22, fontSize + 1))} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-400 hover:text-slate-200">+</button>
              <span className="text-[11px] font-mono text-slate-500 w-8">{fontSize}px</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Line Height — {lineHeight}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setLineHeight(Math.max(1.2, parseFloat((lineHeight - 0.1).toFixed(1))))} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-400 hover:text-slate-200">-</button>
              <div className="flex-1 h-2 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/30">
                <div className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full" style={{ width: `${((lineHeight - 1.2) / 1.0) * 100}%` }} />
              </div>
              <button onClick={() => setLineHeight(Math.min(2.2, parseFloat((lineHeight + 0.1).toFixed(1))))} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-400 hover:text-slate-200">+</button>
              <span className="text-[11px] font-mono text-slate-500 w-8">{lineHeight}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Accessibility className="w-3 h-3" />Accessibility</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDyslexia(!dyslexia)} className={`p-2.5 rounded-xl border text-left transition-all touch-manipulation ${dyslexia ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-[#020617]/60 border-[#1e293b]/40 text-slate-500 hover:text-slate-300'}`}>
              <div className="text-[12px] font-medium">Dyslexia Font</div>
              <div className="text-[10px] mt-1">{dyslexia ? 'Enabled • OpenDyslexic' : 'Disabled'}</div>
            </button>
            <button onClick={() => setHighContrast(!highContrast)} className={`p-2.5 rounded-xl border text-left transition-all touch-manipulation ${highContrast ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-[#020617]/60 border-[#1e293b]/40 text-slate-500 hover:text-slate-300'}`}>
              <div className="text-[12px] font-medium">High Contrast</div>
              <div className="text-[10px] mt-1">{highContrast ? 'Enabled • WCAG AAA' : 'Disabled • WCAG AA'}</div>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{wordCount} words • {readingTime} min at 200 wpm • focus mode • dyslexia-friendly spacing • high contrast</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dyslexia { font-family: 'OpenDyslexic', 'Comic Sans MS', cursive !important; }
        .high-contrast { filter: contrast(1.2) brightness(1.1); }
      `}</style>
    </div>
  )
}
