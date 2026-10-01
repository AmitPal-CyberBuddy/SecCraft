import { MotionContract } from './motion-contract'
import { PointsToast } from '../../src/components/gamification/PointsToast'
import { AnalyticsDashboard } from '../../src/components/analytics/AnalyticsDashboard'
import { OfflineIndicator } from '../../src/components/offline/OfflineIndicator'
import { PcapUploader } from '../../src/components/lab/PcapUploader'
import { EvidenceVault } from '../../src/components/evidence/EvidenceVault'
import { ReportEditor } from '../../src/components/report/ReportEditor'
// Dev-only component fixture. Not an application route or a production build entry.
// Network captures use the same shipped artifacts and unavailable-API fallback as the app.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../src/components/theme/ThemeProvider'
import { MotionPreferences } from '../../src/components/animations/MotionPreferences'
import { LocalProfileProvider } from '../../src/components/profile/LocalProfile'
import { SessionProvider } from '../../src/lib/session'
import { ReconMap } from '../../src/components/lab/ReconMap'
import { PcapInspector } from '../../src/components/lab/PcapInspector'
import { HandshakeDiagram } from '../../src/components/lab/HandshakeDiagram'
import { ConfigViewer } from '../../src/components/lab/ConfigViewer'
import { LabScoring } from '../../src/components/lab/LabScoring'
import { TerminalEmulator } from '../../src/components/terminal/TerminalEmulator'
import { LevelBadge, XpProgressBar, CertificationPayoff } from '../../src/components/gamification/LevelBadge'
import { Flashcards } from '../../src/components/learning/Flashcards'
import { CvssCalculator } from '../../src/components/security/CvssCalculator'
import { CustomModuleCreator } from '../../src/components/admin/CustomModuleCreator'
import { ReportTemplates } from '../../src/components/report/ReportTemplates'
import { Certificate } from '../../src/components/certificate/Certificate'
import { GlobalSearch } from '../../src/components/search/GlobalSearch'
import { NotificationCenter } from '../../src/components/notifications/NotificationCenter'
import { useProgressStore } from '../../src/store/useProgressStore'
import '../../src/index.css'
import '../../src/styles/workspace.css'
import '../../src/styles/public-home.css'
import '../../src/styles/controls.css'
import '../../src/styles/technical-tools.css'
import '../../src/styles/secondary-pages.css'
import '../../src/styles/feedback.css'
import '../../src/styles/color-system.css'
import '../../src/styles/motion.css'

const fixture = new URLSearchParams(location.search).get('fixture') || 'network'
// Populate only the browser QA page's local store, never a remote account.
if (fixture === 'activity') useProgressStore.getState().completeLesson('08-wpa-wpa2', 'qa-color-lesson')
const content = {
  motion: <MotionContract />,
  secondary: <><button className="ws-action" onClick={() => useProgressStore.getState().completeLesson('08-wpa-wpa2','01-rsn-key-hierarchy')}>Record QA lesson</button><button className="ws-action" onClick={() => useProgressStore.getState().completeLesson('08-wpa-wpa2','02-four-way-handshake-lab')}>Record next QA lesson</button><PointsToast /><OfflineIndicator /><LevelBadge /><XpProgressBar /><AnalyticsDashboard /></>,
  workflow: <><PcapUploader /><EvidenceVault /><ReportEditor /></>,
  packet: <PcapInspector pcapId="wpa2-handshake" />,
  network: <><ReconMap pcapId="recon-lab" /><PcapInspector pcapId="wpa2-handshake" /></>,
  tools: <><HandshakeDiagram /><ConfigViewer title="Synthetic configuration QA" config={'WPS: ENABLED\nPMF: DISABLED'} issues={(['critical','high','medium','low','info'] as const).map(severity => ({line:'WPS: ENABLED',severity,message:`${severity} QA example`,recommendation:'Review the synthetic configuration.'}))} /><LabScoring labId="lab-08-rsn" /><TerminalEmulator /></>,
  learning: <><LevelBadge /><XpProgressBar /><CertificationPayoff /><Flashcards /><Certificate /></>,
  authoring: <><CvssCalculator /><CustomModuleCreator /><ReportTemplates /></>,
  search: <GlobalSearch open onClose={() => {}} />,
  activity: <NotificationCenter open onClose={() => {}} />,
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><MotionPreferences><ThemeProvider><LocalProfileProvider><SessionProvider><main className="ws-legacy" style={{maxWidth:1100,margin:'0 auto',padding:16,display:'grid',gap:24}}><h1>Component color QA · {fixture}</h1>{content[fixture as keyof typeof content]}</main></SessionProvider></LocalProfileProvider></ThemeProvider></MotionPreferences></MemoryRouter>)
