import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle, Award, Zap, Trophy, Shield, Target, Clock } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

interface Notif {
  id: string
  type: 'xp' | 'achievement' | 'lab' | 'system'
  title: string
  desc: string
  time: string
  read: boolean
  icon: any
  color: string
}

const mockNotifs: Notif[] = [
  { id: '1', type: 'xp', title: '+50 XP — Module Complete', desc: '02-wifi-fundamentals completed — 120 XP total', time: '2m ago', read: false, icon: Zap, color: 'amber' },
  { id: '2', type: 'achievement', title: 'Achievement Unlocked — Explorer', desc: 'Complete 5 lessons — +25 XP bonus', time: '1h ago', read: false, icon: Award, color: 'violet' },
  { id: '3', type: 'lab', title: 'Lab Completed — Beacon Analysis', desc: 'beacon-only.pcapng — 5 frames analyzed — +25 XP', time: '3h ago', read: false, icon: Shield, color: 'emerald' },
  { id: '4', type: 'system', title: 'Daily Challenges Reset', desc: 'New challenges available — 4 tasks • 115 XP today', time: '5h ago', read: true, icon: Target, color: 'cyan' },
  { id: '5', type: 'xp', title: '+10 XP — Lesson Complete', desc: 'SSID vs BSSID vs ESSID — 02-wifi-fundamentals', time: '1d ago', read: true, icon: CheckCircle, color: 'cyan' },
]

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notif[]>(mockNotifs)
  const totalXp = useProgressStore(s => s.getTotalXp())

  const unread = notifs.filter(n => !n.read).length

  const markAllRead = () => setNotifs(notifs.map(n => ({ ...n, read: true })))
  const markRead = (id: string) => setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-[#020617]/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, x: 20, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.98 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed top-0 right-0 h-[100dvh] w-[min(400px,92vw)] z-[100] bg-[#0f172a] border-l border-[#1e293b] shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[15px] text-slate-100">Notifications • {unread} unread</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{totalXp} XP • Enterprise • Real-time ready</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center hover:bg-[#25354f] transition-colors touch-manipulation">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 border-b border-[#1e293b]/60 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">{notifs.length} notifications • {unread} unread</span>
              <button onClick={markAllRead} className="text-[11px] px-2.5 py-1 rounded-full bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-slate-200 transition-colors">Mark all read</button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {notifs.map((n, idx) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => markRead(n.id)} className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${n.read ? 'bg-[#020617]/40 border-[#1e293b]/40 opacity-70' : 'bg-[#020617]/80 border-[#334155]/60 hover:bg-[#020617]/90'}`}>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${n.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' : n.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20' : n.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                    <n.icon className={`w-4 h-4 ${n.color === 'amber' ? 'text-amber-400' : n.color === 'violet' ? 'text-violet-400' : n.color === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium truncate ${n.read ? 'text-slate-400' : 'text-slate-100'}`}>{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.desc}</div>
                    <div className="text-[10px] font-mono text-slate-600 mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />{n.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 border-t border-[#1e293b] bg-[#020617]/40 shrink-0">
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Real-time ready — WebSocket • Push • Enterprise • Production</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
