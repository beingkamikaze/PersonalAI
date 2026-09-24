"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import {
  CheckIcon,
  ChevronRightIcon,
  DocIcon,
  GlobeIcon,
  LinkIcon,
  ProfileIcon,
} from "@/components/ui/icons";
import { isUiPreview } from "@/lib/env";
import { revealContainer, revealItem } from "@/lib/motion";

const QUESTIONS = [
  "What do you do?",
  "What projects have you worked on?",
  "Are you open to new opportunities?",
  "What’s your tech stack?",
  "How do you prefer to work?",
] as const;

const STEPS = [
  {
    number: "1",
    title: "Answer a short interview",
    body: "Tell us about your work, experience, personality, and what your AI should and shouldn’t say.",
  },
  {
    number: "2",
    title: "Add your knowledge",
    body: "Upload your resume, documents, notes, or links. Your AI learns from everything you share.",
  },
  {
    number: "3",
    title: "Publish and share",
    body: "Test it privately, make changes, then publish your link and share it anywhere.",
  },
] as const;

const SUGGESTED = [
  "What projects have you worked on?",
  "Are you open to new opportunities?",
  "What’s your tech stack?",
  "How do you work with clients?",
] as const;

const SHARE_PLACES = [
  { label: "LinkedIn", icon: LinkedInMark, color: "text-[#0a66c2]" },
  { label: "Email signature", icon: MailMark, color: "text-accent" },
  { label: "Resume", icon: DocIcon, color: "text-[#c47a45]" },
  { label: "Your website", icon: GlobeIcon, color: "text-[#3d6d8c]" },
  { label: "Social profile", icon: ProfileIcon, color: "text-accent" },
] as const;

const CARD =
  "rounded-[20px] border border-border bg-white shadow-[0_10px_28px_-22px_rgba(18,40,32,0.38)]";

const PILL =
  "!rounded-full px-5 py-2.5 hover:-translate-y-px hover:shadow-[0_10px_22px_-14px_rgba(12,107,86,0.7)]";

export function LandingHero() {
  const preview = isUiPreview();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);
  const createHref = preview ? "/onboarding/create" : "/sign-up";

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="mx-auto w-full max-w-[1200px] px-5 pb-2 pt-3 sm:px-8 lg:pt-5"
      >
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-8 xl:gap-12">
          <div className="relative min-w-0">
            <motion.p
              variants={item}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Your knowledge. Always available.
            </motion.p>
            <motion.h1
              variants={item}
              className="mt-4 max-w-[34rem] font-display text-[2.75rem] leading-[1.08] tracking-[-0.02em] text-fg sm:text-[3.15rem] lg:text-[3.45rem] xl:text-[3.7rem]"
            >
              <span className="block">Turn your knowledge</span>
              <span className="block">into an AI that</span>
              <span className="block text-accent">represents you.</span>
            </motion.h1>
            <motion.p
              variants={item}
              className="mt-4 max-w-[28rem] text-[17px] leading-[1.6] text-muted"
            >
              Create your AI in 10–15 minutes. Give it your knowledge,
              personality, and expertise, then share a link so people can learn
              about you—even when you’re busy.
            </motion.p>
            <motion.div
              variants={item}
              className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4"
            >
              <ButtonLink href={createHref} className={PILL}>
                Create Your AI <span aria-hidden>→</span>
              </ButtonLink>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2.5 text-sm font-medium text-fg hover:text-accent"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-accent">
                  <PlayMark />
                </span>
                See how it works
              </a>
            </motion.div>
            <motion.ul
              variants={item}
              className="mt-5 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 xl:flex-nowrap xl:gap-x-4"
            >
              {[
                "No credit card required",
                "Setup in 10–15 minutes",
                "You control what your AI knows",
              ].map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {point}
                </li>
              ))}
            </motion.ul>
            <CurveMark />
          </div>

          <motion.div variants={item} className="min-w-0">
            <HeroPreview reduceMotion={Boolean(reduceMotion)} />
          </motion.div>
        </section>

        <motion.div variants={item} className="mt-8 lg:mt-10">
          <ShareBar />
        </motion.div>
      </motion.div>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-[4.75rem]">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-14">
          <div className="max-w-xl">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-3 font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem] lg:text-[2.7rem]">
              <span className="block">You can’t always be</span>
              <span className="block">
                available.{" "}
                <span className="text-accent">Your expertise can.</span>
              </span>
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-[1.65] text-muted">
              People often have questions about what you do, your experience,
              whether you’re a good fit, or how you work. But you can’t always
              respond—you’re in meetings, focused on deep work, or simply
              offline.
            </p>
          </div>
          <QuestionStack />
        </div>
      </Reveal>

      <Reveal
        id="how-it-works"
        className="scroll-mt-8 mx-auto w-full max-w-[1200px] px-5 py-14 text-center sm:px-8 lg:py-16"
      >
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-2xl font-display text-[2.35rem] leading-[1.12] tracking-[-0.02em] text-fg text-balance sm:text-5xl lg:text-[3.15rem]">
          Ten minutes to a link people can ask.
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">
          Create your AI in three simple steps.
        </p>
        <ol className="mt-10 grid gap-4 text-left lg:grid-cols-3 lg:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.number} className="relative">
              <article
                className={`${CARD} flex h-full flex-col p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-24px_rgba(18,40,32,0.45)] sm:p-7`}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-sm font-medium text-accent">
                  {step.number}
                </span>
                <h3 className="mt-4 text-[1.2rem] font-medium leading-snug text-fg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-[1.65] text-muted">
                  {step.body}
                </p>
              </article>
              {index < STEPS.length - 1 ? (
                <span
                  className="absolute top-1/2 -right-5 hidden -translate-y-1/2 text-muted lg:block"
                  aria-hidden
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <Eyebrow>What people see</Eyebrow>
            <h2 className="mt-3 font-display text-[2.35rem] leading-[1.12] tracking-[-0.02em] text-fg sm:text-5xl lg:text-[3.15rem]">
              A single link for your entire professional presence.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-[1.65] text-muted">
              Share your PersonaAI link and let people ask about your work,
              experience, skills, projects, and more—and get answers based on
              your knowledge.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
              <LinkIcon className="h-4 w-4" />
              persona.ai/u/mayank <span aria-hidden>→</span>
            </p>
          </div>
          <ProfilePreview />
        </div>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 pb-6 pt-4 sm:px-8 lg:pb-10 lg:pt-6">
        <FinalCta href={createHref} />
      </Reveal>

      <footer className="mt-8 border-t border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-display text-lg tracking-tight text-fg">
            PersonaAI
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <Link href="/pricing" className="hover:text-fg">
              Pricing
            </Link>
            <Link href="/sign-in" className="hover:text-fg">
              Sign in
            </Link>
            <Link href={createHref} className="hover:text-fg">
              Create Your AI
            </Link>
            <span>Privacy</span>
            <span>Terms</span>
          </nav>
        </div>
      </footer>
    </>
  );
}

function Reveal({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className: string;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={item}
    >
      {children}
    </motion.section>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  );
}

function HeroPreview({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      className={`${CARD} p-4 sm:p-5`}
      aria-label="Example of a visitor talking with a professional AI"
      animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <Face src="/landing/visitor.jpg" alt="" className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">Mayank’s AI</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1f9d55]" aria-hidden />
              Online
            </p>
          </div>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
          persona.ai/u/mayank
          <span aria-hidden>→</span>
        </p>
      </div>

      <div className="mt-4 space-y-3 px-0.5">
        <div className="flex items-end justify-end gap-2">
          <p className="max-w-[82%] rounded-2xl rounded-br-md bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            Are you open to new projects this quarter?
          </p>
          <Face src="/landing/alex.jpg" alt="" className="h-7 w-7" />
        </div>
        <div className="flex items-end gap-2">
          <Face src="/landing/visitor.jpg" alt="" className="h-7 w-7" />
          <p className="max-w-[82%] rounded-2xl rounded-bl-md bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            Yes, I’m open to new projects starting next month. I typically work
            on web applications and AI products. You can find more details
            about my experience, tech stack, and projects here.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-[var(--bg)] py-1 pl-4 pr-1">
        <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
          Ask anything about me…
        </p>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white"
          aria-hidden
        >
          <ArrowMark />
        </span>
      </div>
    </motion.div>
  );
}

function ShareBar() {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-[0_8px_24px_-20px_rgba(18,40,32,0.45)] sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <p className="shrink-0 text-[13px] font-medium text-fg">
          Share your AI anywhere
        </p>
        <ul className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap lg:gap-x-6">
          {SHARE_PLACES.map(({ label, icon: Icon, color }) => (
            <li
              key={label}
              className="inline-flex min-w-0 items-center gap-2 text-[13px] text-muted"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function QuestionStack() {
  const reduceMotion = useReducedMotion();
  const offsets = ["md:ml-10", "md:ml-0", "md:ml-16", "md:ml-4", "md:ml-12"];
  const faces = [
    "/landing/alex.jpg",
    "/landing/visitor.jpg",
    "/landing/alex.jpg",
    "/landing/visitor.jpg",
    "/landing/alex.jpg",
  ];

  return (
    <ul className="mx-auto flex w-full max-w-md flex-col gap-3 lg:mx-0 lg:ml-auto lg:max-w-[26rem]">
      {QUESTIONS.map((question, index) => (
        <motion.li
          key={question}
          className={`w-full md:w-fit ${offsets[index]}`}
          animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 6 + index * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.25,
                }
          }
        >
          <div className="flex w-full items-center gap-2.5 rounded-full border border-border bg-white py-1.5 pl-1.5 pr-4 shadow-[0_8px_22px_-16px_rgba(18,40,32,0.55)] md:w-auto">
            <Face src={faces[index]} alt="" className="h-7 w-7" />
            <span className="text-sm text-fg">{question}</span>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function ProfilePreview() {
  return (
    <article className={`${CARD} p-6 sm:p-8`}>
      <div className="flex items-center gap-3.5">
        <Face src="/landing/visitor.jpg" alt="" className="h-12 w-12" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-xl tracking-tight text-fg">
            Mayank Sandilya
            <span className="h-1.5 w-1.5 rounded-full bg-[#1f9d55]" aria-hidden />
          </p>
          <p className="text-sm text-muted">Software Developer</p>
        </div>
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        I build web applications and AI products. Ask me about my experience,
        tech stack, projects, or how I work.
      </p>
      <ul className="mt-5 border-t border-border">
        {SUGGESTED.map((question) => (
          <li
            key={question}
            className="flex items-center justify-between gap-3 border-b border-border py-3 text-sm text-fg last:border-b-0"
          >
            <span>{question}</span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
          </li>
        ))}
      </ul>
    </article>
  );
}

function FinalCta({ href }: { href: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-accent-soft px-6 py-12 text-center sm:px-10 md:py-16">
      <Arc className="absolute -left-6 top-4 h-44 w-20 text-accent/20" />
      <Arc className="absolute -right-4 bottom-2 h-40 w-16 rotate-180 text-accent/15" />
      <div className="relative">
        <Eyebrow>Get started</Eyebrow>
        <h2 className="mx-auto mt-3 max-w-2xl font-display text-[2.05rem] leading-[1.16] tracking-[-0.02em] text-fg sm:text-[2.55rem] lg:text-[2.85rem]">
          <span className="block">You already know yourself.</span>
          <span className="block">
            Now let your AI
            <br className="sm:hidden" /> know you.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-[1.6] text-muted">
          Create your AI in 10–15 minutes and give people a new way to
          understand your work, expertise, and personality.
        </p>
        <div className="mt-7">
          <ButtonLink href={href} className={PILL}>
            Create Your AI <span aria-hidden>→</span>
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-muted">No credit card required</p>
      </div>
    </div>
  );
}

function Face({
  src,
  alt,
  className = "h-9 w-9",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={48}
      height={48}
      className={`${className} shrink-0 rounded-full object-cover object-top`}
    />
  );
}

function CurveMark() {
  return (
    <svg
      className="pointer-events-none absolute -right-1 top-[9.25rem] hidden h-11 w-16 text-accent/80 lg:block"
      viewBox="0 0 64 40"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 28c16-1 20-16 40-18"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M34 6.5c3.2 2.2 5.2 3 8 3-2.4 1.5-4.4 3.6-5.4 6.4"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arc({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 80 180" fill="none" aria-hidden>
      <path
        d="M70 8c-40 28-52 70-40 164"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M48 20c-28 24-36 62-26 140"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M2.2 1.2v7.6L8.6 5 2.2 1.2Z" />
    </svg>
  );
}

function LinkedInMark(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function MailMark(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
