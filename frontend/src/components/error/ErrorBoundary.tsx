import { Component } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Bug, Shield } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('WiFiForge ErrorBoundary:', error, info)
    // Keep the last 20 failures in this browser only; there is no error-reporting service to send them to.
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = (localStorage.getItem('platform-error-logs') || localStorage.getItem('wififorge-error-logs') || '[]')
        const logs = JSON.parse(raw)
        logs.unshift({ error: error.message, stack: error.stack?.slice(0, 500), time: new Date().toISOString(), componentStack: info?.componentStack?.slice(0, 500) })
        localStorage.setItem('platform-error-logs', JSON.stringify(logs.slice(0, 20))); try { localStorage.setItem('wififorge-error-logs', JSON.stringify(logs.slice(0, 20))) } catch {}
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-[560px] rounded-2xl bg-[#0f172a] border border-red-500/20 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-heading font-bold text-[16px] text-slate-100">Something went wrong</h3>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">The details below stay in this tab — this build has no error-reporting service, no queue and no audit log.</p>
            <div className="mt-4 p-3 rounded-xl bg-[#020617] border border-[#1e293b] text-left">
              <div className="text-[11px] font-mono text-red-400 break-all">{this.state.error?.message || 'Unknown error'}</div>
              <div className="text-[10px] font-mono text-slate-600 mt-2 line-clamp-6 whitespace-pre-wrap break-all">{this.state.error?.stack?.slice(0, 800) || ''}</div>
            </div>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={() => { try { localStorage.removeItem('platform-progress'); try { localStorage.removeItem('wififorge-progress') } catch {}; } catch {}; window.location.reload() }} className="px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-slate-300 flex items-center gap-2 hover:bg-[#25354f] transition-colors">
                <RefreshCw className="w-4 h-4" />Clear & Reload
              </button>
              <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-[13px] flex items-center gap-2 shadow-glow-violet">
                <Bug className="w-4 h-4" />Try Again
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-600 font-mono">
              <Shield className="w-3 h-3" />local only • no telemetry • clearing storage resets progress
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
