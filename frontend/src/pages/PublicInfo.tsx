import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowRight, BookOpen, FileCheck2, ShieldCheck, Wifi } from 'lucide-react'

function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">{intro}</p>
      <div className="mt-10 space-y-5 text-sm leading-7 text-slate-400">{children}</div>
      <Link to="/app" className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200">Explore as a guest <ArrowRight className="h-4 w-4" /></Link>
    </div>
  )
}

export function AboutPage() {
  return (
    <PublicPage
      eyebrow="About SecCraft"
      title="A practical workspace for learning security concepts."
      intro="SecCraft is a static-first learning platform built around understanding, investigation, and clear evidence—not just collecting commands or badges."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: BookOpen, title: 'Authored content', text: 'Lessons, quizzes, modules, and path metadata are version-controlled with the application.' },
          { icon: Wifi, title: 'Wireless first', text: 'Wireless Pentesting is the first available learning path; other paths are not presented as ready before their content is.' },
          { icon: ShieldCheck, title: 'Guest by default', text: 'Learning does not depend on registration. Browser progress and imported records stay distinct from any server-verified assessment result.' },
        ].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-800 bg-[#081120] p-5"><Icon className="h-5 w-5 text-cyan-300" /><h2 className="mt-3 text-base font-semibold text-slate-100">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>)}
      </div>
      <p>Use the learning material only in authorized, legal, and safe contexts. Lab artifacts are for analysis and do not grant permission to test real systems.</p>
    </PublicPage>
  )
}

export function HowItWorksPage() {
  return (
    <PublicPage
      eyebrow="How it works"
      title="Study, investigate, record—and keep your evidence honest."
      intro="Start without an account. Work through static learning content, practice with the supplied artifacts, and keep your progress on this device."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {[
          { number: '01', title: 'Choose a path', text: 'Open the available learning path and follow its lessons and modules at your own pace.' },
          { number: '02', title: 'Practice with context', text: 'Use the bundled labs and captures to connect protocol details to observable evidence.' },
          { number: '03', title: 'Review your progress', text: 'Guest progress stays in browser storage. Optional account sync is distinct and imported records are marked unverified.' },
        ].map(item => <li key={item.number} className="rounded-2xl border border-slate-800 bg-[#081120] p-5"><span className="font-mono text-xs text-cyan-300">{item.number}</span><h2 className="mt-2 text-base font-semibold text-slate-100">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p></li>)}
      </ol>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-amber-100/90"><FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><p className="m-0 text-sm leading-6">Local progress, imported progress, and server-verified assessment results are different records. A browser import never becomes proof of mastery, XP eligibility, or a certificate.</p></div>
    </PublicPage>
  )
}
