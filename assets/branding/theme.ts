/**
 * WiFiForge — Design Tokens
 * Locked: 2026-09-28 — Technical Professional Direction
 */

export const theme = {
  name: "WiFiForge — Technical Professional",
  colors: {
    background: {
      primary: "#020617", // slate-950 - main app bg
      secondary: "#0f172a", // slate-900 - card bg
      surface: "#1e293b", // slate-800 - elevated surface
      surfaceHover: "#27354f",
      border: "#334155", // slate-700
      borderLight: "#475569", // slate-600
    },
    text: {
      primary: "#f1f5f9", // slate-100
      secondary: "#94a3b8", // slate-400
      muted: "#64748b", // slate-500
      inverse: "#020617",
    },
    accent: {
      cyan: "#22d3ee", // primary - Wi-Fi waves, CTA
      cyanHover: "#06b6d4",
      cyanMuted: "rgba(34, 211, 238, 0.1)",
      violet: "#a78bfa", // secondary - enterprise/RADIUS
      violetHover: "#8b5cf6",
      violetMuted: "rgba(167, 139, 250, 0.1)",
      emerald: "#34d399", // success
      amber: "#fbbf24", // warning
      red: "#f87171", // danger
      pink: "#f472b6", // code highlight
    },
    status: {
      locked: "#475569",
      notStarted: "#334155",
      inProgress: "#22d3ee",
      completed: "#34d399",
    },
    terminal: {
      bg: "#0a0f1c",
      green: "#00ff88",
      amber: "#ffb000",
      cyan: "#22d3ee",
    }
  },
  font: {
    heading: "'Sora', 'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: "12px",
    sm: "13px",
    base: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  shadow: {
    card: "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.3)",
    cardHover: "0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.4)",
    glowCyan: "0 0 20px rgba(34, 211, 238, 0.15)",
    glowViolet: "0 0 20px rgba(167, 139, 250, 0.15)",
  },
  animation: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "350ms ease",
  }
} as const;

export type Theme = typeof theme;

// Tailwind config extension suggestion
export const tailwindExtension = {
  colors: {
    wififorge: {
      bg: theme.colors.background.primary,
      card: theme.colors.background.secondary,
      surface: theme.colors.background.surface,
      border: theme.colors.background.border,
      cyan: theme.colors.accent.cyan,
      violet: theme.colors.accent.violet,
      emerald: theme.colors.accent.emerald,
      amber: theme.colors.accent.amber,
    }
  },
  fontFamily: {
    heading: theme.font.heading.split(","),
    body: theme.font.body.split(","),
    mono: theme.font.mono.split(","),
  }
}
