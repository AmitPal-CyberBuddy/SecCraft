import { useState } from 'react'
import { motion } from 'framer-motion'
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
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Custom Module Creator — Plugin System • Enterprise</h3>
          <p className="text-[11px] text-slate-500 font-mono">Create modules, lessons, labs, quizzes — publish — marketplace — extensible platform</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">Beta</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Module ID — e.g., 21-custom-wifi6</label>
          <input value={moduleData.id} onChange={e => setModuleData({ ...moduleData, id: e.target.value })} placeholder="21-custom-wifi6" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Title — e.g., WiFi 6/6E Security</label>
          <input value={moduleData.title} onChange={e => setModuleData({ ...moduleData, title: e.target.value })} placeholder="WiFi 6/6E Security" className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30" />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Description — Attack→Defense→Retest methodology</label>
        <textarea value={moduleData.description} onChange={e => setModuleData({ ...moduleData, description: e.target.value })} placeholder="Learn WiFi 6 WPA3 Enhanced Open OWE, 6GHz band, security improvements, backward compatibility, transition mode risks..." className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30 min-h-[80px]" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lessons — {moduleData.lessons.length} × 400-600 lines • Attack→Defense→Retest</span>
          <button onClick={addLesson} className="px-3 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] text-slate-300 flex items-center gap-1 hover:bg-[#25354f] transition-colors"><Plus className="w-3 h-3" />Add Lesson</button>
        </div>
        {moduleData.lessons.map((lesson, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <input value={lesson.title} onChange={e => { const lessons = [...moduleData.lessons]; lessons[idx] = { ...lessons[idx], title: e.target.value }; setModuleData({ ...moduleData, lessons }) }} placeholder={`Lesson ${idx+1} title — e.g., WiFi 6 Architecture`} className="flex-1 px-3 py-2 rounded-lg bg-[#020617] border border-[#1e293b] text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30" />
              <span className="text-[10px] px-2 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">#{idx+1}</span>
            </div>
            <textarea value={lesson.content} onChange={e => { const lessons = [...moduleData.lessons]; lessons[idx] = { ...lessons[idx], content: e.target.value }; setModuleData({ ...moduleData, lessons }) }} placeholder={`Lesson ${idx+1} content — 400-600 lines — include 5+ commands, 20+ filters, 30+ terms, Attack→Defense→Retest, zero-cost simulated + RF_REQUIRED, interactive components PcapInspector ReconMap HandshakeDiagram ConfigViewer AttackDefenseRetest...`} className="w-full px-3 py-2 rounded-lg bg-[#020617] border border-[#1e293b] text-[11px] text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 min-h-[60px]" />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={exportModule} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-glow-violet touch-manipulation min-h-[44px]"><Save className="w-4 h-4" />Export Module JSON</button>
        <button className="px-4 py-3 rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-slate-400 flex items-center gap-2 hover:bg-[#25354f] transition-colors touch-manipulation min-h-[44px]"><Eye className="w-4 h-4" />Preview</button>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-violet-300">Enterprise Platform:</span> Plugin system API hooks marketplace sandbox, custom module creator UI, API SDK TS/Python, webhooks event retry signing, LTI Canvas/Moodle SCORM 1.2/2004 export, GraphQL subscriptions real-time playground, OpenAPI Swagger UI API key management scopes usage stats — extensible platform ecosystem.
      </div>
    </div>
  )
}
