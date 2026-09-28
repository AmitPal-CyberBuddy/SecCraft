export function Dashboard() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9', background: '#020617', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>WiFiForge — Dashboard Minimal — Debug</h1>
      <p style={{ marginTop: 12, color: '#94a3b8' }}>If you see this, infinite loop is not in Dashboard core, but in Shell/Topbar/Sidebar/Providers.</p>
      <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Build 2.57s 418kB gz83kB — testing minimal render</p>
      <button onClick={() => { try { localStorage.clear(); sessionStorage.clear(); } catch {}; window.location.reload() }} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 12, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}>Clear Storage & Reload</button>
      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>Next: re-enable Shell, then Topbar, then Sidebar, then Providers one by one to isolate.</div>
      </div>
    </div>
  )
}
