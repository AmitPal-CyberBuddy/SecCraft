import { useState } from 'react'
import { Plus, BookOpen, FileText, FlaskConical, Award, Save, Eye, Code, Zap } from 'lucide-react'

export function CustomModuleCreator({ className = '' }: { className?: string }) {
  const [moduleData, setModuleData] = useState({ id: '', title: '', description: '', lessons: [{ title: '', content: '' }] })

  const addLesson = () => setModuleData({ ...moduleData, lessons: [...moduleData.lessons, { title: '', content: '' }] })

  const exportModule = () => {
    const blob = new Blob([JSON.stringify(moduleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${moduleData.id || 'custom-module'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-[var(--owner)]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)]">Custom module draft — stored in this browser</h3>
          <p className="text-[11px] text-[var(--ink-muted)] font-mono">Create modules, lessons, labs and quizzes — the draft stays in this browser</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[var(--owner)] font-mono">local draft</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide">Module ID — e.g., 21-custom-wifi6</label>
          <input value={moduleData.id} onChange={e => setModuleData({ ...moduleData, id: e.target.value })} placeholder="21-custom-wifi6" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--owner-border)]" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide">Title — e.g., WiFi 6/6E Security</label>
          <input value={moduleData.title} onChange={e => setModuleData({ ...moduleData, title: e.target.value })} placeholder="WiFi 6/6E Security" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--owner-border)]" />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide">Description — Attack→Defense→Retest methodology</label>
        <textarea value={moduleData.description} onChange={e => setModuleData({ ...moduleData, description: e.target.value })} placeholder="Learn WiFi 6 WPA3 Enhanced Open OWE, 6GHz band, security improvements, backward compatibility, transition mode risks..." className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--owner-border)] min-h-[80px]" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wide">Lessons — {moduleData.lessons.length} × 400-600 lines • Attack→Defense→Retest</span>
          <button onClick={addLesson} className="px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[11px] text-[var(--ink-secondary)] flex items-center gap-1 hover:bg-[var(--panel-raised)] transition-colors"><Plus className="w-3 h-3" />Add Lesson</button>
        </div>
        {moduleData.lessons.map((lesson, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--learning)]" />
              <input value={lesson.title} onChange={e => { const lessons = [...moduleData.lessons]; lessons[idx] = { ...lessons[idx], title: e.target.value }; setModuleData({ ...moduleData, lessons }) }} placeholder={`Lesson ${idx+1} title — e.g., WiFi 6 Architecture`} className="flex-1 px-3 py-2 rounded-lg bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[12px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]" />
              <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[var(--ink-muted)] font-mono">#{idx+1}</span>
            </div>
            <textarea value={lesson.content} onChange={e => { const lessons = [...moduleData.lessons]; lessons[idx] = { ...lessons[idx], content: e.target.value }; setModuleData({ ...moduleData, lessons }) }} placeholder={`Lesson ${idx+1} — write the concept, the exact commands and filters, what the evidence proves and what it does not, and the Attack → Defense → Retest path.`} className="w-full px-3 py-2 rounded-lg bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[11px] text-[var(--ink-secondary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)] min-h-[60px]" />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={exportModule} className="sc-learning-action flex-1 py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 shadow-soft touch-manipulation min-h-[44px]"><Save className="w-4 h-4" />Export Module JSON</button>
        <button className="px-4 py-3 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[13px] text-[var(--ink-secondary)] flex items-center gap-2 hover:bg-[var(--panel-raised)] transition-colors touch-manipulation min-h-[44px]"><Eye className="w-4 h-4" />Preview</button>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[11px] text-[var(--ink-muted)] leading-relaxed">
        <span className="font-semibold text-[var(--owner)]">Scope:</span> drafts live in localStorage for your own notes. There is no marketplace, sandbox, publish or export path in this build: use the draft for your own notes, or add the module to content/modules.json in the repository.
      </div>
    </div>
  )
}
