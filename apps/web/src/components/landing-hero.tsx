"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { MotionConfig, motion, useAnimation } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import { ContextAssembly } from "@/components/landing-context";
import {
  CheckIcon,
  ChevronRightIcon,
  DocIcon,
  GlobeIcon,
  LinkIcon,
  ProfileIcon,
} from "@/components/ui/icons";
import { isUiPreview } from "@/lib/env";
import { revealContainer, revealItem, useHydratedReducedMotion } from "@/lib/motion";

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
  const reduceMotion = useHydratedReducedMotion();
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

          <div className="min-w-0">
            <motion.p
              variants={item}
              className="mb-3 text-sm leading-relaxed text-muted"
            >
              Someone asks your AI about your work.
              <span className="mt-0.5 block">
                It answers using what you’ve taught it.
              </span>
            </motion.p>
            <HeroPreview />
          </div>
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
        <HowItWorks />
      </Reveal>

      <Reveal className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <Eyebrow>What you can add</Eyebrow>
        <h2 className="mt-3 max-w-xl font-display text-[2.15rem] leading-[1.14] tracking-[-0.02em] text-fg sm:text-[2.6rem]">
          Give your AI the context that makes it yours.
        </h2>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-muted">
          Teach it what to know, remember, how to work, and what never to say.
        </p>
        <ContextAssembly />
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

const STEP_DWELL_MS = 1800;
const STEP_PAUSE_MS = 1100;

function HowItWorks() {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    let timer = 0;
    let index = 0;
    let alive = true;

    const schedule = () => {
      const wait = index === STEPS.length - 1 ? STEP_DWELL_MS + STEP_PAUSE_MS : STEP_DWELL_MS;
      timer = window.setTimeout(() => {
        if (!alive) return;
        index = (index + 1) % STEPS.length;
        setActive(index);
        schedule();
      }, wait);
    };

    const start = () => {
      window.clearTimeout(timer);
      index = 0;
      setActive(0);
      schedule();
    };

    const stop = () => {
      window.clearTimeout(timer);
      setActive(null);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.28 },
    );
    observer.observe(node);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <ol
      ref={listRef}
      className="mt-8 grid grid-cols-1 gap-2.5 lg:grid-cols-5"
    >
      {STEPS.map((step, index) => {
        const isActive = active === index;
        const lineLeads = active === index;
        const mobileEdge = index > 0 && active === index - 1;
        return (
          <li
            key={step.id}
            data-step={step.number}
            data-active={isActive ? "true" : "false"}
            className={`${CARD} relative flex flex-col p-4 outline outline-1 transition-[transform,box-shadow,outline-color] duration-500 ease-in-out sm:p-5 ${
              isActive
                ? "z-10 -translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_24px_-16px_rgba(12,107,86,0.45)] outline-[rgba(12,107,86,0.22)]"
                : "translate-y-0 outline-transparent"
            }`}
          >
            {index > 0 ? (
              <span
                className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-accent transition-opacity duration-500 ease-in-out lg:hidden ${
                  mobileEdge ? "opacity-40" : "opacity-0"
                }`}
                aria-hidden
              />
            ) : null}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-500 ease-in-out ${
                  isActive
                    ? "bg-accent text-white shadow-[0_0_0_4px_rgba(12,107,86,0.12)]"
                    : "bg-accent-soft text-accent shadow-none"
                }`}
              >
                {step.number}
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className="relative hidden h-px flex-1 overflow-hidden bg-border lg:block"
                  aria-hidden
                >
                  <span
                    className={`absolute inset-0 origin-left bg-accent opacity-40 transition-transform duration-700 ease-in-out ${
                      lineLeads ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-[1.05rem] font-medium leading-snug text-fg">
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm leading-[1.55] text-muted">
              {step.body}
            </p>
            <div className="mt-auto pt-3">
              <StepMock id={step.id} active={isActive} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepMock({
  id,
  active,
}: {
  id: (typeof STEPS)[number]["id"];
  active: boolean;
}) {
  const shell = `rounded-xl border bg-[var(--bg)] p-3 transition-[border-color,box-shadow] duration-500 ease-in-out ${
    active
      ? "border-[rgba(12,107,86,0.25)] shadow-[0_0_0_3px_rgba(12,107,86,0.06)]"
      : "border-border shadow-none"
  }`;

  if (id === "interview") return <InterviewMock active={active} shell={shell} />;
  if (id === "knowledge") return <KnowledgeMock active={active} shell={shell} />;
  if (id === "customize") return <CustomizeMock active={active} shell={shell} />;
  if (id === "chat") return <ChatMock active={active} shell={shell} />;
  return <ShareMock active={active} shell={shell} />;
}

function InterviewMock({ active, shell }: { active: boolean; shell: string }) {
  const [answerIn, setAnswerIn] = useState(true);

  useEffect(() => {
    if (!active) {
      setAnswerIn(true);
      return;
    }
    setAnswerIn(false);
    const id = window.setTimeout(() => setAnswerIn(true), 280);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <div className={shell} aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
        Interview
      </p>
      <p
        className={`mt-2 text-[13px] font-medium leading-snug transition-colors duration-500 ease-in-out ${
          active ? "text-accent" : "text-fg"
        }`}
      >
        What do you do day to day?
      </p>
      <p
        className={`mt-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] leading-relaxed text-muted transition-[opacity,transform] duration-500 ease-in-out ${
          answerIn ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        I advise clients, write the plan, and stay with the work until it ships.
      </p>
    </div>
  );
}

function KnowledgeMock({ active, shell }: { active: boolean; shell: string }) {
  const rows = ["Resume.pdf", "Project notes", "yoursite.com"];
  const [lit, setLit] = useState(rows.length);

  useEffect(() => {
    if (!active) {
      setLit(rows.length);
      return;
    }
    setLit(-1);
    const timers = rows.map((_, index) =>
      window.setTimeout(() => setLit(index), 180 + index * 420),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active]);

  return (
    <div className={shell} aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
        Knowledge
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((row, index) => {
          const on = !active || lit >= index;
          return (
            <li
              key={row}
              className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors duration-500 ease-in-out ${
                active && lit >= index && lit < rows.length ? "bg-accent-soft" : "bg-white"
              }`}
            >
              <span className="truncate text-fg">{row}</span>
              <span
                className={`shrink-0 text-accent transition-opacity duration-500 ease-in-out ${
                  on ? "opacity-100" : "opacity-35"
                }`}
              >
                Ready
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CustomizeMock({ active, shell }: { active: boolean; shell: string }) {
  const rows = [
    ["Preference", "Async first"],
    ["Boundary", "No fees"],
    ["Personality", "Concise"],
  ];
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    if (!active) {
      setLit(-1);
      return;
    }
    setLit(0);
    const timers = [1, 2].map((index) =>
      window.setTimeout(() => setLit(index), index * 480),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active]);

  return (
    <div className={shell} aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
        Memory and settings
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map(([label, value], index) => (
          <li
            key={label}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors duration-500 ease-in-out ${
              active && lit === index ? "bg-accent-soft" : "bg-white"
            }`}
          >
            <span className="text-muted">{label}</span>
            <span className="truncate text-fg">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatMock({ active, shell }: { active: boolean; shell: string }) {
  const [replyIn, setReplyIn] = useState(true);
  const [replyInstant, setReplyInstant] = useState(false);

  useEffect(() => {
    if (!active) {
      setReplyInstant(false);
      setReplyIn(true);
      return;
    }
    setReplyInstant(true);
    setReplyIn(false);
    const reply = window.setTimeout(() => {
      setReplyInstant(false);
      setReplyIn(true);
    }, 640);
    return () => window.clearTimeout(reply);
  }, [active]);

  return (
    <div className={`space-y-2 ${shell}`} aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
        Private chat
      </p>
      <p
        className={`ml-6 rounded-2xl rounded-br-md bg-white px-2.5 py-1.5 text-[11px] leading-relaxed transition-colors duration-500 ease-in-out ${
          active ? "text-accent" : "text-fg"
        }`}
      >
        How do you usually start a project?
      </p>
      <p
        className={`mr-4 rounded-2xl rounded-bl-md bg-accent-soft px-2.5 py-1.5 text-[11px] leading-relaxed text-fg ease-in-out ${
          replyInstant ? "transition-none" : "transition-[opacity,transform] duration-500"
        } ${replyIn ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
      >
        A short call first, then I work async.
      </p>
    </div>
  );
}

function ShareMock({ active, shell }: { active: boolean; shell: string }) {
  const [stage, setStage] = useState(2);

  useEffect(() => {
    if (!active) {
      setStage(2);
      return;
    }
    setStage(0);
    const url = window.setTimeout(() => setStage(1), 480);
    const published = window.setTimeout(() => setStage(2), 980);
    return () => {
      window.clearTimeout(url);
      window.clearTimeout(published);
    };
  }, [active]);

  return (
    <div className={shell} aria-hidden>
      <p
        className={`text-[10px] font-medium uppercase tracking-[0.14em] text-accent transition-[opacity,box-shadow] duration-500 ease-in-out ${
          active && stage === 0 ? "shadow-[inset_0_-1px_0_rgba(12,107,86,0.45)]" : "shadow-none"
        }`}
      >
        Your public page
      </p>
      <p
        className={`mt-2 text-[13px] font-medium text-accent transition-[opacity,transform] duration-500 ease-in-out ${
          !active || stage >= 1 ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-40"
        }`}
      >
        persona.ai/u/alex
      </p>
      <p
        className={`mt-1 text-[11px] leading-relaxed transition-colors duration-500 ease-in-out ${
          active && stage >= 2 ? "text-accent" : "text-muted"
        }`}
      >
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
  const reduceMotion = useHydratedReducedMotion();
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

const PREVIEW_CHATS = [
  {
    user: "Are you taking on new consulting clients?",
    ai: "Yes — a few advisory clients at a time. I start with a short call, then work async. I can walk through past projects. I don’t share fees or private client details.",
  },
  {
    user: "How do you like to work?",
    ai: "Async first. I write a short plan, then we meet only when a decision needs it. Updates stay brief.",
  },
  {
    user: "What projects have you worked on?",
    ai: "A client workshop series, and a product rollout I stayed with until it shipped. I can walk through the ones closest to what you need.",
  },
  {
    user: "Can you share your rates?",
    ai: "I don’t share fees or private client details. If we’re a fit, I’ll send a written scope after a short call.",
  },
  {
    user: "What should I know before we talk?",
    ai: "Bring the outcome you want and any deadline. I’ll tell you honestly if it’s work I take on, and I won’t invent an answer I don’t have.",
  },
] as const;

const USER_CHAR_MS = 42;
const AI_CHAR_MS = 24;
const ENTER_MS = 600;
const AFTER_ENTER_MS = 500;
const AFTER_USER_MS = 700;
const THINK_MS = 800;
const HOLD_MS = 900;

type PreviewPhase = "enter" | "user" | "gap" | "think" | "ai" | "hold" | "done";

type PreviewTurn = { user: string; ai: string };

function useLandingChatPlayback(controls: ReturnType<typeof useAnimation>) {
  const [phase, setPhase] = useState<PreviewPhase>("enter");
  const [exchange, setExchange] = useState(0);
  const [settled, setSettled] = useState<PreviewTurn[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [aiCount, setAiCount] = useState(0);
  const [live, setLive] = useState("");

  useEffect(() => {
    let alive = true;
    const timers = new Set<number>();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });

    const stop = () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };

    const typeMessage = async (
      text: string,
      setCount: (count: number) => void,
      ms: number,
    ) => {
      for (let i = 1; i <= text.length; i += 1) {
        if (!alive) return;
        setCount(i);
        if (i < text.length) await sleep(ms);
      }
    };

    const showCard = {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: ENTER_MS / 1000, ease: [0.22, 1, 0.36, 1] as const },
    };

    const run = async () => {
      controls.set({ opacity: 0, y: 12, scale: 0.98 });
      setPhase("enter");
      setExchange(0);
      setSettled([]);
      setUserCount(0);
      setAiCount(0);
      setLive("");

      await controls.start(showCard);
      if (!alive) return;
      await sleep(AFTER_ENTER_MS);
      if (!alive) return;

      const history: PreviewTurn[] = [];

      for (let cursor = 0; alive && cursor < PREVIEW_CHATS.length; cursor += 1) {
        const chat = PREVIEW_CHATS[cursor];
        setExchange(cursor);
        setUserCount(0);
        setAiCount(0);

        setPhase("user");
        await typeMessage(chat.user, setUserCount, USER_CHAR_MS);
        if (!alive) return;
        setLive(`Visitor: ${chat.user}`);

        setPhase("gap");
        await sleep(AFTER_USER_MS);
        if (!alive) return;

        setPhase("think");
        await sleep(THINK_MS);
        if (!alive) return;

        setPhase("ai");
        await typeMessage(chat.ai, setAiCount, AI_CHAR_MS);
        if (!alive) return;
        setLive(`Alex’s AI: ${chat.ai}`);

        history.push({ user: chat.user, ai: chat.ai });
        setSettled(history.slice());
        setUserCount(0);
        setAiCount(0);
        setPhase("hold");
        await sleep(HOLD_MS);
        if (!alive) return;
      }

      if (alive) setPhase("done");
    };

    void run();

    return () => {
      stop();
      controls.stop();
    };
  }, [controls]);

  return {
    phase,
    exchange,
    settled,
    userCount,
    aiCount,
    live,
  };
}

function HeroPreview() {
  return (
    <MotionConfig reducedMotion="never">
      <HeroPreviewCard />
    </MotionConfig>
  );
}

function HeroPreviewCard() {
  const controls = useAnimation();
  const playback = useLandingChatPlayback(controls);
  const chat = PREVIEW_CHATS[playback.exchange];
  const threadRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const basisRef = useRef<HTMLDivElement>(null);
  const [threadHeight, setThreadHeight] = useState<number | null>(null);
  const showActive =
    playback.phase === "user" ||
    playback.phase === "gap" ||
    playback.phase === "think" ||
    playback.phase === "ai";

  useLayoutEffect(() => {
    const scroller = threadRef.current;
    const inner = innerRef.current;
    const basis = basisRef.current;
    if (!scroller || !inner || !basis) return;

    const measure = () => {
      const minH = basis.offsetHeight;
      const maxRaw = Number.parseFloat(getComputedStyle(scroller).maxHeight);
      const cap = Number.isFinite(maxRaw) ? maxRaw : inner.scrollHeight;
      const next = Math.min(Math.max(inner.scrollHeight, minH), cap);
      setThreadHeight((prev) => (prev === next ? prev : next));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [playback.settled, playback.userCount, playback.aiCount, playback.phase]);

  useEffect(() => {
    const scroller = threadRef.current;
    if (!scroller) return;
    const pin = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    pin();
    const interval = window.setInterval(pin, 48);
    const stop = window.setTimeout(() => window.clearInterval(interval), 560);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [
    threadHeight,
    playback.userCount,
    playback.aiCount,
    playback.phase,
    playback.settled,
  ]);

  return (
    <motion.div
      className={`${CARD} p-4 sm:p-5`}
      data-landing-chat={playback.phase}
      aria-label="Example of someone asking a consultant’s AI about new clients, answered from their work, preferences, and boundaries"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={controls}
    >
      <p className="sr-only" aria-live="polite">
        {playback.live}
      </p>
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

      <div className="relative mt-4">
        <div
          ref={basisRef}
          className="pointer-events-none invisible absolute inset-x-0 top-0"
          aria-hidden
        >
          <PreviewThread
            ghost
            userText={PREVIEW_CHATS[0].user}
            aiText={PREVIEW_CHATS[0].ai}
          />
        </div>
        <div
          ref={threadRef}
          className="app-scroll max-h-[18rem] overflow-x-hidden overflow-y-auto overscroll-contain transition-[height] duration-500 ease-out motion-reduce:transition-none sm:max-h-[26rem]"
          style={{
            height: threadHeight ?? undefined,
          }}
        >
          <div ref={innerRef} className="space-y-3 px-0.5">
            {playback.settled.map((turn) => (
              <PreviewThread
                key={turn.user}
                userText={turn.user}
                aiText={turn.ai}
              />
            ))}
            {showActive ? (
              <PreviewThread
                userText={chat.user.slice(0, playback.userCount)}
                aiText={
                  playback.phase === "think" || playback.phase === "gap"
                    ? ""
                    : chat.ai.slice(0, playback.aiCount)
                }
                userTyping={
                  playback.phase === "user" &&
                  playback.userCount < chat.user.length
                }
                aiTyping={
                  playback.phase === "ai" && playback.aiCount < chat.ai.length
                }
                thinking={playback.phase === "think"}
              />
            ) : null}
          </div>
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

function PreviewThread({
  ghost = false,
  userText,
  aiText,
  userTyping = false,
  aiTyping = false,
  thinking = false,
  userOpacity = 1,
  aiOpacity = 1,
}: {
  ghost?: boolean;
  userText: string;
  aiText: string;
  userTyping?: boolean;
  aiTyping?: boolean;
  thinking?: boolean;
  userOpacity?: number;
  aiOpacity?: number;
}) {
  return (
    <div
      className={
        ghost
          ? "invisible select-none space-y-3"
          : "space-y-3"
      }
      aria-hidden={ghost ? true : undefined}
    >
      {userText ? (
        <div
          className="flex items-end justify-end gap-2 motion-reduce:transition-none transition-opacity duration-300 ease-out"
          style={ghost ? undefined : { opacity: userOpacity }}
        >
          <p className="max-w-[82%] rounded-2xl rounded-br-md bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            {userText}
            {userTyping ? <TypingCaret /> : null}
          </p>
          <Face src="/landing/visitor.jpg" alt="" className="h-7 w-7" />
        </div>
      ) : null}
      {thinking ? <PreviewThinking /> : null}
      {aiText ? (
        <div
          className="flex items-end gap-2 motion-reduce:transition-none transition-opacity duration-300 ease-out"
          style={ghost ? undefined : { opacity: aiOpacity }}
        >
          <Face src="/landing/alex.jpg" alt="" className="h-7 w-7" />
          <p className="max-w-[82%] rounded-2xl rounded-bl-md bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg">
            {aiText}
            {aiTyping ? <TypingCaret /> : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PreviewThinking() {
  return (
    <div
      className="flex items-end gap-2"
      role="status"
      aria-label="Alex’s AI is thinking"
    >
      <Face src="/landing/alex.jpg" alt="" className="h-7 w-7" />
      <div className="inline-flex max-w-[82%] items-center gap-1.5 rounded-2xl rounded-bl-md bg-accent-soft px-3.5 py-2.5">
        <span className="inline-block h-[1.625em] w-0 text-[13.5px]" aria-hidden />
        <PreviewSpark />
        <ThinkingDots />
      </div>
    </div>
  );
}

function PreviewSpark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
    </svg>
  );
}

function ThinkingDots() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const pattern = [1, 2, 3, 2, 1];
    let step = 0;
    const id = window.setInterval(() => {
      step = (step + 1) % pattern.length;
      setCount(pattern[step]);
    }, 280);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={`h-1.5 w-1.5 rounded-full bg-accent shadow-[inset_0_1px_1px_rgba(4,28,22,0.5)] transition-opacity duration-200 motion-reduce:transition-none ${
            dot <= count ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </span>
  );
}

function TypingCaret() {
  return (
    <span
      className="inline-block h-[0.9em] w-px -mr-px translate-y-px bg-current align-[-0.06em] animate-landing-caret motion-reduce:animate-none"
      aria-hidden
    />
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
  const reduceMotion = useHydratedReducedMotion();
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
