import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, RotateCcw, CheckCircle, X, Zap, Award, Clock, Target } from 'lucide-react'

interface Card {
  id: string
  front: string
  back: string
  category: 'term' | 'command' | 'filter'
  difficulty: number // 0-5 SM-2
  nextReview: string
}

const initialCards: Card[] = [
  { id: '1', front: 'What is BSSID?', category: 'term', back: 'Basic Service Set Identifier — MAC of AP, unique per AP, e.g., aa:bb:cc:11:22:33', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '2', front: 'iw dev', category: 'command', back: 'List wireless interfaces — shows managed/monitor mode, type, channel', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '3', front: 'wlan.fc.type == 0 && wlan.fc.subtype == 8', category: 'filter', back: 'Beacon frames — AP advertisements, SSID, BSSID, channel, security, WPS IE', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '4', front: 'What is PMF?', category: 'term', back: 'Protected Management Frames — 802.11w — prevents deauth/disassoc spoofing, required for WPA3', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '5', front: 'airodump-ng wlan0mon', category: 'command', back: 'Recon — enumerate APs, clients, BSSID, SSID, channel, encryption, WPS, handshake capture indicator', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '6', front: 'eapol', category: 'filter', back: '4-way handshake — 4 EAPOL messages, ANonce, SNonce, MIC, install PTK, needed for offline crack', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '7', front: 'WPS PIN flaw?', category: 'term', back: '11k attempts — 10^4 + 10^3 — external registrar PIN brute-force, not rate-limited early implementations, disable WPS', difficulty: 0, nextReview: new Date().toISOString() },
  { id: '8', front: 'hashcat -m 22000', category: 'command', back: 'WPA2-PSK crack — hashcat mode 22000 for .hc22000, wordlist rockyou.txt, rules', difficulty: 0, nextReview: new Date().toISOString() },
]

export const INITIAL_CARD_COUNT = initialCards.length

export function Flashcards({ className = '' }: { className?: string }) {
  const [cards, setCards] = useState<Card[]>(() => {
    try { const saved = JSON.parse((localStorage.getItem('platform-flashcards') || localStorage.getItem('wififorge-flashcards') || 'null')); return saved || initialCards } catch { return initialCards }
  })
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })

  useEffect(() => { try { if (typeof localStorage !== 'undefined') { localStorage.setItem('platform-flashcards', JSON.stringify(cards)); localStorage.setItem('wififorge-flashcards', JSON.stringify(cards)) } } catch {} }, [cards])

  const card = cards[current]
  if (!card) return null

  const handleAnswer = (correct: boolean) => {
    const updated = [...cards]
    if (correct) {
      updated[current] = { ...card, difficulty: Math.min(card.difficulty + 1, 5), nextReview: new Date(Date.now() + (card.difficulty + 1) * 24 * 60 * 60 * 1000).toISOString() }
      setStats({ ...stats, correct: stats.correct + 1 })
    } else {
      updated[current] = { ...card, difficulty: 0, nextReview: new Date().toISOString() }
      setStats({ ...stats, wrong: stats.wrong + 1 })
    }
    setCards(updated)
    setFlipped(false)
    setCurrent((current + 1) % cards.length)
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">Flashcards — spaced repetition</h3>
          <p className="text-[11px] text-slate-500 font-mono">{cards.length} cards • {stats.correct} correct • {stats.wrong} wrong • {Math.round((stats.correct/(stats.correct+stats.wrong||1))*100)}% accuracy</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">SM-2</span>
        </div>
      </div>

      <div className="relative h-[220px] xs:h-[240px] mb-4">
        <AnimatePresence mode="wait">
          <motion.div key={`${card.id}-${flipped}`} initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }} transition={{ duration: 0.3 }} onClick={() => setFlipped(!flipped)} className="absolute inset-0 p-6 rounded-xl bg-[#020617]/80 border border-[#334155]/60 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#020617]/90 hover:border-[#475569]/60 transition-colors group">
            <div className={`absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full border font-mono ${card.category === 'term' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : card.category === 'command' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>{card.category.toUpperCase()}</div>
            <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-500 font-mono">Difficulty {card.difficulty}/5</div>
            <div className="text-[16px] xs:text-[18px] font-bold text-slate-100 leading-tight">{flipped ? card.back : card.front}</div>
            <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5"><RotateCcw className="w-3 h-3" />Click to flip • {flipped ? 'Answer' : 'Question'}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <div className="flex gap-3">
          <button onClick={() => handleAnswer(false)} className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-red-500/15 transition-colors touch-manipulation min-h-[44px]"><X className="w-4 h-4" />Wrong — Again</button>
          <button onClick={() => handleAnswer(true)} className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-emerald-500/15 transition-colors touch-manipulation min-h-[44px]"><CheckCircle className="w-4 h-4" />Correct — Easy</button>
        </div>
      )}

      {!flipped && (
        <div className="p-3 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/10 flex items-center gap-2 text-[11px] text-slate-500">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{INITIAL_CARD_COUNT} cards drawn from the shipped terms, commands and filters — difficulty 0–5, next review auto-scheduled from your own answers. Your deck is stored in this browser.</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-500">{current + 1}/{cards.length} • Next review: {new Date(card.nextReview).toLocaleDateString()}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{stats.correct}✓ {stats.wrong}✗</span>
          <div className="w-20 h-1.5 bg-[#020617] rounded-full overflow-hidden border border-[#1e293b]/40"><div className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full" style={{ width: `${((current+1)/cards.length)*100}%` }} /></div>
        </div>
      </div>
    </div>
  )
}
