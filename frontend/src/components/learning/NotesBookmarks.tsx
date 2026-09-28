import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { StickyNote, Bookmark, Search, Trash2, Edit3, Save, X, Star, Clock, Tag } from 'lucide-react'

interface Note {
  id: string
  moduleId: string
  lessonId: string
  content: string
  createdAt: string
  tags: string[]
}

interface BookmarkItem {
  id: string
  type: 'lesson' | 'lab' | 'command' | 'filter'
  title: string
  moduleId: string
  createdAt: string
}

export function NotesBookmarks({ moduleId, lessonId, className = '' }: { moduleId: string; lessonId: string; className?: string }) {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem('wififorge-notes') || '[]') } catch { return [] }
  })
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('wififorge-bookmarks') || '[]') } catch { return [] }
  })
  const [newNote, setNewNote] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes')

  const saveNotes = (n: Note[]) => { setNotes(n); try { localStorage.setItem('wififorge-notes', JSON.stringify(n)) } catch {} }
  const saveBookmarks = (b: BookmarkItem[]) => { setBookmarks(b); try { localStorage.setItem('wififorge-bookmarks', JSON.stringify(b)) } catch {} }

  const addNote = () => {
    if (!newNote.trim()) return
    const note: Note = { id: Date.now().toString(), moduleId, lessonId, content: newNote, createdAt: new Date().toISOString(), tags: [] }
    saveNotes([note, ...notes])
    setNewNote('')
  }

  const deleteNote = (id: string) => saveNotes(notes.filter(n => n.id !== id))

  const toggleBookmark = () => {
    const exists = bookmarks.find(b => b.moduleId === moduleId && b.title.includes(lessonId))
    if (exists) {
      saveBookmarks(bookmarks.filter(b => b.id !== exists.id))
    } else {
      const bm: BookmarkItem = { id: Date.now().toString(), type: 'lesson', title: `${moduleId} — ${lessonId}`, moduleId, createdAt: new Date().toISOString() }
      saveBookmarks([bm, ...bookmarks])
    }
  }

  const filteredNotes = notes.filter(n => {
    if (search && !n.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const isBookmarked = bookmarks.some(b => b.moduleId === moduleId && b.title.includes(lessonId))

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <button onClick={() => setActiveTab('notes')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'notes' ? 'bg-[#1e293b] text-slate-100 border border-[#334155]' : 'text-slate-500 hover:text-slate-300'}`}><StickyNote className="w-4 h-4" />Notes {notes.length > 0 && `(${notes.length})`}</button>
          <button onClick={() => setActiveTab('bookmarks')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'bookmarks' ? 'bg-[#1e293b] text-slate-100 border border-[#334155]' : 'text-slate-500 hover:text-slate-300'}`}><Bookmark className="w-4 h-4" />Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}</button>
        </div>
        <button onClick={toggleBookmark} className={`ml-auto w-9 h-9 rounded-xl border flex items-center justify-center transition-colors touch-manipulation ${isBookmarked ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-slate-300'}`}>
          <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {activeTab === 'notes' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <StickyNote className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add note for this lesson — markdown supported — e.g., WPS 11k PIN flaw" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30" />
            </div>
            <button onClick={addNote} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-glow-violet touch-manipulation min-h-[40px]"><Save className="w-4 h-4" />Save</button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 text-[12px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-[#334155]/60" />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#020617]/40 border border-dashed border-[#1e293b]/40">
                <StickyNote className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <div className="text-[13px] text-slate-500">No notes yet</div>
                <div className="text-[11px] text-slate-600 mt-1">Add your first note — searchable, exportable, synced localStorage + backend ready</div>
              </div>
            ) : filteredNotes.map((note, idx) => (
              <motion.div key={note.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:bg-[#020617]/80 hover:border-[#334155]/40 group">
                <div className="text-[13px] text-slate-300 leading-relaxed">{note.content}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <Clock className="w-3 h-3" />{new Date(note.createdAt).toLocaleString()} • {note.moduleId}/{note.lessonId}
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="w-6 h-6 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {notes.length > 0 && (
            <button onClick={() => { const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `wififorge-notes-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url) }} className="w-full py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[12px] text-slate-400 hover:text-slate-200 transition-colors">Export Notes JSON • {notes.length} notes</button>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
          {bookmarks.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-[#020617]/40 border border-dashed border-[#1e293b]/40">
              <Bookmark className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <div className="text-[13px] text-slate-500">No bookmarks yet</div>
              <div className="text-[11px] text-slate-600 mt-1">Bookmark lessons, labs, commands, filters — quick access sidebar — enterprise</div>
            </div>
          ) : bookmarks.map(b => (
            <div key={b.id} className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0"><Bookmark className="w-4 h-4 text-amber-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-slate-200 truncate">{b.title}</div>
                <div className="text-[10px] font-mono text-slate-500">{b.type} • {new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => saveBookmarks(bookmarks.filter(x => x.id !== b.id))} className="w-7 h-7 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
