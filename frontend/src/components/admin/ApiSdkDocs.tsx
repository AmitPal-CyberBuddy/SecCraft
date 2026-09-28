import { motion } from 'framer-motion'
import { Code, BookOpen, Zap, Shield, Key, Webhook, FileCode, Terminal } from 'lucide-react'

export function ApiSdkDocs({ className = '' }: { className?: string }) {
  const endpoints = [
    { method: 'GET', path: '/api/pcaps', desc: 'List 16 Scapy PCAPs', auth: false },
    { method: 'POST', path: '/api/pcaps/upload', desc: 'Upload custom PCAP 50MB SHA256', auth: true },
    { method: 'GET', path: '/api/cert/verify/{id}', desc: 'Verify certificate QR SHA256', auth: false },
    { method: 'GET', path: '/api/reports/pdf/{id}', desc: 'Generate PDF/A audit ready', auth: true },
    { method: 'GET', path: '/api/analytics/overview', desc: 'Analytics leaderboard', auth: true },
    { method: 'GET', path: '/api/audit/logs', desc: 'Audit logs SHA256 90d', auth: true },
    { method: 'POST', path: '/api/auth/login', desc: 'JWT login operator/alice/admin', auth: false },
    { method: 'GET', path: '/api/auth/me', desc: 'Current user JWT', auth: true },
    { method: 'GET', path: '/api/auth/teams', desc: 'Team classrooms', auth: true },
  ]

  return (
    <div className={`rounded-2xl bg-[#0f172a] border border-[#1e293b] p-4 xs:p-5 sm:p-6 min-w-0 w-full ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <Code className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[14px] xs:text-[15px] text-slate-100">API SDK Docs — OpenAPI Swagger • TS/Python SDK • Enterprise</h3>
          <p className="text-[11px] text-slate-500 font-mono">Swagger /docs • Redoc /redoc • OpenAPI /openapi.json • Rate limit 100r/m • JWT • OAuth</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">OpenAPI 3.0</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Terminal className="w-3 h-3 text-cyan-400" />TypeScript SDK Example</div>
          <pre className="text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto scrollbar-thin">
{`import { WiFiForgeClient } from '@wififorge/sdk'

const client = new WiFiForgeClient({
  apiKey: 'wififorge_sk_...',
  baseUrl: 'https://wififorge.local/api'
})

// List PCAPs
const pcaps = await client.pcaps.list()
console.log(pcaps.length) // 16

// Upload custom
const result = await client.pcaps.upload(file)
console.log(result.sha256) // SHA256 verified

// Verify cert
const cert = await client.cert.verify('WIFIFORGE-2450-...')
console.log(cert.valid) // true + flag

// Analytics
const analytics = await client.analytics.overview()
console.log(analytics.leaderboard)`}
          </pre>
        </div>

        <div className="p-4 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FileCode className="w-3 h-3 text-violet-400" />Python SDK Example</div>
          <pre className="text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto scrollbar-thin">
{`from wififorge import WiFiForgeClient

client = WiFiForgeClient(
  api_key='wififorge_sk_...',
  base_url='https://wififorge.local/api'
)

# List PCAPs
pcaps = client.pcaps.list()
print(len(pcaps)) # 16 Scapy real

# Upload
result = client.pcaps.upload('wpa2.pcapng')
print(result['sha256']) # SHA256 chain

# Verify cert QR
cert = client.cert.verify('WIFIFORGE-2450-...')
print(cert['flag']) # FINAL_RECON_ASSESSMENT_COMPLETE

# Teams
teams = client.auth.teams()
print(teams['teams']) # 3 teams`}
          </pre>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Enterprise Endpoints — 9 • Rate Limit 100r/m • JWT • OAuth Ready</div>
        {endpoints.map((ep, idx) => (
          <motion.div key={ep.path} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40 hover:bg-[#020617]/80 transition-colors min-w-0">
            <span className={`text-[10px] px-2 py-1 rounded-full border font-mono font-bold shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-violet-500/10 border-violet-500/20 text-violet-400'}`}>{ep.method}</span>
            <span className="text-[11px] font-mono text-cyan-300 truncate flex-1">{ep.path}</span>
            <span className="text-[11px] text-slate-500 truncate hidden sm:inline flex-1">{ep.desc}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono shrink-0 ${ep.auth ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e293b] border-[#334155] text-slate-500'}`}>{ep.auth ? 'JWT' : 'Public'}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="flex items-center gap-2 mb-1"><Key className="w-4 h-4 text-amber-400" /><span className="text-[12px] font-bold text-slate-100">API Keys</span></div>
          <div className="text-[11px] text-slate-500">Create/revoke keys, scopes, usage stats, rate limit 100r/m, JWT refresh, Redis blacklist</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="flex items-center gap-2 mb-1"><Webhook className="w-4 h-4 text-violet-400" /><span className="text-[12px] font-bold text-slate-100">Webhooks</span></div>
          <div className="text-[11px] text-slate-500">Event webhooks, retry, signing HMAC, dashboard, PCAP_UPLOAD CERT_GENERATE REPORT_PDF</div>
        </div>
        <div className="p-3 rounded-xl bg-[#020617]/60 border border-[#1e293b]/40">
          <div className="flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-cyan-400" /><span className="text-[12px] font-bold text-slate-100">LTI SCORM</span></div>
          <div className="text-[11px] text-slate-500">LMS Canvas/Moodle LTI 1.3, SCORM 1.2/2004 export, GraphQL subscriptions, playground</div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/10 text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-cyan-300">Enterprise Platform:</span> OpenAPI 3.0 Swagger /docs Redoc /redoc, TS/Python SDK, webhooks retry signing, LTI SCORM, GraphQL real-time, API key management scopes usage, rate limit 100r/m, JWT OAuth, production.
      </div>
    </div>
  )
}
