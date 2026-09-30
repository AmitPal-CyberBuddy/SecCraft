import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronRight,
  CircleSlash,
  Compass,

  Eye,
  FileSearch,
  Fingerprint,
  FlaskConical,
  Gauge,
  Globe,
  HardDrive,
  Lock,
  MonitorSmartphone,
  ShieldCheck,
  Swords,
  Target,
  Wifi,
} from 'lucide-react'
import learningPaths from '@/content/learning-paths.json'
import { PLATFORM_STATS, TOTAL_CHALLENGES, TOTAL_LABS, TOTAL_LESSONS, TOTAL_MODULES, TOTAL_PCAPS } from '@/content/stats'
import { useSession } from '@/lib/session'
import { isSignedIn, STATE_META } from '@/lib/access'
import { StateChip } from '@/components/account/StateChip'
import { PREVIEW_MODULE_COUNT } from '@/lib/contentAccess'

const firstPath = learningPaths.find(path => path.status === 'available')
const plannedPaths = learningPaths.filter(path => path.status !== 'available')

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

const journey = [
  {
    state: 'public' as const,
    icon: Globe,
    title: 'Visitor',
    body: 'Read the material, browse the catalogue, and look inside modules. Nothing is stored and nothing is asked of you.',
  },
  {
    state: 'guest' as const,
    icon: Eye,
    title: 'Guest learner',
    body: 'Open the workspace and learn in full. Progress, XP, notes, and evidence stay in this browser — it works offline.',
  },
  {
    state: 'pending' as const,
    icon: Fingerprint,
    title: 'Approved account',
    body: 'Verify your email, then the owner reviews the request. Approval adds a platform-side record and import/merge.',
  },
  {
    state: 'active' as const,
    icon: ShieldCheck,
    title: 'Account-backed',
    body: 'Your progress record can be held on the platform and moved between devices by hand. Still no automatic sync.',
  },
]

const hands = [
  { icon: BookOpen, title: 'Modules', body: 'Authored lessons that move from protocol fundamentals to enterprise wireless, each with an explicit objective.', color: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/20' },
  { icon: FlaskConical, title: 'Labs', body: `${TOTAL_PCAPS} bundled capture artifacts you inspect directly in the browser. No hardware, no network, no permission needed to practise reading frames.`, color: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20' },
  { icon: Swords, title: 'Challenges', body: `${TOTAL_CHALLENGES} guided checkpoints that turn a topic into a decision you have to defend.`, color: 'text-amber-300 bg-amber-300/10 border-amber-300/20' },
  { icon: FileSearch, title: 'Engagements', body: 'An assessment-mode workspace with checklists, evidence capture, and a report you can actually hand over.', color: 'text-violet-300 bg-violet-300/10 border-violet-300/20' },
]

const accountAdds = [
  'A real approval state you can check at any time',
  'A platform-side copy of the progress you choose to import',
  'A way to move a progress file to a second device',
  'Nothing else — no new material, no extra hours of content',
]

const accountDoesNot = [
  'Automatic background synchronization of anything',
  'Automatic restoration on a new device',
  'A certificate, accreditation, or a graded result',
  'A leaderboard, a feed, a classroom, or other learners',
]

export function PublicHome() {
  const { userState, ready } = useSession()
  const signedIn = ready && isSignedIn(userState)

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-slate-800/70">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_18%,rgba(34,211,238,0.14),transparent_40%),radial-gradient(ellipse_at_84%_22%,rgba(139,92,246,0.15),transparent_36%),linear-gradient(180deg,#06101e_0%,#020617_92%)]"
          aria-hidden="true"
        />
        {/* One restrained instrument grid — the "analyst console" cue, not ambient motion. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.10) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, #000 30%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, #000 30%, transparent 78%)',
          }}
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:px-8 lg:py-24">
          <motion.div initial="hidden" animate="visible" variants={reveal}>
            <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
              Hands-on security learning
              <span className="text-cyan-300/50">•</span>
              <span className="normal-case tracking-normal text-cyan-100/80">No account required to start</span>
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Learn security by doing the actual work — not by collecting videos.
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-300 sm:text-[17px] sm:leading-8">
              SecCraft is a practice platform for wireless security assessment. You read a protocol, you open a real capture,
              you decide what happened, and you write down what proves it. The first path —{' '}
              <span className="font-medium text-slate-100">{firstPath?.title ?? 'Wireless Pentesting'}</span> — is available now.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={signedIn ? '/app' : firstPath ? `/paths/${firstPath.id}` : '/paths'}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 shadow-[0_10px_32px_rgba(34,211,238,.18)] transition hover:bg-cyan-200"
              >
                {signedIn ? 'Open your workspace' : 'Explore the Preview Curriculum'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {!signedIn && (
                <Link
                  to="/app"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/70"
                >
                  <Compass className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Start learning, no account
                </Link>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> {PREVIEW_MODULE_COUNT} modules of the method, open now
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" /> Your place is kept in this browser
              </span>
            </div>

            {signedIn && (
              <div className="mt-6 inline-flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5">
                <StateChip state={userState} size="sm" />
                <span className="text-[12.5px] text-slate-400">{STATE_META[userState].nextAction}</span>
              </div>
            )}
          </motion.div>

          {/* Workspace panel — an honest preview of what the product actually is. */}
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-full max-w-[520px]"
          >
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/10 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#081120]/95 shadow-[0_28px_100px_rgba(0,0,0,.45)]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10">
                    <Wifi className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-slate-100">Inside the workspace</span>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-mono text-emerald-200">OPEN TO GUESTS</span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">Available now</div>
                <h2 className="mt-2 text-xl font-bold text-white">{firstPath?.title ?? 'Explore SecCraft'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{firstPath?.description}</p>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    { value: TOTAL_MODULES, label: 'modules' },
                    { value: TOTAL_LESSONS, label: 'lessons' },
                    { value: TOTAL_LABS, label: 'labs' },
                    { value: TOTAL_PCAPS, label: 'captures' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                      <div className="font-mono text-lg font-semibold text-slate-100">{item.value}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>

                <ol className="mt-5 space-y-2.5">
                  {[
                    { step: '01', text: 'Understand the protocol and where it matters' },
                    { step: '02', text: 'Open a supplied capture and read what is actually there' },
                    { step: '03', text: 'Record the evidence, the limits, and the recommendation' },
                  ].map((item, index) => (
                    <motion.li
                      key={item.step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + index * 0.09, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs ${
                          index === 0 ? 'bg-cyan-300/10 text-cyan-200' : index === 1 ? 'bg-violet-300/10 text-violet-200' : 'bg-emerald-300/10 text-emerald-200'
                        }`}
                      >
                        {item.step}
                      </span>
                      {item.text}
                    </motion.li>
                  ))}
                </ol>

                <div className="mt-5 border-t border-slate-800 pt-4 text-[11.5px] text-slate-500">
                  Everything above runs in your browser. No account, no server, no hardware.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Journey ───────────────────────────────────────────────────── */}
      <section aria-labelledby="journey-heading" className="border-b border-slate-800/70">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">How access works</p>
            <h2 id="journey-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              One continuous product, from a first visit to an approved account.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-400">
              Nothing is removed as you move along. An account is an addition to the same learning experience, not a gate
              in front of it.
            </p>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl border border-slate-800 bg-[#081120]/80 p-5"
              >
                {index < journey.length - 1 && (
                  <ChevronRight className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-700 lg:block" aria-hidden="true" />
                )}
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70">
                    <step.icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  </span>
                  <StateChip state={step.state} size="sm" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-400">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What "hands-on" means here ─────────────────────────────────── */}
      <section aria-labelledby="hands-heading" className="border-b border-slate-800/70 bg-[#050b18]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan-300">The work</p>
            <h2 id="hands-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Four surfaces, one assessment mindset.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-400">
              Reading is only the start. Everything else exists to make you defend a conclusion.
            </p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {hands.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-slate-800 bg-[#081120]/80 p-5"
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${item.color}`}>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-400">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Current + future path, honestly labelled ──────────────────── */}
      <section aria-labelledby="paths-heading" className="border-b border-slate-800/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-emerald-300">Available now</p>
            <h2 id="paths-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {firstPath?.title}
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-400">{firstPath?.longDescription}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                { label: `${TOTAL_MODULES} modules`, icon: BookOpen },
                { label: `${TOTAL_LESSONS} lessons`, icon: FileSearch },
                { label: `${TOTAL_LABS} labs`, icon: FlaskConical },
                { label: `${TOTAL_CHALLENGES} challenges`, icon: Swords },
                { label: `${PLATFORM_STATS.scenarios} scenarios`, icon: Target },
              ].map(chip => (
                <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[12px] text-slate-300">
                  <chip.icon className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  {chip.label}
                </span>
              ))}
            </div>
            <Link
              to={firstPath ? `/paths/${firstPath.id}` : '/paths'}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200"
            >
              Open the path <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#081120]/70 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <h3 className="text-[14px] font-semibold text-slate-100">What is not built yet</h3>
            </div>
            <p className="mt-2.5 text-[13px] leading-6 text-slate-400">
              The catalogue reserves more domains so the platform is not built around Wi-Fi alone. Those entries are
              architecture, not content. We list them as planned rather than pretending they are available.
            </p>
            <ul className="mt-5 space-y-2">
              {plannedPaths.map(path => (
                <li key={path.id} className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5">
                  <span className="text-[16px] grayscale opacity-50" aria-hidden="true">{path.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400">{path.title}</span>
                  <span className="shrink-0 rounded-md border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">planned</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── What an account adds — and what it does not ───────────────── */}
      <section aria-labelledby="account-heading" className="border-b border-slate-800/70 bg-[#050b18]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-violet-300">Optional accounts</p>
            <h2 id="account-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A small, honest set of additions.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-slate-400">
              If you never create an account, nothing is taken away. If you do, this is the whole difference.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-emerald-100">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" /> What an account adds
              </h3>
              <ul className="mt-4 space-y-2.5">
                {accountAdds.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-6 text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#081120]/70 p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-200">
                <CircleSlash className="h-4 w-4 text-slate-400" aria-hidden="true" /> What it does not add
              </h3>
              <ul className="mt-4 space-y-2.5">
                {accountDoesNot.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-6 text-slate-400">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              <p className="min-w-0 text-[13px] leading-6 text-slate-400">
                Moving between devices is deliberate: export a progress file on one, import it on the other. Imported
                records stay marked unverified and never award XP or a certificate.
              </p>
            </div>
            <Link to="/how-it-works" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3.5 text-[12.5px] font-medium text-slate-200 transition-colors hover:bg-slate-800">
              How it works <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Close ─────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_110%,rgba(34,211,238,0.14),transparent_60%),linear-gradient(180deg,#020617,#06101e)]" aria-hidden="true" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Start the Preview Curriculum now.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-400">
              Foundations, reconnaissance, and traffic analysis are open to you right now, in this
              browser, with no account. An approved account adds the{' '}
              <span className="text-slate-200">Full Curriculum</span> — and, more importantly, a
              progress record that is yours rather than this browser&apos;s.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={signedIn ? '/app' : '/app'}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 text-sm font-bold text-slate-950 shadow-[0_10px_32px_rgba(34,211,238,.18)] transition-colors hover:bg-cyan-200 sm:w-auto"
              >
                {signedIn ? 'Open your workspace' : 'Start the Preview Curriculum'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {!signedIn && (
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-6 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/70 sm:w-auto"
                >
                  <Fingerprint className="h-4 w-4 text-violet-300" aria-hidden="true" /> Continue with an approved account
                </Link>
              )}
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-[12px] text-slate-500">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              For authorized, legal security testing only. Simulated and bundled artifacts — no live range, no accredited
              certification.
            </p>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function X({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
