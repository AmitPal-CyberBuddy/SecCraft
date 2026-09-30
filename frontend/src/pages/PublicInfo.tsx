import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowRight, BadgeCheck, BookOpen, CloudUpload, FileCheck2, HardDrive, ShieldCheck, Wifi, CircleSlash, Fingerprint } from 'lucide-react'
import { useSession } from '@/lib/session'
import { isSignedIn } from '@/lib/access'
import { CONTENT_NOT_ENFORCED_NOTE, PREVIEW_MODULE_COUNT } from '@/lib/contentAccess'

function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const { userState, ready } = useSession()
  const signedIn = ready && isSignedIn(userState)
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">{intro}</p>
      <div className="mt-10 space-y-5 text-sm leading-7 text-slate-400">{children}</div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/app"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
        >
          {signedIn ? 'Open your workspace' : 'Start the preview'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {!signedIn && (
          <Link to="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800">
            <Fingerprint className="h-4 w-4 text-violet-300" aria-hidden="true" /> Request an account
          </Link>
        )}
      </div>
    </div>
  )
}

export function AboutPage() {
  return (
    <PublicPage
      eyebrow="About SecCraft"
      title="A practice platform, not a video library."
      intro="SecCraft is a static-first learning platform built around understanding, investigation, and defensible evidence — not collecting commands or badges. It ships one complete path today and is honest about what it does not ship."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: BookOpen, title: 'Authored content', text: 'Lessons, knowledge checks, module metadata, and lab artifacts are version-controlled alongside the application, so the material and the app never drift apart.' },
          { icon: Wifi, title: 'Wireless first', text: 'Wireless Pentesting is the first available path. Other catalogue entries are listed as planned and are not presented as ready before their content exists.' },
          { icon: ShieldCheck, title: 'Preview by default', text: `You can work through ${PREVIEW_MODULE_COUNT} modules with no account. Practice progress stays in your browser and is always shown as distinct from anything the platform has confirmed.` },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border border-slate-800 bg-[#081120] p-5">
            <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-100">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <BadgeCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" /> What SecCraft is honest about
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {[
            'The labs are simulated and use bundled capture artifacts. There is no live cyber range and no wireless hardware control.',
            'Practice XP and levels record activity in your browser. They are not a validated skill grade, not a record, and not a certification.',
            'No server rubric grades your assessment answers, so no result here is presented as verified.',
            'Progress is never uploaded automatically, and is never restored on another device automatically.',
            'No certificate is issued. Certificates would need verified XP and a completion record, and the platform issues neither yet.',
            CONTENT_NOT_ENFORCED_NOTE,
          ].map(item => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-[13px] leading-6 text-slate-400">
              <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p>Use the learning material only in authorized, legal, and safe contexts. Lab artifacts exist for analysis and do not grant permission to test any real system.</p>
    </PublicPage>
  )
}

export function HowItWorksPage() {
  return (
    <PublicPage
      eyebrow="How it works"
      title="Study, investigate, record — and keep your evidence honest."
      intro="Start with nothing. Work through the authored material, practise against the supplied artifacts, and keep the whole record on your own device. An account, if you ever want one, is an addition rather than a prerequisite."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {[
          { number: '01', title: 'Choose a path', text: 'Open the available learning path and follow its modules at your own pace. Every lesson is readable without an account.' },
          { number: '02', title: 'Practise with context', text: 'Use the bundled labs and captures to connect protocol behaviour to something you can actually observe in the frames.' },
          { number: '03', title: 'Record the work', text: 'Your progress, notes, and evidence stay in this browser. Nothing is transmitted unless you deliberately export and import a file.' },
        ].map(item => (
          <li key={item.number} className="rounded-2xl border border-slate-800 bg-[#081120] p-5">
            <span className="font-mono text-xs text-cyan-300">{item.number}</span>
            <h2 className="mt-2 text-base font-semibold text-slate-100">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-800 bg-[#081120] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <CloudUpload className="h-4 w-4 text-emerald-300" aria-hidden="true" /> The three kinds of record
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          SecCraft never blurs these three, and every screen labels which one it is showing.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: HardDrive, label: 'Practice', text: 'Recorded in your browser. Never confirmed by the platform, and not an award of record.' },
            { icon: BadgeCheck, label: 'Account record', text: 'Held on the platform for your account, split into verified rows. Requires an approved account.' },
            { icon: CloudUpload, label: 'Imported', text: 'Transferred from a file. Permanently unverified, and awards nothing.' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-slate-100">{item.label}</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-amber-100/90">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="m-0 text-sm leading-6">
          Local progress, imported progress, and platform-confirmed records are different things. A browser import never
          becomes proof of mastery, never grants XP, and never produces a certificate.
        </p>
      </div>
    </PublicPage>
  )
}
