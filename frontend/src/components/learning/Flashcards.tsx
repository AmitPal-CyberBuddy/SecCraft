import { useState, useEffect, useRef, useId } from 'react'
import { LearningProgress } from './LearningProgress'
import { Brain, RotateCcw, CheckCircle, X, Zap } from 'lucide-react'

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
  const faceId = useId()
  const flipRef = useRef<HTMLButtonElement>(null)
  const revealedRef = useRef(false)
  const [feedback, setFeedback] = useState('')
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
    if (!revealedRef.current) return
    revealedRef.current = false
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
    setFeedback(`${correct ? 'Marked correct.' : 'Marked for review.'} Card ${(current + 1) % cards.length + 1} of ${cards.length}. Local practice only.`)
    flipRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className={`rounded-2xl bg-[var(--panel-bg)] border border-[var(--line-normal)] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[var(--owner-bg)] border border-[var(--owner-border)] flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-[var(--owner)]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-[var(--ink-primary)]">Flashcards — spaced repetition</h3>
          <p className="text-[11px] text-[var(--ink-muted)] font-mono">{cards.length} cards • {stats.correct} correct • {stats.wrong} wrong • {Math.round((stats.correct/(stats.correct+stats.wrong||1))*100)}% accuracy</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--owner-bg)] border border-[var(--owner-border)] text-[var(--owner)] font-mono">SM-2</span>
        </div>
      </div>

      <button ref={flipRef} type="button" className="sc-flashcard-face" data-face={flipped ? 'answer' : 'question'} aria-label={flipped ? 'Flip to question' : 'Flip to answer'} aria-describedby={faceId} onClick={() => {
        revealedRef.current = !revealedRef.current
        setFlipped(revealedRef.current)
      }}>
        <span className="sc-flashcard-meta"><span>{card.category.toUpperCase()}</span><span>Difficulty {card.difficulty}/5</span></span>
        <span id={faceId} className="sc-flashcard-copy" aria-live="polite" aria-atomic="true">{flipped ? card.back : card.front}</span>
        <span className="sc-flashcard-caption"><RotateCcw size={14} aria-hidden="true" />{flipped ? 'Answer · activate to return to question' : 'Question · activate to reveal answer'}</span>
      </button>

      <div className="sc-flashcard-ratings flex gap-3">
          <button type="button" disabled={!flipped} onClick={() => handleAnswer(false)} className="flex-1 py-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-[var(--danger-bg)] transition-colors touch-manipulation min-h-[44px]"><X className="w-4 h-4" />Wrong — Again</button>
          <button type="button" disabled={!flipped} onClick={() => handleAnswer(true)} className="flex-1 py-3 rounded-xl bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success)] font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-[var(--success-bg)] transition-colors touch-manipulation min-h-[44px]"><CheckCircle className="w-4 h-4" />Correct — Easy</button>
      </div>
      <p className="sc-learning-feedback" role="status" aria-live="polite">{feedback}</p>

      <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
          <Zap className="w-4 h-4 text-[var(--learning)] shrink-0" />
          <span>{INITIAL_CARD_COUNT} cards drawn from the shipped terms, commands and filters — difficulty 0–5, next review auto-scheduled from your own answers. Your deck is stored in this browser.</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono">
        <span className="text-[var(--ink-muted)]">{current + 1}/{cards.length} • Next review: {new Date(card.nextReview).toLocaleDateString()}</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--ink-secondary)]">{stats.correct}✓ {stats.wrong}✗</span>
          <div className="w-20 h-1.5 bg-[var(--panel-inset)] rounded-full overflow-hidden border border-[var(--line-normal)]"><LearningProgress value={((current + 1) / cards.length) * 100} label="Position in flashcard deck" /></div>
        </div>
      </div>
    </div>
  )
}
