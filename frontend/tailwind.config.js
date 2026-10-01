/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
      fontFamily: {
        heading: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)', medium: 'var(--shadow-medium)',
        inner: 'inset 0 0 0 1px var(--line-subtle)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: { DEFAULT: 'var(--motion-control)' },
      transitionTimingFunction: {
        DEFAULT: 'var(--motion-ease)',
        'smooth': 'var(--motion-ease)',
        'snappy': 'var(--motion-ease)',
      },
    },
  },
  plugins: [],
}
