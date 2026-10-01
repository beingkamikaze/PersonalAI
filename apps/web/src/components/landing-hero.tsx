"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  DocIcon,
  GlobeIcon,
  KnowledgeIcon,
  LinkIcon,
  MemoryIcon,
  ProfileIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
} from "@/components/ui/icons";
import { isUiPreview } from "@/lib/env";
import { revealContainer, revealItem } from "@/lib/motion";

const QUESTIONS = [
  "What do you do?",
  "Are you taking on new work?",
  "How do you like to work?",
  "What should I know before we talk?",
  "What projects have you worked on?",
] as const;

const STEPS = [
  {
    id: "interview",
    number: "01",
    title: "Tell us about you",
    body: "A short interview about your work and what it should never invent.",
  },
  {
    id: "knowledge",
    number: "02",
    title: "Teach your AI",
    body: "Upload documents, notes, or a link it can answer from.",
  },
  {
    id: "customize",
    number: "03",
    title: "Customize it",
    body: "Set memories, preferences, boundaries, and how it talks.",
  },
  {
    id: "chat",
    number: "04",
    title: "Chat and test",
    body: "Ask real questions, then correct anything it gets wrong.",
  },
  {
    id: "share",
    number: "05",
    title: "Share it",
    body: "Publish a link so other people can ask about your work.",
  },
] as const;

const KNOW = [
  {
    title: "Your knowledge",
    body: "Documents, notes, and links it can answer from.",
    example: "Resume.pdf · Project notes · a link to your site",
    icon: KnowledgeIcon,
    tone: "bg-[var(--tone-sky)] text-[#2563eb]",
  },
  {
    title: "Your memory",
    body: "Facts and project details you want remembered.",
    example: "Led the client workshop series in 2024",
    icon: MemoryIcon,
    tone: "bg-accent-soft text-accent",
  },
  {
    title: "Your preferences",
    body: "How you like to work and communicate.",
    example: "Async first. Short written updates.",
    icon: SlidersIcon,
    tone: "bg-[var(--tone-mint)] text-accent",
  },
  {
    title: "Your boundaries",
    body: "What it should never invent or share.",
    example: "Do not invent fees or private contacts.",
    icon: ShieldIcon,
    tone: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
  },
  {
    title: "Your personality",
    body: "Tone: formal or warm, brief or detailed.",
    example: "Clear, warm, and concise",
    icon: SettingsIcon,
    tone: "bg-[#fff7e6] text-[var(--tone-amber)]",
  },
  {
    title: "Your conversations",
    body: "Private chats where you check answers and save what matters.",
    example: "“How do you start a project?” — saved to memory",
    icon: ChatIcon,
    tone: "bg-[var(--tone-sky)] text-[#2563eb]",
  },
] as const;

const AUDIENCES = [
  {
    title: "Freelancers",
    body: "Services, experience, and how you like to work.",
  },
  {
    title: "Consultants and experts",
    body: "The questions you already answer, ready for someone to ask.",
  },
  {
    title: "Creators",
    body: "Your work and point of view, for the people who follow you.",
  },
  {
    title: "Professionals",
    body: "Your background, preferences, and the facts you choose to share.",
  },
] as const;

const SUGGESTED = [
  "What kind of work do you take on?",
  "How do you like to work?",
  "What should I know before we talk?",
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
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-left text-xs leading-relaxed text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              For freelancers, consultants, and independent professionals
            </motion.p>
            <motion.h1
              variants={item}
              className="mt-4 max-w-[36rem] font-display text-[2.65rem] leading-[1.08] tracking-[-0.02em] text-fg sm:text-[3.15rem] lg:text-[3.4rem] xl:text-[3.55rem]"
            >
              <span className="block">Create your own</span>
              <span className="block">AI assistant.</span>
              <span className="block text-accent">No code required.</span>
            </motion.h1>
            <motion.p
              variants={item}
              className="mt-4 max-w-[32rem] text-[17px] leading-[1.6] text-muted"
            >
              A personal AI assistant you create yourself. Teach it with your
              information, knowledge, memories, preferences, and boundaries —
              then test it and share it.
            </motion.p>
            <motion.div
              variants={item}
              className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4"
            >
              <ButtonLink href={createHref} className={PILL}>
                Create your AI <span aria-hidden>→</span>
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
              className="mt-5 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
            >
              {[
                "No credit card required",
                "You decide what it can say",
              ].map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {point}
                </li>
              ))}
            </motion.ul>
            <CurveMark />
          </div>

          <motion.div variants={item} className="min-w-0">
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Someone asks your AI about your work.
              <span className="mt-0.5 block">
                It answers using what you’ve taught it.
              </span>
            </p>
            <HeroPreview reduceMotion={Boolean(reduceMotion)} />
          </motion.div>
        </section>
      </motion.div>

      <Reveal
        id="how-it-works"
        className="scroll-mt-8 mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14"
      >
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 max-w-xl font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem] lg:text-[2.85rem]">
          Create, teach, customize, test, share.
        </h2>
        <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-muted">
          One path. You stay in control the whole way.
        </p>
        <ol className={`${CARD} mt-8 grid grid-cols-1 divide-y divide-border lg:grid-cols-5 lg:divide-x lg:divide-y-0`}>
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex flex-col p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-accent-soft px-2 text-sm font-medium text-accent">
                  {step.number}
                </span>
                {index < STEPS.length - 1 ? (
                  <span
                    className="hidden h-px flex-1 bg-border lg:block"
                    aria-hidden
                  />
                ) : null}
              </div>
              <h3 className="mt-3 text-[1.05rem] font-medium leading-snug text-fg">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-[1.55] text-muted">
                {step.body}
              </p>
              <div className="mt-3">
                <StepMock id={step.id} />
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <Eyebrow>What you can add</Eyebrow>
        <h2 className="mt-3 max-w-xl font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem]">
          Give your AI the context that makes it yours.
        </h2>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted">
          Add the knowledge, memories, preferences, boundaries, personality, and
          conversations you want your assistant to use.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KNOW.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title}>
                <article className={`${CARD} flex h-full flex-col p-5 sm:p-6`}>
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 text-[1.05rem] font-medium text-fg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-[1.65] text-muted">
                    {item.body}
                  </p>
                  <p className="mt-4 rounded-xl bg-[var(--bg)] px-3 py-2.5 text-xs leading-relaxed text-fg">
                    {item.example}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-sm text-muted">
          Memories stay private to you. You can edit or remove them anytime.
        </p>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-12">
          <div className="max-w-xl">
            <Eyebrow>Who it is for</Eyebrow>
            <h2 className="mt-3 font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem]">
              For people who keep answering the same questions.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-[1.65] text-muted">
              If people repeatedly ask about your work, experience, services,
              process, or point of view, your assistant can handle those
              questions.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {AUDIENCES.map((audience) => (
                <li key={audience.title}>
                  <h3 className="text-sm font-medium text-fg">{audience.title}</h3>
                  <p className="mt-1 text-sm leading-[1.6] text-muted">
                    {audience.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <QuestionStack />
        </div>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <Eyebrow>Why PersonaAI</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem]">
          Built around your work, not a blank chat.
        </h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className={`${CARD} p-6 sm:p-7`}>
            <h3 className="font-display text-2xl tracking-tight text-fg">
              A generic AI
            </h3>
            <p className="mt-3 text-sm leading-[1.7] text-muted">
              Start conversations by repeatedly explaining your context,
              preferences, and work.
            </p>
          </article>
          <article className={`${CARD} border-accent/25 p-6 sm:p-7`}>
            <h3 className="font-display text-2xl tracking-tight text-fg">
              PersonaAI
            </h3>
            <p className="mt-3 text-sm leading-[1.7] text-muted">
              Keep your knowledge, preferences, boundaries, and context in one
              assistant you can refine and share.
            </p>
          </article>
        </div>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-fg">
          The value is not another chatbot. It’s having an assistant that’s
          already set up around your work.
        </p>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-xl">
            <Eyebrow>What other people see</Eyebrow>
            <h2 className="mt-3 font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem] lg:text-[2.85rem]">
              Someone asks. Your AI answers from your work.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-[1.65] text-muted">
              After you publish, anyone with your link can ask about your work.
              The reply uses your context, preferences, knowledge, and
              boundaries — not a blank chat.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
              <LinkIcon className="h-4 w-4" />
              persona.ai/u/alex <span aria-hidden>→</span>
            </p>
          </div>
          <ProfilePreview />
        </div>
        <div className="mt-8">
          <ShareBar />
        </div>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem]">
          Start free. Upgrade when your assistant needs more room.
        </h2>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted">
          Free is the assistant itself. Plus raises the limits once people are
          using it.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className={`${CARD} p-6 sm:p-7`}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-2xl tracking-tight text-fg">Free</h3>
              <p className="text-sm font-medium text-fg">₹0</p>
            </div>
            <p className="mt-3 text-sm leading-[1.7] text-muted">
              Create and teach one assistant, then share the link. About 40
              chats a day and about 8 knowledge sources during the soft launch.
              Visitor chats are limited too.
            </p>
          </article>
          <article className={`${CARD} p-6 sm:p-7`}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-2xl tracking-tight text-fg">Plus</h3>
              <p className="text-sm font-medium text-muted">Soon</p>
            </div>
            <p className="mt-3 text-sm leading-[1.7] text-muted">
              Higher daily chat and knowledge limits. Billing starts after the
              soft launch.
            </p>
          </article>
        </div>
        <p className="mt-5 text-sm">
          <Link href="/pricing" className="font-medium text-accent hover:text-accent-hover">
            See pricing
          </Link>
        </p>
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 pb-6 pt-4 sm:px-8 lg:pb-10 lg:pt-6">
        <FinalCta href={createHref} />
      </Reveal>

      <footer className="mt-6 border-t border-border">
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
              Create your AI
            </Link>
            <span>Privacy</span>
            <span>Terms</span>
          </nav>
        </div>
      </footer>
    </>
  );
}

function StepMock({ id }: { id: (typeof STEPS)[number]["id"] }) {
  if (id === "interview") {
    return (
      <div className="rounded-xl border border-border bg-[var(--bg)] p-3" aria-hidden>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Interview
        </p>
        <p className="mt-2 text-[13px] font-medium leading-snug text-fg">
          What do you do day to day?
        </p>
        <p className="mt-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          I advise clients, write the plan, and stay with the work until it ships.
        </p>
      </div>
    );
  }

  if (id === "knowledge") {
    const rows = ["Resume.pdf", "Project notes", "yoursite.com"];
    return (
      <div className="rounded-xl border border-border bg-[var(--bg)] p-3" aria-hidden>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Knowledge
        </p>
        <ul className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <li
              key={row}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px]"
            >
              <span className="truncate text-fg">{row}</span>
              <span className="shrink-0 text-accent">Ready</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "customize") {
    const rows = [
      ["Preference", "Async first"],
      ["Boundary", "No fees"],
      ["Personality", "Concise"],
    ];
    return (
      <div className="rounded-xl border border-border bg-[var(--bg)] p-3" aria-hidden>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Memory and settings
        </p>
        <ul className="mt-2 space-y-1.5">
          {rows.map(([label, value]) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px]"
            >
              <span className="text-muted">{label}</span>
              <span className="truncate text-fg">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "chat") {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-[var(--bg)] p-3" aria-hidden>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Private chat
        </p>
        <p className="ml-6 rounded-2xl rounded-br-md bg-white px-2.5 py-1.5 text-[11px] leading-relaxed text-fg">
          How do you usually start a project?
        </p>
        <p className="mr-4 rounded-2xl rounded-bl-md bg-accent-soft px-2.5 py-1.5 text-[11px] leading-relaxed text-fg">
          A short call first, then I work async.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-[var(--bg)] p-3" aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
        Your public page
      </p>
      <p className="mt-2 text-[13px] font-medium text-accent">persona.ai/u/alex</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Published. People can ask about your work.
      </p>
    </div>
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
      aria-label="Example of someone asking a consultant’s AI about new clients, answered from their work, preferences, and boundaries"
      animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <Face src="/landing/alex.jpg" alt="" className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">Alex’s AI</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1f9d55]" aria-hidden />
              Online · Independent consultant
            </p>
          </div>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
          persona.ai/u/alex
          <span aria-hidden>→</span>
        </p>
      </div>

      <div className="mt-4 space-y-3 px-0.5">
        <div className="flex items-end justify-end gap-2">
          <p className="max-w-[82%] rounded-2xl rounded-br-md bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            Are you taking on new consulting clients?
          </p>
          <Face src="/landing/visitor.jpg" alt="" className="h-7 w-7" />
        </div>
        <div className="flex items-end gap-2">
          <Face src="/landing/alex.jpg" alt="" className="h-7 w-7" />
          <p className="max-w-[82%] rounded-2xl rounded-bl-md bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            Yes — a few advisory clients at a time. I start with a short call,
            then work async. I can walk through past projects. I don’t share
            fees or private client details.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-[var(--bg)] py-1 pl-4 pr-1">
        <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
          Ask anything about my work…
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
    "/landing/visitor.jpg",
    "/landing/alex.jpg",
    "/landing/visitor.jpg",
    "/landing/alex.jpg",
    "/landing/visitor.jpg",
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
        <Face src="/landing/alex.jpg" alt="" className="h-12 w-12" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-xl tracking-tight text-fg">
            Alex
            <span className="h-1.5 w-1.5 rounded-full bg-[#1f9d55]" aria-hidden />
          </p>
          <p className="text-sm text-muted">Independent consultant</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <p className="ml-8 rounded-2xl rounded-br-md bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
          Are you taking on new consulting clients?
        </p>
        <p className="mr-6 rounded-2xl rounded-bl-md bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
          Yes — a few advisory clients at a time. I start with a short call,
          then work async. I can walk through past projects. I don’t share fees
          or private client details.
        </p>
        <p className="text-[11px] leading-relaxed text-muted">
          From your work, your preference for async, your project notes, and a
          boundary you set.
        </p>
      </div>
      <ul className="mt-4 border-t border-border">
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
          Create your AI assistant today.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-[1.6] text-muted">
          Start with a short interview. Add what you want it to know. Share it
          when the answers sound right.
        </p>
        <div className="mt-7">
          <ButtonLink href={href} className={PILL}>
            Create your AI <span aria-hidden>→</span>
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
      className="pointer-events-none absolute -right-1 top-[8.5rem] hidden h-11 w-16 text-accent/80 xl:block"
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
