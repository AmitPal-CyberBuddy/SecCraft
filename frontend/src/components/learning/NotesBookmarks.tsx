import { useState, useEffect } from 'react'
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
    try { return JSON.parse(localStorage.getItem('platform-notes') || localStorage.getItem('wififorge-notes') || '[]') } catch { return [] }
  })
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('platform-bookmarks') || localStorage.getItem('wififorge-bookmarks') || '[]') } catch { return [] }
  })
  const [newNote, setNewNote] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes')

  const saveNotes = (n: Note[]) => { setNotes(n); try { localStorage.setItem('platform-notes', JSON.stringify(n)); localStorage.setItem('wififorge-notes', JSON.stringify(n)) } catch {} }
  const saveBookmarks = (b: BookmarkItem[]) => { setBookmarks(b); try { localStorage.setItem('platform-bookmarks', JSON.stringify(b)); localStorage.setItem('wififorge-bookmarks', JSON.stringify(b)) } catch {} }

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
    <div className={`rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)]">
          <button onClick={() => setActiveTab('notes')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'notes' ? 'bg-[var(--panel-raised)] text-[var(--ink-primary)] border border-[var(--line-strong)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'}`}><StickyNote className="w-4 h-4" />Notes {notes.length > 0 && `(${notes.length})`}</button>
          <button onClick={() => setActiveTab('bookmarks')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'bookmarks' ? 'bg-[var(--panel-raised)] text-[var(--ink-primary)] border border-[var(--line-strong)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'}`}><Bookmark className="w-4 h-4" />Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}</button>
        </div>
        <button aria-label={isBookmarked ? 'Remove module bookmark' : 'Bookmark module'} aria-pressed={isBookmarked} onClick={toggleBookmark} className={`ml-auto w-11 h-11 rounded-xl border flex items-center justify-center transition-colors touch-manipulation ${isBookmarked ? 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--attention)]' : 'bg-[var(--panel-raised)] border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'}`}>
          <Star className={`w-4 h-4 ${isBookmarked ? 'fill-[var(--attention)]' : ''}`} />
        </button>
      </div>

      {activeTab === 'notes' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <StickyNote className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Add note for this lesson — markdown supported — e.g., WPS 11k PIN flaw" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--accent-border)]" />
            </div>
            <button onClick={addNote} className="sc-learning-action px-4 py-2.5 rounded-xl font-semibold text-[12px] flex items-center gap-1.5 shadow-soft touch-manipulation min-h-[40px]"><Save className="w-4 h-4" />Save</button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input aria-label="Search module notes" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] text-[12px] text-[var(--ink-secondary)] placeholder:text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--line-strong)]" />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[var(--panel-inset)] border border-dashed border-[var(--line-normal)]">
                <StickyNote className="w-6 h-6 text-[var(--ink-secondary)] mx-auto mb-2" />
                <div className="text-[13px] text-[var(--ink-muted)]">No notes yet</div>
                <div className="text-[11px] text-[var(--ink-secondary)] mt-1">Add your first note — searchable, exportable, saved in this browser</div>
              </div>
            ) : filteredNotes.map(note => (
              <div key={note.id} className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] hover:bg-[var(--panel-inset)] hover:border-[var(--line-strong)] group">
                <div className="text-[13px] text-[var(--ink-secondary)] leading-relaxed">{note.content}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-muted)]">
                    <Clock className="w-3 h-3" />{new Date(note.createdAt).toLocaleString()} • {note.moduleId}/{note.lessonId}
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="w-6 h-6 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--danger-bg)] hover:border-[var(--danger-border)] hover:text-[var(--danger)] sc-surface-transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {notes.length > 0 && (
            <button onClick={() => { const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `platform-notes-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url) }} className="w-full py-2.5 rounded-xl bg-[var(--panel-raised)] border border-[var(--line-strong)] text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Export Notes JSON • {notes.length} notes</button>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
          {bookmarks.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-[var(--panel-inset)] border border-dashed border-[var(--line-normal)]">
              <Bookmark className="w-6 h-6 text-[var(--ink-secondary)] mx-auto mb-2" />
              <div className="text-[13px] text-[var(--ink-muted)]">No bookmarks yet</div>
              <div className="text-[11px] text-[var(--ink-secondary)] mt-1">Bookmark lessons, labs, commands and filters — kept in this browser</div>
            </div>
          ) : bookmarks.map(b => (
            <div key={b.id} className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--line-normal)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning-border)] flex items-center justify-center shrink-0"><Bookmark className="w-4 h-4 text-[var(--attention)]" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--ink-primary)] truncate">{b.title}</div>
                <div className="text-[10px] font-mono text-[var(--ink-muted)]">{b.type} • {new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => saveBookmarks(bookmarks.filter(x => x.id !== b.id))} className="w-7 h-7 rounded-lg bg-[var(--panel-raised)] border border-[var(--line-strong)] flex items-center justify-center hover:bg-[var(--danger-bg)] hover:border-[var(--danger-border)] hover:text-[var(--danger)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
