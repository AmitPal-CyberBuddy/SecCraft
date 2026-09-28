# Branding Decision — Locked

**Date:** 2026-09-28
**Decided by:** Architect (per user delegation)

## Final Lock

- **Product Name:** WiFiForge
- **Full Title:** WiFiForge — Wireless Pentest Academy
- **Short Name / Package:** wififorge
- **Repo Name:** WiFiForge (keep as-is, GitHub: AmitPal-CyberBuddy/WiFiForge)
- **Primary Tagline:** Forge. Break. Fix. Retest.
- **Secondary Tagline:** Understand the Protocol. Test the Implementation.
- **Tertiary / Hero Sub:** The Wireless Pentest Lab You Control.
- **Visual Direction:** Technical Professional — Dark slate + cyan + violet
- **Voice:** Senior pentester as mentor — professional, technical, no l33t speak, no corporate fluff

## Rationale

1. **WiFiForge** is already in use, short, memorable, verb-driven, extensible to CLI (`wififorge`), Docker (`wififorge/academy`), future hardware labs.
2. **Dot11** was strong but alienates beginners. **AirForge** is good but loses Wi-Fi SEO. WiFiForge balances both.
3. **Technical Professional** theme matches HTB Academy but with own identity — dark, information-dense, readable for long-form learning. Avoids neon hacker cliché and boring corporate white.
4. Repo keep capital W/F for brand — GitHub is case-insensitive, package.json will use lowercase `wififorge`.

## Palette — Locked Tokens

```js
// theme.ts
export const theme = {
  colors: {
    bg: {
      950: "#020617", // main bg
      900: "#0f172a", // card bg
      800: "#1e293b", // surface
      700: "#334155", // border
    },
    text: {
      primary: "#f1f5f9", // slate-100
      secondary: "#94a3b8", // slate-400
      muted: "#64748b", // slate-500
    },
    accent: {
      cyan: "#22d3ee", // primary - Wi-Fi waves
      violet: "#a78bfa", // secondary - enterprise
      emerald: "#34d399", // success
      amber: "#fbbf24", // warning
      red: "#f87171", // danger
      pink: "#f472b6", // code highlight
    },
    terminal: {
      green: "#00ff88",
      amber: "#ffb000",
    }
  },
  font: {
    heading: "'Sora', 'Space Grotesk', sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  }
}
```

## Logo — Locked Concept: Forge Mark

Icon: Rounded square (slate-900, slate-700 border)
- Anvil silhouette (slate-100)
- 3 Wi-Fi arcs above anvil (cyan-400, opacity 100%/70%/40%)
- Spark dot (amber-400) at hammer strike point

Wordmark:
- WiFi (slate-100, Sora Bold)
- Forge (cyan-400, Sora Bold)
- Subtitle: WIRELESS PT ACADEMY (Inter, 10px, letter-spacing 0.2em, slate-400)

Favicon: Just the Forge Mark icon (anvil + waves)

## Typography Scale

- H1: Sora Bold 36px / 40px
- H2: Sora Semibold 24px / 32px
- H3: Sora Medium 18px / 28px
- Body: Inter Regular 14px / 22px
- Small: Inter 12px / 16px
- Mono: JetBrains Mono 13px

## Application

- Browser Title: WiFiForge — Dashboard | WiFiForge — Wi-Fi Fundamentals
- Sidebar: WiFiForge + WIRELESS PT ACADEMY subtitle
- OG Image: Dark bg + logo + tagline
- README Header: Banner with logo + tagline
- CLI Banner: ASCII art (see BRANDING.md)

## Next Steps

- [x] Decision locked
- [ ] Generate logo SVG/PNG
- [ ] Create theme.ts
- [ ] Update README.md
- [ ] Create favicon.svg
- [ ] Proceed to Phase A scaffolding
