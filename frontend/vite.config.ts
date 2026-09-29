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
const DEFAULT_BASE = '/SecCraft/'

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
 *  2. Emit `404.html` (the SPA shell) so deep links like /SecCraft/labs are served
 *     by the client-side router instead of GitHub's 404 page.
 *  3. Emit `.nojekyll` so GitHub Pages serves `_`-prefixed paths untouched.
 */
function pagesHostingPlugin(base: string): Plugin {
  let outDir = path.join(ROOT, 'dist')
  const isSubPath = base !== '/'
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // href="/x" or src="/x", but never already-prefixed (/SecCraft/...) and never protocol-relative (//cdn...)
  const rootAbsoluteUrl = new RegExp(`(href|src)="(?!${escapedBase})(/(?!/)[^"]*)"`, 'g')

  return {
    name: 'seccraft:static-hosting',
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


/**
 * Security headers for the static build.
 *
 * GitHub Pages cannot set response headers, so the same policy the nginx config uses is written into
 * the built HTML as a <meta http-equiv="Content-Security-Policy"> tag, plus:
 *   - `dist/_headers` for hosts that read it (Netlify, Cloudflare Pages, static-server),
 *   - `dist/robots.txt` so the reference material is not indexed by default,
 *   - a build-time audit that fails the build if any third-party URL sneaks into the bundle.
 */
const CSP_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')

const HEADERS_FILE = [
  '/*',
  '  Content-Security-Policy: ' + CSP_POLICY,
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: DENY',
  '  Referrer-Policy: no-referrer',
  '  Permissions-Policy: geolocation=(), microphone=(), camera=(), usb=()',
  '  Cross-Origin-Opener-Policy: same-origin',
  '  Cross-Origin-Resource-Policy: same-origin',
  '',
].join('\n')

/**
 * Request-shaped external URLs. Documentation strings, XML namespaces and vendored comment links are
 * not requests, so the audit only fails on URLs that can actually leave the page:
 *   - <link href> / <script src> / <img src> in HTML,
 *   - url(...) in CSS,
 *   - fetch()/import()/Worker()/importScripts()/XMLHttpRequest.open() in JS.
 */
const REQUEST_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'html', regex: /(?:href|src|srcset|action)=["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+/gi },
  { label: 'css', regex: /url\(\s*["']?https?:\/\/(?!localhost|127\.0\.0\.1)[^)"']+/gi },
  { label: 'js', regex: /(?:fetch|import|importScripts|Worker|open)\s*\(\s*["'`]https?:\/\/(?!localhost|127\.0\.0\.1)[^"'`]+/gi },
]

function securityPlugin(_base: string): Plugin {
  let outDir = path.join(ROOT, 'dist')
  return {
    name: 'seccraft:security-headers',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(ROOT, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        const tags = [
          `<meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}">`,
          '<meta name="referrer" content="no-referrer">',
        ].join('\n    ')
        return html.replace('<head>', `<head>\n    ${tags}`)
      },
    },
    closeBundle() {
      if (!fs.existsSync(path.join(outDir, 'index.html'))) return
      fs.writeFileSync(path.join(outDir, '_headers'), HEADERS_FILE)
      fs.writeFileSync(path.join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n')

      // Fail the build on any request that would leave the origin. Documentation strings that merely
      // mention a hostname are reported as a note, not an error.
      const offenders: string[] = []
      const mentions: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (/\.(js|css|html)$/.test(entry.name)) {
            const text = fs.readFileSync(full, 'utf8')
            const rel = path.relative(outDir, full)
            for (const { regex } of REQUEST_PATTERNS) {
              for (const match of text.match(regex) ?? []) offenders.push(`${rel}: ${match}`)
            }
            if (/\.(js|css)$/.test(entry.name)) {
              for (const match of text.match(/https?:\/\/(?!localhost|127\.0\.0\.1)[a-z0-9.-]+/gi) ?? []) {
                mentions.push(`${rel}: ${match}`)
              }
            }
          }
        }
      }
      walk(outDir)
      const uniqueMentions = [...new Set(mentions)]
      this.info(
        uniqueMentions.length
          ? `external hostnames mentioned in bundle strings (not requests): ${uniqueMentions.length}`
          : 'bundle contains no external hostnames',
      )
      if (offenders.length) {
        this.error(`External requests found in the build (keep the app origin-free):\n  ${offenders.slice(0, 10).join('\n  ')}`)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, ROOT, ''), ...process.env }
  const base = normalizeBase(env.VITE_BASE || DEFAULT_BASE)

  return {
    base,
    plugins: [react(), pagesHostingPlugin(base), securityPlugin(base)],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
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
