# WiFiForge — Branding & Naming Guide
> Options for product name, repo name, visual identity

## 1. Current State Analysis

**Current Repo:** `AmitPal-CyberBuddy/WiFiForge`
**Current README Title:** `WiFiForge — Interactive Wi-Fi Penetration Testing Academy & Lab`
**Requirement doc suggests:** `Wireless PT Academy` / `📡 Wireless PT Academy`

**Verdict on WiFiForge:**
- ✅ Short, memorable, 2 syllables + 1 syllable
- ✅ Verb: "Forge" = build, craft, forge skills, forge packets/labs
- ✅ Feels like a tool (like BloodHound, Hashcat) not just a course
- ✅ Works for both simulated + hardware future
- ✅ Good for domain, CLI tool name later (`wififorge-cli`)
- ⚠️ Slightly generic — there are other WiFiForge repos (but none are academy-style)
- **Recommendation: KEEP WiFiForge as core, expand with subtitle for clarity**

Full product name: **WiFiForge — Wireless Pentest Academy**
Short: **WiFiForge**
CLI / Package: `wififorge`

---

## 2. Name Options — 7 Candidates Ranked

### Option A: WiFiForge (RECOMMENDED — Keep)
**Full:** WiFiForge — Wireless PT Academy
**Tagline:** Forge. Break. Fix. Retest.
**Pros:** You already have repo, brandable, tool-like, extensible to Enterprise later (WiFiForge Enterprise Labs)
**Cons:** Minor collision with small GitHub projects, but none in academy space
**Repo:** `WiFiForge` or `wifi-forge`
**Domain ideas:** wififorge.dev, wififorge.academy, wififorge.lab

### Option B: AirForge Academy
**Tagline:** Learn the Air. Own the Air.
**Rationale:** "Air" = wireless airspace, "Forge" kept. More professional, less "WiFi" consumer feel.
**Pros:** More corporate VAPT friendly, sounds like Airgap/Airborne
**Cons:** Loses explicit Wi-Fi SEO
**Repo:** `airforge` / `airforge-academy`

### Option C: Dot11 Academy (802.11)
**Full:** Dot11 Academy — The 802.11 Pentest Lab
**Tagline:** Understand 802.11. Test 802.11.
**Rationale:** Direct protocol reference, signals depth, pro audience will instantly get it
**Pros:** Very technical, stands out, great for HTB-like audience
**Cons:** Beginners may not know Dot11 = Wi-Fi, harder to pronounce
**Repo:** `dot11-academy`

### Option D: Beacon Academy
**Tagline:** Every Network Beacons. Learn to Listen.
**Rationale:** Beacon frames are first thing you see in recon — poetic + technical
**Pros:** Unique, memorable, story-driven (recon starts with beacons)
**Cons:** Could be confused with other Beacon LMS products
**Repo:** `beacon-academy`

### Option E: Spectrum Lab
**Tagline:** See the Invisible Spectrum.
**Rationale:** RF spectrum focus, future-proof for BLE/Zigbee/SDR expansion
**Pros:** Broadens scope naturally beyond Wi-Fi
**Cons:** More SDR/RF than Wi-Fi PT focused
**Repo:** `spectrum-lab`

### Option F: AetherSec Academy
**Full:** AetherSec — Wireless Security Academy
**Tagline:** Security in the Aether.
**Rationale:** "Aether" = ancient term for air/sky, used in wireless. Sounds premium/corporate.
**Pros:** Unique, brandable, professional
**Cons:** Harder to spell, less intuitive
**Repo:** `aethersec`

### Option G: WaveLab
**Tagline:** Learn. Observe. Enumerate. Exploit.
**Rationale:** Short, friendly
**Pros:** Easy
**Cons:** Too generic, many WaveLabs exist

### My Ranked Recommendation:
1. **WiFiForge** (keep, add subtitle) — Best balance of brand + clarity
2. **Dot11 Academy** — If you want ultra-technical pro positioning
3. **AirForge** — If you want corporate VAPT positioning

---

## 3. Tagline Options

Current requirement suggests: `Learn. Observe. Enumerate. Test. Exploit. Fix. Retest.`

Refined options:

**For WiFiForge:**
- **Primary:** `Forge. Break. Fix. Retest.` (short, loop, VAPT mindset)
- **Alt 1:** `Learn • Observe • Test • Report` (clean, methodology)
- **Alt 2:** `Understand the Protocol. Test the Implementation.` (professional, my favorite for pro positioning)
- **Alt 3:** `From Beacons to Reports.` (journey-based)
- **Alt 4:** `The Wireless Pentest Lab You Control.` (local-first emphasis)

**Recommendation:** Use primary for hero, Alt 2 for docs/footer.

---

## 4. Visual Identity — 3 Directions

### Direction 1: Technical Professional (RECOMMENDED)
**Inspired by:** Linear, Vercel, HTB Academy (clean, not neon hacker)
**Palette:**
- Bg: `#020617` slate-950, `#0f172a` slate-900
- Surface: `#1e293b` slate-800, border `#334155` slate-700
- Primary: `#22d3ee` cyan-400 (Wi-Fi waves)
- Secondary: `#a78bfa` violet-400 (enterprise/RADIUS)
- Success: `#34d399` emerald-400
- Warning: `#fbbf24` amber-400
- Danger: `#f87171` red-400
- Text: `#f1f5f9` slate-100 / `#94a3b8` slate-400
- Code: `#22d3ee` + `#f472b6` pink for highlights

**Typography:**
- Headings: `Sora` or `Space Grotesk` — geometric, technical, modern
- Body: `Inter` — highly readable
- Mono/Code/Terminal: `JetBrains Mono` — industry standard

**Logo Concept:**
- Wordmark: `WiFiForge` with `Fi` ligature forming Wi-Fi waves
- Icon: Minimalist shield + 3 Wi-Fi arcs + anvil/hammer negative space. Or: `WF` monogram where W is formed by 2 beacons
- No excessive glow, just subtle cyan dot grid

### Direction 2: Terminal / Hacker Minimal
**Palette:** Black `#000`, green `#00ff88`, amber `#ffb000`
**Typography:** All mono `JetBrains Mono`
**Logo:** ASCII-style `[WF]` or `>_` with Wi-Fi
**Pros:** Authentic hacker feel
**Cons:** Can feel cliché, less corporate, harder to read long-form

### Direction 3: Corporate VAPT Report Style
**Palette:** White/light gray bg, navy `#0a192f`, blue `#0070f3`
**Typography:** `Inter` + `IBM Plex Mono`
**Logo:** Simple wordmark, no icon
**Pros:** Looks like professional pentest report
**Cons:** Loses academy/lab excitement

**My Recommendation:** Direction 1 with subtle terminal elements. Professional enough for corporate report, technical enough for HTB audience.

---

## 5. Logo Concepts (Text Description for Generation)

**Concept A — The Forge Mark (Recommended):**
```
Icon: 32x32 rounded square (slate-900 bg, slate-700 border)
Center: Anvil silhouette (slate-100)
Above anvil: 3 Wi-Fi arcs emanating (cyan-400, decreasing opacity)
Below: Small hammer striking, creating a spark (amber-400 dot)
Wordmark to right: WiFiForge (Sora Bold, WiFi in slate-100, Forge in cyan-400)
```

**Concept B — Beacon Shield:**
```
Shield outline (slate-700) with 3 curved lines inside (beacon)
Center dot = AP, small dots = clients
Wordmark: WiFiForge
```

**Concept C — Dot11 Monogram:**
```
Monogram: WF where W is made of 2 overlapping Wi-Fi signal cones
Background: subtle dot grid
Wordmark: WiFiForge — WIRELESS PT ACADEMY (small caps)
```

---

## 6. Repo Naming — Best Practice

GitHub best practice: lowercase, hyphenated, no spaces.

**Options:**
- `WiFiForge` — Current, okay, but capital letters unusual (keeps brand)
- `wififorge` — Clean, matches npm/pip package name (RECOMMENDED for code)
- `wifi-forge` — Most readable, SEO friendly
- `wififorge-academy` — Explicit, good if you plan multiple repos (wififorge-cli, wififorge-labs)
- `wireless-pt-academy` — Descriptive but long, loses brand

**Recommendation:**
- **GitHub Repo:** Keep `WiFiForge` for brand consistency OR rename to `wififorge` (lowercase) — GitHub will redirect
- **NPM Package:** `wififorge`
- **Python Package:** `wififorge`
- **Docker Image:** `wififorge/academy`
- **Local Folder:** `wififorge/`

If you want monorepo clarity later:
```
wififorge/
  apps/web
  apps/api
  packages/content
```

But for now single repo is perfect.

---

## 7. App Naming Inside Product

- **Browser Tab:** `WiFiForge — Dashboard` / `WiFiForge — Wi-Fi Fundamentals`
- **Sidebar Header:** `WiFiForge` + small `WIRELESS PT ACADEMY` subtitle
- **CLI Banner (future):**
```
 _    _ _  __ _ _____                     
| |  | (_)/ _(_)_   _|                    
| |  | |_| |_  _ | | ___  _ __ __ _  ___ 
| |/\| | |  _| || |/ _ \| '__/ _` |/ _ \
\  /\  / | | | || | (_) | | | (_| |  __/
 \/  \/|_|_| |_||_|\___/|_|  \__, |\___|
                              __/ |     
                             |___/      
 Forge. Break. Fix. Retest.
```

---

## 8. Final Recommendation — My Pick

**Product Name:** **WiFiForge**
**Full Title:** **WiFiForge — Wireless Pentest Academy**
**Tagline:** **Forge. Break. Fix. Retest.**
**Secondary Tagline (docs):** Understand the Protocol. Test the Implementation.
**Repo Name:** Keep `WiFiForge` (or lowercase to `wififorge` — I can rename)
**Visual:** Direction 1 — Dark slate + cyan + violet, Sora + Inter + JetBrains Mono
**Logo:** Concept A — Forge Mark (anvil + Wi-Fi arcs)
**Voice:** Professional, technical, consultant-like — not "hacker l33t", not corporate boring. Like a senior pentester teaching you.

---

## 9. Next Steps After You Choose

1. I generate 2-3 logo variants (SVG + PNG) in chosen direction
2. I create `frontend/src/styles/theme.ts` with palette + typography tokens
3. I update `README.md` + `package.json` + `index.html` title
4. We lock favicon + OG image
5. Then proceed to Phase A scaffolding

What name/direction do you want?
