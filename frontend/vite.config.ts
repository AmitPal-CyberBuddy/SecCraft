import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor'
            if (id.includes('driver.js')) return 'tour-vendor'
            if (id.includes('framer-motion')) return 'motion-vendor'
            if (id.includes('react-markdown') || id.includes('rehype') || id.includes('remark')) return 'markdown-vendor'
            if (id.includes('lucide-react')) return 'icons-vendor'
            return 'vendor'
          }
          if (id.includes('components/terminal')) return 'terminal'
          if (id.includes('components/pdf')) return 'pdf'
          if (id.includes('components/analytics')) return 'analytics'
          if (id.includes('components/gamification')) return 'gamification'
          if (id.includes('components/security')) return 'security'
          if (id.includes('components/report')) return 'report'
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
