import learningPaths from '@/content/learning-paths.json'
import { Button } from '@/components/common/Workspace'
import type { ReactNode } from 'react'
import { ArrowRight, BadgeCheck, BookOpen, CloudUpload, FileCheck2, HardDrive, ShieldCheck, Wifi, CircleSlash, Fingerprint } from 'lucide-react'
import { useSession } from '@/lib/session'
import { isSignedIn } from '@/lib/access'

function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const { userState, ready } = useSession()
  const signedIn = ready && isSignedIn(userState)
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--learning)]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--ink-secondary)]">{intro}</p>
      <div className="mt-10 space-y-5 text-sm leading-7 text-[var(--ink-secondary)]">{children}</div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button to={signedIn ? '/app' : '/paths'}>
          {signedIn ? 'Open your workspace' : 'Explore the catalogue'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        {!signedIn && (
          <Button to="/signup" tone="secondary">
            <Fingerprint className="h-4 w-4 text-[var(--owner)]" aria-hidden="true" /> Request an account
          </Button>
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
      intro={`SecCraft is a static-first learning platform built around understanding, investigation, and defensible evidence — not collecting commands or badges. Explore ${learningPaths.filter(path => path.status === 'available').map(path => path.title).join(' and ')}, available now.`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: BookOpen, title: 'Authored content', text: 'Lessons, knowledge checks, module metadata, and lab artifacts are version-controlled alongside the application, so the material and the app never drift apart.' },
          { icon: Wifi, title: 'Available curriculum', text: `${learningPaths.filter(path => path.status === 'available').map(path => path.title).join(' and ')} are available now. Roadmap entries are clearly marked as planned.` },
          { icon: ShieldCheck, title: 'Public catalogue', text: 'Browse every learning path, module and lesson title without an account. Supplied samples and bundled local labs are available for practice; protected lesson text and knowledge-check prompts require an approved account. Challenge prompts and answer keys are not included in this public build yet. Browser progress is never presented as a platform-confirmed result.' },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5">
            <Icon className="h-5 w-5 text-[var(--learning)]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-[var(--ink-primary)]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">{text}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink-primary)]">
          <BadgeCheck className="h-4 w-4 text-[var(--learning)]" aria-hidden="true" /> What SecCraft is honest about
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {[
            'The labs are simulated and use bundled capture artifacts. There is no live cyber range and no wireless hardware control.',
            'Completed exercises help you track practice. They are not a validated skill grade, not a record, and not a certification.',
            'Knowledge checks receive server-side practice feedback after submission, but their scores are not verified or stored as assessment evidence.',
            'Progress is never uploaded automatically, and is never restored on another device automatically.',
            'No certificate is issued. Certificates would need verified XP and a completion record, and the platform issues neither yet.',
            'Protected lesson text and knowledge-check prompts require an approved account. Quiz grading happens on the learner API; bundled labs remain practice, not verified results. Challenge prompts and answer keys are omitted from this public build until authenticated delivery is available.',
          ].map(item => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-3 text-sm leading-6 text-[var(--ink-secondary)]">
              <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
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
      intro="Start with the public catalogue, selected sample lessons and supplied artifacts, then practise with bundled local labs. An approved learner account unlocks protected lesson text and knowledge-check prompts; challenge content is not included in this public build yet. Sign in for full learning materials and account records."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {[
          { number: '01', title: 'Choose a path', text: 'Browse available paths and module outlines publicly. An approved learner account is required to open protected lesson text and knowledge checks.' },
          { number: '02', title: 'Practise with context', text: 'Use the supplied sample artifacts for local analysis. No live network or device is tested by the platform.' },
          { number: '03', title: 'Record the work', text: 'Notes and evidence stay on this device. Account records are held on the platform for approved accounts.' },
        ].map(item => (
          <li key={item.number} className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5">
            <span className="font-mono text-xs text-[var(--learning)]">{item.number}</span>
            <h2 className="mt-2 text-base font-semibold text-[var(--ink-primary)]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">{item.text}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-[var(--line-normal)] bg-[var(--panel-bg)] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink-primary)]">
          <CloudUpload className="h-4 w-4 text-[var(--success)]" aria-hidden="true" /> The three kinds of record
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
          SecCraft never blurs these three, and every screen labels which one it is showing.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: HardDrive, label: 'Practice', text: 'Practice activity on this device. Not an award of record.' },
            { icon: BadgeCheck, label: 'Account record', text: 'Held on the platform for your account, split into verified rows. Requires an approved account.' },
            { icon: CloudUpload, label: 'Imported', text: 'Transferred from a file. Permanently unverified, and awards nothing.' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-[var(--line-normal)] bg-[var(--panel-inset)] p-4">
              <div className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 text-[var(--learning)]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[var(--ink-primary)]">{item.label}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-5 text-[var(--attention)]">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--attention)]" aria-hidden="true" />
        <p className="m-0 text-sm leading-6">
          Practice activity and platform-confirmed records are different things. Practice never
          becomes proof of mastery and never produces a certificate.
        </p>
      </div>
    </PublicPage>
  )
}
