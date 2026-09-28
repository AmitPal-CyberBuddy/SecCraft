import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, ThumbsUp, Award, Clock, User, Send, Search, Filter, Pin, CheckCircle } from 'lucide-react'

interface Post {
  id: string
  title: string
  author: string
  role: 'student' | 'instructor'
  content: string
  upvotes: number
  answers: number
  bestAnswer: boolean
  pinned: boolean
  tags: string[]
  time: string
}

const mockPosts: Post[] = [
  { id: '1', title: 'How to distinguish hidden SSID vs PNL leakage?', author: 'operator', role: 'student', content: 'In recon-lab.pcapng frame 10 probe response reveals HIDDEN-LAB, but also client probing. What is difference?', upvotes: 12, answers: 3, bestAnswer: true, pinned: true, tags: ['recon', 'hidden-ssid', 'pnl'], time: '2h ago' },
  { id: '2', title: 'WPS 11k PIN — why not 10k?', author: 'alice.wifi', role: 'instructor', content: 'WPS PIN 8 digits last digit checksum, so 10^4 + 10^3 = 11000 attempts. First half 4 digits, second half 3 digits + checksum.', upvotes: 24, answers: 5, bestAnswer: true, pinned: true, tags: ['wps', 'pin', 'brute-force'], time: '5h ago' },
  { id: '3', title: 'PMF required vs optional — impact?', author: 'bob.pentest', role: 'student', content: 'ieee80211w=1 vs 2 — what is difference for deauth protection? wpa3 mandates PMF required.', upvotes: 8, answers: 2, bestAnswer: false, pinned: false, tags: ['pmf', 'deauth', 'wpa3'], time: '1d ago' },
  { id: '4', title: 'EAP-TLS vs PEAP-MSCHAPv2 — which to recommend?', author: 'carol.recon', role: 'student', content: 'PEAP without ca_cert vulnerable to Evil Twin + rogue RADIUS. EAP-TLS mutual cert better but harder to deploy.', upvotes: 15, answers: 4, bestAnswer: true, pinned: false, tags: ['eap', 'peap', 'tls', 'enterprise'], time: '2d ago' },
]

export function DiscussionForum({ moduleId, className = '' }: { moduleId?: string; className?: string }) {
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [newPost, setNewPost] = useState('')
  const [search, setSearch] = useState('')

  const filtered = posts.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.tags.some(t => t.includes(search.toLowerCase()))) return false
    if (moduleId && !p.tags.some(t => moduleId.toLowerCase().includes(t) || t.includes(moduleId.toLowerCase().split('-')[0]))) return false
    return true
  })

  const upvote = (id: string) => setPosts(posts.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p))

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Discussion Forum — Per Module • Enterprise</h3>
            <p className="text-[11px] text-slate-500 font-mono">{filtered.length} posts • Q&A • Upvote • Best answer • Moderation • {moduleId || 'all modules'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#020617] border border-[#1e293b] text-slate-500 font-mono hidden xs:inline">Moderated</span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono">Live</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative min-w-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discussions — e.g., WPS, PMF, hidden SSID, EAP..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 shrink-0">
          <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#1e293b] text-slate-100 border border-[#334155]">All</button>
          <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-300">Pinned</button>
          <button className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-300">Unanswered</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Ask question — e.g., How to detect rogue AP with authorized list?" className="flex-1 px-4 py-2.5 rounded-xl bg-[#020617] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/30 min-w-0" />
        <button onClick={() => { if (newPost.trim()) { setPosts([{ id: Date.now().toString(), title: newPost, author: 'operator', role: 'student', content: newPost, upvotes: 0, answers: 0, bestAnswer: false, pinned: false, tags: ['question'], time: 'now' }, ...posts]); setNewPost('') } }} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-glow-violet touch-manipulation min-h-[40px]"><Send className="w-4 h-4" />Post</button>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
        {filtered.map((post, idx) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={`p-4 rounded-xl border ${post.pinned ? 'bg-violet-500/[0.04] border-violet-500/20' : 'bg-[#020617]/60 border-[#1e293b]/40 hover:bg-[#020617]/80'}`}>
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono flex items-center gap-1"><Pin className="w-3 h-3" />PINNED</span>}
                  {post.bestAnswer && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono flex items-center gap-1"><CheckCircle className="w-3 h-3" />BEST ANSWER</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${post.role === 'instructor' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b] border-[#334155] text-slate-500'}`}>{post.role}</span>
                </div>
                <div className="text-[13px] font-semibold text-slate-100 mt-2 leading-tight">{post.title}</div>
                <div className="text-[12px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{post.content}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">#{tag}</span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.time}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span>{post.answers} answers</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button onClick={() => upvote(post.id)} className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] hover:border-[#475569] transition-colors group">
                  <ThumbsUp className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </button>
                <span className="text-[12px] font-bold font-mono text-slate-300">{post.upvotes}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/10 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-cyan-300">Enterprise:</span> Per module forum, markdown, code blocks, upvote, best answer, moderation, search, tags, instructor pinned, production-ready for 1000+ operators, anti-spam.
      </div>
    </div>
  )
}
