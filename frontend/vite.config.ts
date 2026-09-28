import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

/**
 * GitHub Pages serves project sites from a sub-path:
 *   https://<owner>.github.io/<repo>/  ->  base = "/<repo>/"
 * Override for other hosts (Netlify "/", custom domain, local root dev):
 *   VITE_BASE=/ npm run build
 */
const DEFAULT_BASE = '/WiFiForge/'

function normalizeBase(raw: string): string {
  if (!raw || raw === './') return '/'
  let base = raw.trim()
  if (!base.startsWith('/')) base = `/${base}`
  if (!base.endsWith('/')) base = `${base}/`
  return base
}

/**
 * Static-host (GitHub Pages) hardening:
 *  1. `public/` files are copied verbatim, so `/favicon.svg` in index.html is NOT
 *     rewritten by Vite and would 404 under a sub-path. Re-point it at the base.
 *  2. Emit `404.html` (the SPA shell) so deep links like /WiFiForge/labs are served
 *     by the client-side router instead of GitHub's 404 page.
 *  3. Emit `.nojekyll` so GitHub Pages serves `_`-prefixed paths untouched.
 */
function pagesHostingPlugin(base: string): Plugin {
  let outDir = path.join(ROOT, 'dist')
  const isSubPath = base !== '/'
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // href="/x" or src="/x", but never already-prefixed (/WiFiForge/...) and never protocol-relative (//cdn...)
  const rootAbsoluteUrl = new RegExp(`(href|src)="(?!${escapedBase})(/(?!/)[^"]*)"`, 'g')

  return {
    name: 'wififorge:static-hosting',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(ROOT, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!isSubPath) return html
        return html.replace(rootAbsoluteUrl, (_m, attr: string, url: string) => `${attr}="${base}${url.replace(/^\//, '')}"`)
      },
    },
    closeBundle() {
      if (!fs.existsSync(path.join(outDir, 'index.html'))) return
      if (isSubPath) {
        // Deep links 404 on GitHub Pages; the SPA shell answers them instead.
        fs.copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'))
      }
      fs.writeFileSync(path.join(outDir, '.nojekyll'), '')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, ROOT, ''), ...process.env }
  const base = normalizeBase(env.VITE_BASE || DEFAULT_BASE)

  return {
    base,
    plugins: [react(), pagesHostingPlugin(base)],
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
        '@': path.resolve(ROOT, './src'),
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
  }
})
