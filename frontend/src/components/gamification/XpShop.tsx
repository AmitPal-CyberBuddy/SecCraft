import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Zap, Star, Crown, Palette, Eye, Shield, Award, Gift } from 'lucide-react'
import { useProgressStore } from '@/store/useProgressStore'

interface ShopItem {
  id: string
  title: string
  desc: string
  cost: number
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  owned: boolean
}

export function XpShop({ className = '' }: { className?: string }) {
  const totalXp = useProgressStore(s => s.getTotalXp())
  const [items, setItems] = useState<ShopItem[]>([
    { id: 'theme-cyber', title: 'Cyber Theme', desc: 'Neon cyberpunk theme — cyan + violet glow', cost: 100, icon: '🎨', rarity: 'rare', owned: false },
    { id: 'badge-gold', title: 'Gold Badge Frame', desc: 'Legendary gold frame for badges', cost: 250, icon: '👑', rarity: 'legendary', owned: false },
    { id: 'hint-pack', title: 'Hint Pack x5', desc: '5 extra hints for labs — no XP penalty', cost: 50, icon: '💡', rarity: 'common', owned: false },
    { id: 'streak-freeze', title: 'Streak Freeze', desc: 'Protect streak 1 day — keep 🔥', cost: 75, icon: '🧊', rarity: 'rare', owned: false },
    { id: 'cert-gold', title: 'Gold Certificate', desc: 'Gold foil certificate with QR', cost: 500, icon: '📜', rarity: 'legendary', owned: false },
    { id: 'avatar-cyber', title: 'Cyber Avatar', desc: 'Animated cyber avatar — exclusive', cost: 150, icon: '🤖', rarity: 'epic', owned: false },
  ])

  const buy = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item || item.owned || totalXp < item.cost) return
    setItems(items.map(i => i.id === id ? { ...i, owned: true } : i))
  }

  const getRarityColor = (r: string) => {
    switch(r) {
      case 'common': return 'bg-slate-500/10 border-slate-500/20 text-slate-400'
      case 'rare': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
      case 'epic': return 'bg-violet-500/10 border-violet-500/20 text-violet-400'
      case 'legendary': return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
      default: return 'bg-[#1e293b] border-[#334155] text-slate-500'
    }
  }

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">XP Shop — Spend XP • Rewards • Enterprise</h3>
          <p className="text-[11px] text-slate-500 font-mono">Your XP: {totalXp} • Spend for themes, badges, hints, streak freeze, cert gold</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono flex items-center gap-1"><Zap className="w-3 h-3" />{totalXp} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -2, scale: 1.02 }} className={`p-4 rounded-xl border flex flex-col min-w-0 ${item.owned ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#020617]/60 border-[#1e293b]/60 hover:bg-[#020617]/80 hover:border-[#334155]/60'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[24px]">{item.icon}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${getRarityColor(item.rarity)}`}>{item.rarity}</span>
            </div>
            <div className="text-[13px] font-bold text-slate-100 leading-tight">{item.title}</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed flex-1">{item.desc}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] font-bold font-mono text-amber-300 flex items-center gap-1"><Zap className="w-3 h-3" />{item.cost} XP</span>
              {item.owned ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">Owned</span>
              ) : (
                <button onClick={() => buy(item.id)} disabled={totalXp < item.cost} className="px-3 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[11px] font-medium text-slate-300 hover:bg-[#25354f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation">
                  Buy
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 flex items-center gap-2 text-[11px] text-slate-500">
        <Gift className="w-4 h-4 text-amber-400 shrink-0" />
        <span><span className="font-semibold text-amber-300">Enterprise:</span> XP shop retention mechanic — spend XP for cosmetics, hints, streak freeze, gold cert — real swag mock — 1000+ operators — anti-cheat — production.</span>
      </div>
    </div>
  )
}
