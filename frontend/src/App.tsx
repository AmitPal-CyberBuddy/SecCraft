export default function App() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9', background: '#020617', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>WiFiForge — Ultra Minimal — No ErrorBoundary</h1>
      <p style={{ marginTop: 12, color: '#94a3b8' }}>If you see this, ErrorBoundary was causing infinite loop.</p>
      <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Build minimal 1.35s — no providers, no router, no error boundary</p>
      <button onClick={() => { try { localStorage.clear(); sessionStorage.clear(); } catch {}; window.location.reload() }} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}>Clear Storage & Reload</button>
    </div>
  )
}
