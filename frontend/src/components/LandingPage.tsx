import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Code2,
  FileText,
  MessagesSquare,
  Mic,
  Play,
  Sparkles,
} from 'lucide-react';
import Button from './ui/Button';
import usePageTitle from '../hooks/usePageTitle';

const STEPS = [
  {
    number: '01',
    title: 'Add your resume',
    description:
      'Upload a PDF or Word file, or build one in the studio. HireIQ extracts your role, skills, and experience to shape the questions.',
  },
  {
    number: '02',
    title: 'Choose the format',
    description:
      'Run a resume-aware conversation, or configure a technical screen with your stack and difficulty level.',
  },
  {
    number: '03',
    title: 'Speak naturally',
    description:
      'Aira asks one question at a time, listens for silence, and responds like a real interviewer would.',
  },
  {
    number: '04',
    title: 'Review the tape',
    description:
      'Get a full transcript and structured notes on strengths, weaknesses, and the next thing to fix.',
  },
];

const SIGNALS = [
  'Resume-aware questions',
  'Voice-native sessions',
  'Live transcript',
  'Structured feedback',
];

const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Go', 'Java', 'C++'];
const EASE = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

function SessionPreview() {
  return (
    <div className="relative min-w-0">
      <div
        className="dot-grid pointer-events-none absolute -inset-x-8 -inset-y-10 -z-0 opacity-70"
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mic size={15} />
            </span>
            <div>
              <p className="text-[12px] font-medium leading-tight text-foreground">Interview session</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                Aira · voice
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="badge badge-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Live
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">12:04</span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-[13px] font-medium text-foreground">
                A
              </span>
              <div>
                <p className="text-[12.5px] font-medium text-foreground">Technical screen</p>
                <p className="text-[11px] text-muted-foreground">Frontend · Senior</p>
              </div>
            </div>
            <span className="badge">Question 4 / 8</span>
          </div>

          <div className="mt-4 flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles size={13} />
            </span>
            <div className="max-w-[86%] rounded-xl rounded-tl-sm border border-border bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground">
              Walk me through how you would debug a render loop in React.
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2.5">
            <div className="max-w-[86%] rounded-xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-[12.5px] leading-relaxed text-primary-foreground">
              I&apos;d start with the dependency array, then confirm whether state is being set during
              render…
            </div>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-medium text-foreground">
              Y
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-subtle px-3 py-2.5">
            <span className="text-primary">
              <Mic size={14} />
            </span>
            <div className="flex h-4 flex-1 items-center gap-[3px]" aria-hidden="true">
              {[10, 16, 7, 13, 18, 9, 14, 6, 11, 17, 8, 12].map((height, index) => (
                <span
                  key={index}
                  className="w-[2.5px] rounded-full bg-primary/70 motion-safe:animate-[wave_1s_ease-in-out_infinite]"
                  style={{ height, animationDelay: `${index * 0.07}s` }}
                />
              ))}
            </div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              Listening
            </span>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Interview progress</span>
            <span className="font-medium text-foreground">50%</span>
          </div>
          <div className="meter mt-2">
            <div className="meter-fill" style={{ width: '50%' }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  usePageTitle('AI interview studio');

  return (
    <div className="overflow-hidden">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-14 pb-20 pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-28 lg:pt-20">
          <div className="min-w-0">
            <motion.p
              className="eyebrow eyebrow-dot"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              AI interview studio
            </motion.p>

            <motion.h1
              className="display mt-5 text-[clamp(2.5rem,5.6vw,4.1rem)] text-foreground"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            >
              Practice the room
              <br />
              <em>before</em> it matters.
            </motion.h1>

            <motion.p
              className="display-sub mt-6 max-w-[46ch]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: EASE }}
            >
              HireIQ reads your resume, runs a realistic voice interview, and hands back a
              transcript you can actually learn from. No scripts. No pressure. No account.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.26, ease: EASE }}
            >
              <Button as={Link} to="/upload" size="lg">
                <Play size={16} />
                Start a mock interview
              </Button>
              <Button as={Link} to="/tech-interview" variant="outline" size="lg">
                Configure technical round
              </Button>
            </motion.div>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-border pt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.36 }}
            >
              {SIGNALS.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  <Check size={11} className="text-primary" />
                  {signal}
                </span>
              ))}
            </motion.div>
          </div>

          <SessionPreview />
        </div>
      </section>

      {/* ── Proof strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-subtle">
        <div className="container-page grid grid-cols-2 gap-y-8 py-8 sm:grid-cols-4">
          {[
            ['8', 'questions per session'],
            ['~12 min', 'for a realistic round'],
            ['1', 'transcript to review'],
            ['0', 'accounts required'],
          ].map(([value, label]) => (
            <div key={label} className="px-1">
              <p className="font-display text-[24px] font-medium tracking-[-0.03em] text-foreground">
                {value}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="container-page py-20 lg:py-28" id="how-it-works">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center">The practice loop</p>
          <h2 className="mt-4 text-[clamp(1.9rem,3.4vw,2.8rem)] font-semibold tracking-[-0.035em] text-foreground">
            Four steps. One honest rehearsal.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Built to feel less like a test and more like the real conversation — with the replay
            you never get after the real one.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.06} className="bg-card">
              <div className="flex h-full flex-col gap-4 p-6">
                <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Product surface ─────────────────────────────────────────────── */}
      <section className="border-t border-border bg-subtle py-20 lg:py-28" id="features">
        <div className="container-page">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">The whole loop</p>
              <h2 className="mt-4 text-[clamp(1.9rem,3.4vw,2.8rem)] font-semibold tracking-[-0.035em] text-foreground">
                Everything between the blank page and the offer.
              </h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
              Resume, rehearsal, and review live in one place — so the feedback is grounded in
              something real.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-12">
            {/* Resume studio */}
            <Reveal className="lg:col-span-7">
              <div className="card flex h-full flex-col justify-between overflow-hidden sm:flex-row">
                <div className="flex max-w-[58%] flex-col p-6 sm:p-8">
                  <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                    <FileText size={16} />
                  </span>
                  <h3 className="text-[17px] font-semibold text-foreground">Resume studio</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Build an ATS-ready resume from plain language, then switch templates without
                    losing a line. Export a clean PDF when it is ready.
                  </p>
                  <Link
                    to="/builder"
                    className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                  >
                    Open the studio <ArrowUpRight size={13} />
                  </Link>
                </div>
                <div className="relative mx-6 mb-6 mt-2 flex-1 self-stretch overflow-hidden rounded-lg border border-border bg-white p-4 shadow-xs sm:mx-0 sm:mb-0 sm:mt-6 sm:rounded-r-none sm:border-r-0">
                  <div className="h-2 w-24 rounded-full bg-[#1c2924]" />
                  <div className="mt-1.5 h-1 w-16 rounded-full bg-[#b9c3bd]" />
                  <div className="mt-4 h-px w-full bg-[#e6e4dd]" />
                  <div className="mt-3 h-1 w-full rounded-full bg-[#e6e4dd]" />
                  <div className="mt-1.5 h-1 w-5/6 rounded-full bg-[#e6e4dd]" />
                  <div className="mt-1.5 h-1 w-4/6 rounded-full bg-[#e6e4dd]" />
                  <div className="mt-4 h-1.5 w-20 rounded-full bg-[#1c2924]" />
                  <div className="mt-2 h-1 w-full rounded-full bg-[#e6e4dd]" />
                  <div className="mt-1.5 h-1 w-11/12 rounded-full bg-[#e6e4dd]" />
                  <div className="mt-1.5 h-1 w-3/4 rounded-full bg-[#e6e4dd]" />
                  <div className="mt-4 flex gap-1.5">
                    <span className="h-4 w-12 rounded-full bg-[#e8f1ec]" />
                    <span className="h-4 w-10 rounded-full bg-[#e8f1ec]" />
                    <span className="h-4 w-14 rounded-full bg-[#e8f1ec]" />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Technical rounds */}
            <Reveal delay={0.06} className="lg:col-span-5">
              <div className="card flex h-full flex-col p-6 sm:p-8">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                  <Code2 size={16} />
                </span>
                <h3 className="text-[17px] font-semibold text-foreground">Technical rounds</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Name the languages you want to be pushed on. Choose a complexity level and get a
                  focused engineering screen.
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {LANGUAGES.map((language) => (
                    <span key={language} className="badge text-[11px]">
                      {language}
                    </span>
                  ))}
                  <span className="badge badge-primary text-[11px]">+ add your own</span>
                </div>
                <Link
                  to="/tech-interview"
                  className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[13px] font-medium text-primary hover:underline"
                >
                  Configure a round <ArrowUpRight size={13} />
                </Link>
              </div>
            </Reveal>

            {/* Transcript */}
            <Reveal delay={0.08} className="lg:col-span-5">
              <div className="card flex h-full flex-col p-6 sm:p-8">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                  <MessagesSquare size={16} />
                </span>
                <h3 className="text-[17px] font-semibold text-foreground">Live transcript</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Watch the conversation as it happens. Say something you want to revisit? It is
                  already written down.
                </p>
                <div className="mt-5 space-y-2 rounded-lg border border-border bg-subtle p-3">
                  <div className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                      How would you make this component resilient to slow networks?
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <p className="max-w-[85%] rounded-lg bg-primary px-2.5 py-1.5 text-[11.5px] leading-relaxed text-primary-foreground">
                      Start with optimistic UI, then reconcile…
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Feedback */}
            <Reveal delay={0.1} className="lg:col-span-7">
              <div className="card flex h-full flex-col p-6 sm:p-8">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                  <BarChart3 size={16} />
                </span>
                <h3 className="text-[17px] font-semibold text-foreground">Feedback report</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  At the end, the transcript becomes notes: what landed, what wobbled, and what to
                  rehearse next.
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                  {[
                    ['Strengths', 'Clear structure and tradeoffs', 'success'],
                    ['Weaknesses', 'Rushed the edge cases', 'danger'],
                    ['Next', 'Rehearse failure modes', 'warning'],
                  ].map(([title, copy, tone]) => (
                    <div
                      key={title}
                      className={`rounded-lg border border-border border-t-2 bg-subtle p-3 ${
                        tone === 'success'
                          ? 'border-t-success'
                          : tone === 'danger'
                            ? 'border-t-danger'
                            : 'border-t-warning'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {title}
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────────── */}
      <section className="container-page py-16 lg:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-16 lg:px-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
              aria-hidden="true"
            />
            <div className="relative max-w-2xl">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] opacity-70">
                Rehearsal beats repetition
              </p>
              <h2 className="display mt-4 text-[clamp(2.2rem,5vw,3.6rem)] text-primary-foreground">
                Your next interview should be a <span className="italic">rehearsal</span>.
              </h2>
              <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed opacity-80">
                Start with your resume or skip straight to a technical round. The first session
                takes about twelve minutes.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  as={Link}
                  to="/upload"
                  variant="secondary"
                  size="lg"
                  className="border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Start a mock interview
                  <ArrowRight size={16} />
                </Button>
                <Button
                  as={Link}
                  to="/tech-interview"
                  variant="outline"
                  size="lg"
                  className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  Technical round
                </Button>
              </div>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] opacity-60">
                No account · Local-first · Free to use
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
