"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useReducedMotion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  BoltIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalIcon,
  FeedbackIcon,
  PresenceIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { PresenceMark } from "@/components/presence-mark";
import { revealContainer, revealItem } from "@/lib/motion";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
} from "@/lib/api";

const CHECKLIST_LABELS: Record<string, string> = {
  profile_basics: "Name / headline",
  interview_completed: "Interview completed",
  personality: "Personality saved",
  knowledge_ready: "At least one knowledge source ready",
  has_memory: "At least one memory",
  username_set: "Username chosen",
  published: "Published",
};

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        const summary = await apiFetch<AnalyticsSummary>(
          `/ai/${me.id}/analytics/summary`,
        );
        if (!cancelled) setStats(summary);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/create");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fullLink = useMemo(() => {
    if (!stats?.public_url_path || typeof window === "undefined") return "";
    return `${window.location.origin}${stats.public_url_path}`;
  }, [stats?.public_url_path]);

  const nextStep = useMemo(() => {
    const c = stats?.completeness_checklist;
    if (!c) return null;
    if (!c.interview_completed)
      return { href: "/onboarding/interview", label: "Finish interview" };
    if (!c.knowledge_ready)
      return { href: "/onboarding/knowledge", label: "Add knowledge" };
    if (!c.published)
      return { href: "/onboarding/publish", label: "Publish your link" };
    return null;
  }, [stats?.completeness_checklist]);

  const published = (stats?.visibility ?? profile?.visibility) === "published";
  const first = firstName(profile?.name);
  const checklistEntries = Object.entries(CHECKLIST_LABELS);
  const doneCount = checklistEntries.filter(([key]) =>
    Boolean(stats?.completeness_checklist?.[key]),
  ).length;
  const allDone = Boolean(stats) && doneCount === checklistEntries.length;
  const score = stats?.completeness_score ?? profile?.completeness_score ?? 0;

  async function copyLink() {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copy failed — open Share to copy manually.");
    }
  }

  return (
    <motion.div
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.header className="shrink-0" variants={item}>
        <h1 className="font-display text-2xl tracking-tight text-fg md:text-[1.75rem]">
          {first ? `Good to see you, ${first}! 👋` : "Dashboard"}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted text-balance">
          Here’s your AI assistant overview. Keep building, keep exploring.
        </p>
      </motion.header>

      <motion.dl
        className="mt-3 grid shrink-0 gap-3 sm:grid-cols-3"
        variants={item}
      >
        <StatCard
          label="Status"
          tone="mint"
          icon={
            <PresenceIcon
              className={published ? "text-accent" : "text-muted"}
            />
          }
          live={published}
        >
          <dd className="mt-2 font-display text-2xl tracking-tight text-fg">
            {stats
              ? published
                ? "Published"
                : "Draft"
              : profile
                ? "Draft"
                : "…"}
          </dd>
          <p className="mt-0.5 text-xs text-muted">
            {published ? "Your AI is live and ready." : "Not public yet."}
          </p>
        </StatCard>

        <StatCard
          label="Completeness"
          tone="sky"
          icon={<CompletenessRing value={score} reduceMotion={reduceMotion} />}
        >
          <dd className="mt-2 font-display text-2xl tracking-tight text-fg">
            {stats || profile ? (
              <>
                <CountUp value={score} reduceMotion={reduceMotion} />%
              </>
            ) : (
              "…"
            )}
          </dd>
          <p className="mt-0.5 text-xs text-muted">
            {allDone
              ? "All set. Great job."
              : nextStep
                ? nextStep.label
                : "Keep building."}
          </p>
        </StatCard>

        <StatCard
          label="Visits (7d)"
          tone="purple"
          icon={<VisitBars className="text-[#7c3aed]" />}
        >
          <dd className="mt-2 font-display text-2xl tracking-tight text-fg">
            {stats ? (
              <CountUp value={stats.visits_7d} reduceMotion={reduceMotion} />
            ) : (
              "…"
            )}
          </dd>
          <p className="mt-0.5 text-xs text-muted">
            People checking your public page.
          </p>
        </StatCard>
      </motion.dl>

      {stats ? (
        <motion.div
          className="mt-2.5 grid shrink-0 gap-3 sm:grid-cols-2"
          variants={item}
        >
          <MetricChip
            icon={<CalendarIcon className="h-4 w-4 text-accent" />}
          >
            Today: {stats.visits_today} visits · {stats.conversations_7d} public
            conversations (7d) · {stats.messages_7d} public messages (7d)
          </MetricChip>
          <MetricChip
            icon={<BoltIcon className="h-4 w-4 text-[#d97706]" />}
          >
            Free plan today: {stats.owner_chats_remaining}/
            {stats.owner_chats_limit} chats left · {stats.documents_remaining}/
            {stats.documents_limit} knowledge slots left
          </MetricChip>
        </motion.div>
      ) : null}

      {nextStep ? (
        <motion.p className="mt-2 shrink-0 text-sm text-fg" variants={item}>
          Next:{" "}
          <ButtonLink
            href={nextStep.href}
            variant="secondary"
            className="rounded-xl py-1.5"
          >
            {nextStep.label}
          </ButtonLink>
        </motion.p>
      ) : null}

      <motion.div
        className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-5"
        variants={item}
      >
        {stats?.completeness_checklist ? (
          <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-white p-4 shadow-[0_10px_30px_-18px_rgba(18,24,31,0.35)] lg:col-span-3">
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <div>
                  <h2 className="font-display text-lg text-fg">
                    Setup checklist
                  </h2>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  allDone
                    ? "bg-accent-soft text-accent"
                    : "bg-[var(--atmosphere-1)] text-muted"
                }`}
              >
                {doneCount} / {checklistEntries.length} completed
              </span>
            </div>
            <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {checklistEntries.map(([key, label]) => {
                const done = Boolean(stats.completeness_checklist?.[key]);
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-2.5 text-sm ${
                      done ? "text-fg" : "text-muted"
                    }`}
                  >
                    <ChecklistMark done={done} />
                    {label}
                  </li>
                );
              })}
            </ul>
            {allDone ? (
              <p className="mt-2 shrink-0 font-display text-base italic text-accent">
                You’re all set.
              </p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_30px_-18px_rgba(18,24,31,0.35)] lg:col-span-3">
            <h2 className="font-display text-lg text-fg">Setup checklist</h2>
            <p className="mt-2 text-sm text-muted">Loading…</p>
          </section>
        )}

        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-[0_10px_30px_-18px_rgba(18,24,31,0.35)] lg:col-span-2">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 70% 20%, var(--atmosphere-2), transparent 55%), radial-gradient(ellipse 70% 50% at 20% 90%, var(--atmosphere-1), transparent 50%)",
            }}
          />
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
            <PresenceMark live={published} allDone={allDone} />
          </div>
        </section>
      </motion.div>

      <motion.section className="mt-3 shrink-0" variants={item}>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app/chat" className="gap-2 rounded-xl px-4 py-2">
            <ChatIcon />
            Talk to your AI
            <ChevronRightIcon className="h-3.5 w-3.5 opacity-80" />
          </ButtonLink>
          <ButtonLink
            href="/onboarding/publish"
            variant="secondary"
            className="gap-2 rounded-xl bg-white py-2"
          >
            <ShareIcon />
            Share
          </ButtonLink>
          {fullLink ? (
            <Button
              type="button"
              variant="secondary"
              className="gap-2 rounded-xl bg-white py-2"
              onClick={() => void copyLink()}
            >
              <CopyIcon />
              {copied ? "Copied" : "Copy public link"}
            </Button>
          ) : null}
          {stats?.username ? (
            <ButtonLink
              href={`/u/${stats.username}`}
              variant="secondary"
              className="gap-2 rounded-xl bg-white py-2"
            >
              <ExternalIcon />
              Open public page
            </ButtonLink>
          ) : null}
          <ButtonLink
            href="/feedback"
            variant="ghost"
            className="gap-2 rounded-xl py-2"
          >
            <FeedbackIcon />
            Send feedback
          </ButtonLink>
        </div>
      </motion.section>

      {error ? (
        <p className="mt-2 shrink-0 text-sm text-red-700">{error}</p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {copied ? "Public link copied." : ""}
      </p>
    </motion.div>
  );
}

function firstName(name: string | undefined) {
  if (!name) return null;
  const part = name.trim().split(/\s+/).filter(Boolean)[0];
  return part || null;
}

function MetricChip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-xs text-muted shadow-[0_6px_18px_-14px_rgba(18,24,31,0.35)] sm:text-sm">
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 leading-snug">{children}</span>
    </p>
  );
}

function StatCard({
  label,
  icon,
  tone = "default",
  live = false,
  children,
}: {
  label: string;
  icon: ReactNode;
  tone?: "default" | "mint" | "sky" | "mist" | "purple";
  live?: boolean;
  children: ReactNode;
}) {
  const tones = {
    default: "bg-white",
    mint: "bg-[#e7f4ef]",
    sky: "bg-[#e8f1f6]",
    mist: "bg-[var(--atmosphere-1)]",
    purple: "bg-[#efeaf8]",
  } as const;

  return (
    <div
      className={`rounded-2xl border border-border/80 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(18,24,31,0.35)] ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <dt className="flex items-center gap-2 text-xs text-muted sm:text-sm">
          {label}
          {live ? (
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          ) : null}
        </dt>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 shadow-sm ${
            tone === "purple" ? "text-[#7c3aed]" : "text-accent"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

function ChecklistMark({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <CheckIcon className="h-2.5 w-2.5" />
        <span className="sr-only">Completed: </span>
      </span>
    );
  }
  return (
    <span className="h-4 w-4 shrink-0 rounded-full border border-border">
      <span className="sr-only">Not done: </span>
    </span>
  );
}

function CompletenessRing({
  value,
  reduceMotion,
}: {
  value: number;
  reduceMotion: boolean | null;
}) {
  const r = 12;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90" aria-hidden>
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        className="stroke-border"
        strokeWidth="3"
      />
      <motion.circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduceMotion ? offset : c }}
        animate={{ strokeDashoffset: offset }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
        }
      />
    </svg>
  );
}

function VisitBars({ className = "text-accent" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} aria-hidden>
      <rect
        x="1"
        y="9"
        width="3"
        height="6"
        rx="0.5"
        fill="currentColor"
        opacity="0.4"
      />
      <rect
        x="6.5"
        y="5"
        width="3"
        height="10"
        rx="0.5"
        fill="currentColor"
        opacity="0.7"
      />
      <rect x="12" y="2" width="3" height="13" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function CountUp({
  value,
  reduceMotion,
}: {
  value: number;
  reduceMotion: boolean | null;
}) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return <span className="tabular-nums">{shown}</span>;
}
