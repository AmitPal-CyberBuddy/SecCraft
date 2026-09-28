/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        wififorge: {
          bg: "#020617",
          'bg-soft': "#0a1020",
          card: "#0f172a",
          'card-hover': "#111d33",
          surface: "#1e293b",
          'surface-hover': "#25354f",
          border: "#1e293b",
          'border-strong': "#334155",
          cyan: "#22d3ee",
          'cyan-strong': "#06b6d4",
          violet: "#a78bfa",
          'violet-strong': "#8b5cf6",
          emerald: "#34d399",
          amber: "#fbbf24",
          pink: "#f472b6",
        },
        slate: {
          950: "#020617",
        }
      },
      fontFamily: {
        heading: ["Sora", "Space Grotesk", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        'soft': '0 4px 24px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
        'medium': '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.15), 0 0 32px rgba(34,211,238,0.12), 0 4px 24px rgba(0,0,0,0.4)',
        'glow-violet': '0 0 0 1px rgba(167,139,250,0.15), 0 0 32px rgba(167,139,250,0.12), 0 4px 24px rgba(0,0,0,0.4)',
        'glow-emerald': '0 0 0 1px rgba(52,211,153,0.15), 0 0 32px rgba(52,211,153,0.12)',
        'inner': 'inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(34,211,238,0.1)' },
          '100%': { boxShadow: '0 0 32px rgba(34,211,238,0.2)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'snappy': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
