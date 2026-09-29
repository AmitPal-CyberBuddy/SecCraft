import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, BookOpen, Check, Compass, FileSearch, Laptop, LockKeyhole, Wifi } from 'lucide-react'
import learningPaths from '@/content/learning-paths.json'
import { AVAILABLE_LEARNING_PATHS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS } from '@/content/stats'

const firstPath = learningPaths.find(path => path.status === 'available')

const features = [
  {
    icon: BookOpen,
    title: 'Learn in small steps',
    body: 'Work through authored lessons, knowledge checks, and practical context without needing an account.',
    color: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/20',
  },
  {
    icon: FileSearch,
    title: 'Investigate evidence',
    body: 'Use bundled lab artifacts, reproducible workflows, and evidence-focused notes to ground your conclusions.',
    color: 'text-violet-300 bg-violet-300/10 border-violet-300/20',
  },
  {
    icon: Laptop,
    title: 'Keep learning locally',
    body: 'Guest progress stays in this browser. The static learning experience remains available when account services are not configured.',
    color: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  },
]

export function PublicHome() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-slate-800/70">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_20%,rgba(34,211,238,0.13),transparent_38%),radial-gradient(ellipse_at_82%_25%,rgba(139,92,246,0.14),transparent_34%),linear-gradient(180deg,#06101e_0%,#020617_90%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> A guest-first cybersecurity learning platform
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Build security skills by <span className="bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent">doing the work.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              SecCraft turns cybersecurity study into a practical learning journey: understand the system, inspect evidence, make a defensible decision, and explain what you found.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={firstPath ? `/paths/${firstPath.id}` : '/paths'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 shadow-[0_10px_32px_rgba(34,211,238,.15)] transition hover:bg-cyan-200">
                Explore the learning path <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/70">
                Open guest workspace <Compass className="h-4 w-4 text-cyan-300" />
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" /> No account required to learn</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-cyan-300" /> Progress stays local in guest mode</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#081120]/95 shadow-[0_28px_100px_rgba(0,0,0,.45)]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10"><Wifi className="h-4 w-4 text-cyan-200" /></span><span className="text-sm font-semibold text-slate-100">Learning workspace</span></div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-mono text-emerald-200">GUEST MODE</span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">Available learning path</div>
                <h2 className="mt-2 text-xl font-bold text-white">{firstPath?.title ?? 'Explore SecCraft'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{firstPath?.description ?? 'Browse the authored learning material and practical resources.'}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    { value: TOTAL_MODULES, label: 'modules' },
                    { value: TOTAL_LESSONS, label: 'lessons' },
                    { value: TOTAL_PCAPS, label: 'lab artifacts' },
                  ].map(item => <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3"><div className="font-mono text-lg font-semibold text-slate-100">{item.value}</div><div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{item.label}</div></div>)}
                </div>
                <div className="mt-5 space-y-3">
                  {['Understand the protocol and context', 'Inspect a supplied artifact', 'Write down evidence and limitations'].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-mono ${index === 0 ? 'bg-cyan-300/10 text-cyan-200' : index === 1 ? 'bg-violet-300/10 text-violet-200' : 'bg-emerald-300/10 text-emerald-200'}`}>0{index + 1}</span>{item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">{AVAILABLE_LEARNING_PATHS} path{AVAILABLE_LEARNING_PATHS === 1 ? '' : 's'} currently available · static content works without sign-in</div>
              </div>
            </div>
          </div>
        </div>
        <a href="#what-you-can-do" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs text-slate-500 hover:text-slate-300 lg:flex">Discover the workspace <ArrowDown className="h-3.5 w-3.5" /></a>
      </section>

      <section id="what-you-can-do" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Learn with context</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">From concepts to evidence-led practice.</h2>
          <p className="mt-4 text-base leading-7 text-slate-400">Use the material at your own pace. The guest workspace keeps existing lessons, labs, notes, and browser-local progress available without an account.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body, color }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-[#081120]/80 p-5 sm:p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${color}`}><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800/70 bg-[#050b18]">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Start where you are</p><h2 className="mt-2 text-2xl font-bold text-white">Browse the material. Sign in is optional.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">When hosted account services are configured, registration requires email verification and owner approval. Until then, guest learning remains available.</p></div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link to="/paths" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-800">Browse paths <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/signup" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-300 px-4 text-sm font-semibold text-slate-950 hover:bg-violet-200">Request access</Link>
          </div>
        </div>
      </section>
    </>
  )
}
