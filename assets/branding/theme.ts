/**
 * SecCraft interface design tokens — current system as of 2026-09-29.
 * Runtime CSS source of truth: frontend/src/styles/refinement.css.
 */
export const theme = {
  name: 'SecCraft — Technical Professional',
  colors: {
    background: {
      primary: '#080d17',
      app: '#0b111b',
      secondary: '#0d1421',
      card: '#131e2d',
      inset: '#0b131f',
    },
    border: {
      subtle: '#223044',
      strong: '#34465d',
    },
    text: {
      primary: '#edf3fa',
      secondary: '#a5b3c3',
      muted: '#8798ad',
      inverse: '#080d17',
    },
    accent: {
      cyan: '#22d3ee',
      teal: '#53d7d1',
      violet: '#a78bfa',
      emerald: '#34d399',
      amber: '#f59e0b',
      orange: '#f59e0b',
      red: '#f87171',
    },
    light: {
      background: '#f4f7fa',
      card: '#ffffff',
      inset: '#edf2f6',
      text: '#142235',
      border: '#dce5ec',
    },
  },
  font: {
    heading: '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  motion: {
    theme: '220ms ease',
    fast: '150ms ease',
    normal: '220ms cubic-bezier(.2,.75,.25,1)',
    reduced: '0.01ms',
  },
} as const

export type Theme = typeof theme
