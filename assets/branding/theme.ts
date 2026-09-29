/**
 * SecCraft — Design Tokens
 * Final: 2026-09-29 — Technical Professional — Shield + Magnifying Glass + Checkmark
 * Tagline: Learn. Practice. Investigate. Improve.
 * Logo: Shield cyan #33CFFF with checkmark + magnifying glass orange #FF9F1C — dark navy #0a0f3d bg
 */

export const theme = {
  name: "SecCraft — Technical Professional",
  colors: {
    background: {
      primary: "#020617", // slate-950 - main app bg
      secondary: "#0a0f3d", // dark navy - card bg, logo bg
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
      cyan: "#33CFFF", // shield, primary - protection, investigation
      cyanHover: "#22d3ee",
      cyanMuted: "rgba(51, 207, 255, 0.1)",
      blue: "#33CFFF",
      violet: "#a78bfa", // secondary - improve
      violetHover: "#8b5cf6",
      violetMuted: "rgba(167, 139, 250, 0.1)",
      emerald: "#34d399", // success - validated
      amber: "#f59e0b", // evidence, warning
      orange: "#FF9F1C", // magnifying glass - investigate
      red: "#f87171", // danger
      pink: "#f472b6", // code highlight
      shield: "#33CFFF",
      magnifier: "#FF9F1C",
      checkmark: "#22d3ee",
    },
    status: {
      locked: "#475569",
      notStarted: "#334155",
      inProgress: "#33CFFF",
      completed: "#34d399",
      investigated: "#FF9F1C",
    },
    terminal: {
      bg: "#0a0f1c",
      green: "#00ff88",
      amber: "#ffb000",
      cyan: "#33CFFF",
    },
    logo: {
      shield: "#33CFFF", // cyan shield
      magnifier: "#FF9F1C", // orange magnifying glass
      checkmark: "#22d3ee",
      bg: "#0a0f3d", // dark navy
      border: "#334155",
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
    glowCyan: "0 0 20px rgba(51, 207, 255, 0.15)",
    glowViolet: "0 0 20px rgba(167, 139, 250, 0.15)",
    glowAmber: "0 0 20px rgba(245, 158, 11, 0.15)",
    glowOrange: "0 0 20px rgba(255, 159, 28, 0.15)",
  },
  animation: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "350ms ease",
  },
  logo: {
    concept: "SecCraft — Shield with checkmark + magnifying glass — cyan shield #33CFFF + orange magnifier #FF9F1C + checkmark — Learn. Practice. Investigate. Improve.",
    platformIcon: "shield with checkmark + magnifying glass — cyan + orange",
    wirelessPathIcon: "shield with checkmark + magnifying glass + Wi-Fi arcs for Wireless path",
    favicon: "shield + magnifier mini",
    colors: {
      shield: "#33CFFF",
      magnifier: "#FF9F1C",
      checkmark: "#22d3ee",
    }
  }
} as const;

export type Theme = typeof theme;

export const tailwindExtension = {
  colors: {
    seccraft: {
      bg: theme.colors.background.primary,
      card: theme.colors.background.secondary,
      surface: theme.colors.background.surface,
      border: theme.colors.background.border,
      cyan: theme.colors.accent.cyan,
      violet: theme.colors.accent.violet,
      emerald: theme.colors.accent.emerald,
      amber: theme.colors.accent.amber,
      shield: theme.colors.logo.shield,
      magnifier: theme.colors.logo.magnifier,
    }
  },
  fontFamily: {
    heading: theme.font.heading.split(","),
    body: theme.font.body.split(","),
    mono: theme.font.mono.split(","),
  }
}
