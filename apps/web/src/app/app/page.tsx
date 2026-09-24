"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useReducedMotion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalIcon,
  FeedbackIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { revealContainer, revealItem } from "@/lib/motion";
import {
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
  type ConversationListItem,
} from "@/lib/api";
import {
  isUiPreview,
  loadDashboardData,
  PREVIEW_ANALYTICS,
  PREVIEW_PROFILE,
  PREVIEW_THREADS,
  type PreviewThread,
} from "@/lib/ui-preview";
import { VisitorConversationModal } from "@/components/visitor-conversation-modal";
import { AuthCurveMark } from "@/components/auth-edge-curves";

type RecentThread = {
  id: string;
  preview: string;
  when: string;
};

const CHECKLIST_LABELS: Record<string, string> = {
  profile_basics: "Name / headline",
  interview_completed: "Interview completed",
  personality: "Personality saved",
  knowledge_ready: "At least one knowledge source ready",
  has_memory: "At least one memory",
  username_set: "Username chosen",
  published: "Published",
};

const CHECKLIST_HREF: Record<string, string> = {
  profile_basics: "/app/profile",
  interview_completed: "/onboarding/interview",
  personality: "/app/profile",
  knowledge_ready: "/app/knowledge",
  has_memory: "/app/memories",
  username_set: "/app/settings",
  published: "/onboarding/publish",
};

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);
  const [profile, setProfile] = useState<AiProfile | null>(PREVIEW_PROFILE);
  const [stats, setStats] = useState<AnalyticsSummary | null>(PREVIEW_ANALYTICS);
  const [recentThreads, setRecentThreads] = useState<RecentThread[] | null>(
    null,
  );
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
      const result = await loadDashboardData(
        () => apiFetch<AiProfile>("/ai/me"),
        (id) => apiFetch<AnalyticsSummary>(`/ai/${id}/analytics/summary`),
        (id) => loadRecentPublicThreads(id),
      );
      if (cancelled) return;

      if (result.needsAuth && !isUiPreview()) {
        router.replace("/sign-in?next=/app");
        return;
      }
      if (result.needsOnboarding && !isUiPreview()) {
        router.replace("/onboarding/create");
        return;
      }

      setProfile(result.profile);
      setStats(result.stats);
      setError(null);

      if (!result.fromApi) {
        setRecentThreads(previewThreadsToRecent(PREVIEW_THREADS));
        return;
      }

      if (result.recent) {
        setRecentThreads(result.recent);
      } else {
        setRecentThreads(
          isUiPreview() ? previewThreadsToRecent(PREVIEW_THREADS) : [],
        );
      }
    })().catch((err) => {
      if (cancelled) return;
      setProfile(PREVIEW_PROFILE);
      setStats(PREVIEW_ANALYTICS);
      setRecentThreads(previewThreadsToRecent(PREVIEW_THREADS));
      setError(err instanceof Error ? err.message : null);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const publicPath = stats?.public_url_path ?? "";

  const nextStep = useMemo(() => {
    const c = stats?.completeness_checklist;
    if (!c) return null;
    if (!c.interview_completed)
      return {
        href: "/onboarding/interview",
        label: "Finish interview",
        key: "interview_completed",
      };
    if (!c.knowledge_ready)
      return {
        href: "/onboarding/knowledge",
        label: "Add knowledge",
        key: "knowledge_ready",
      };
    if (!c.published)
      return {
        href: "/onboarding/publish",
        label: "Publish your link",
        key: "published",
      };
    return null;
  }, [stats?.completeness_checklist]);

  const firstIncompleteKey = useMemo(() => {
    if (!stats?.completeness_checklist) return null;
    for (const key of Object.keys(CHECKLIST_LABELS)) {
      if (!stats.completeness_checklist[key]) return key;
    }
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

  const welcomeLine = allDone
    ? published
      ? "Your AI is live — share it or jump into a chat."
      : "You’re all set. Publish when you’re ready."
    : nextStep
      ? `Your AI is ${score}% ready — ${nextStep.label.toLowerCase()} to keep going.`
      : `Your AI is ${score}% ready. Keep building!`;

  const primaryCta = nextStep
    ? { href: nextStep.href, label: nextStep.label }
    : published
      ? { href: "/app/chat", label: "Talk to your AI" }
      : { href: "/onboarding/publish", label: "Publish your link" };

  const secondaryCta =
    primaryCta.href === "/app/chat"
      ? { href: "/onboarding/publish", label: "Share your link" }
      : { href: "/app/chat", label: "Talk to your AI" };

  async function copyLink() {
    if (!publicPath) return;
    const absolute = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copy failed — open Share to copy manually.");
    }
  }

  return (
    <motion.div
      className="flex w-full flex-col gap-4"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {/* Hero welcome */}
      <motion.section
        className="relative overflow-hidden rounded-[22px] border border-border bg-white px-5 py-5 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)] sm:px-7 sm:py-6"
        variants={item}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.2) 0%, rgba(227,242,238,0.55) 42%, rgba(255,255,255,0.85) 100%)",
          }}
        />
        <AuthCurveMark className="pointer-events-none absolute -right-4 top-1/2 h-32 w-9 -translate-y-1/2 -scale-x-100 text-fg/25 sm:h-36 sm:w-10" />
        <div className="relative max-w-2xl">
          <h1 className="font-display text-[1.85rem] leading-[1.15] tracking-[-0.02em] text-fg sm:text-[2.15rem]">
            {first ? (
              <>
                Good to see you, <span className="text-accent">{first}</span>!
              </>
            ) : (
              "Welcome back"
            )}
            <span className="ml-1.5 inline-block" aria-hidden>
              👋
            </span>
          </h1>
          <p className="mt-2 text-[15px] text-muted text-balance">{welcomeLine}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <ButtonLink
              href={primaryCta.href}
              className="!h-10 !rounded-xl px-4"
            >
              {primaryCta.href === "/app/chat" ? (
                <ChatIcon className="mr-1.5 h-4 w-4" />
              ) : null}
              {primaryCta.label}
              <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5 opacity-90" />
            </ButtonLink>
            <ButtonLink
              href={secondaryCta.href}
              variant="secondary"
              className="!h-10 !rounded-xl border border-border bg-white px-4 shadow-[0_8px_20px_-16px_rgba(18,40,32,0.45)]"
            >
              {secondaryCta.href === "/app/chat" ? (
                <ChatIcon className="mr-1.5 h-4 w-4" />
              ) : (
                <ShareIcon className="mr-1.5 h-4 w-4" />
              )}
              {secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </motion.section>

      {/* Recent chats + checklist */}
      <motion.div
        className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5"
        variants={item}
      >
        <RecentVisitorChats
          published={published}
          threads={recentThreads}
          publicPath={publicPath}
          username={stats?.username}
          onCopyLink={() => void copyLink()}
          copied={copied}
        />

        <section className="relative flex flex-col rounded-[22px] border border-border bg-white p-5 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)]">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <div>
                <h2 className="font-display text-lg leading-tight tracking-tight text-fg">Setup Checklist</h2>
                <p className="mt-1 text-sm text-muted">
                  {allDone
                    ? "Everything’s checked off 🎉"
                    : `${doneCount} of ${checklistEntries.length} done — keep the momentum`}
                </p>
              </div>
            </div>
            <CompletenessRing value={score} reduceMotion={reduceMotion} />
          </div>

          {stats?.completeness_checklist ? (
            <ul className="mt-4 space-y-0.5">
              {checklistEntries.map(([key, label]) => {
                const done = Boolean(stats.completeness_checklist?.[key]);
                const isNext = !done && key === firstIncompleteKey;
                const href = CHECKLIST_HREF[key];
                return (
                  <li key={key}>
                    {done || !href ? (
                      <div
                        className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm text-fg"
                      >
                        <ChecklistMark done={done} />
                        {label}
                      </div>
                    ) : (
                      <Link
                        href={href}
                        className={`flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm transition ${
                          isNext
                            ? "bg-accent-soft font-medium text-fg ring-1 ring-accent/20"
                            : "text-fg hover:bg-[var(--atmosphere-1)]"
                        }`}
                      >
                        <ChecklistMark done={false} highlight={isNext} />
                        <span className="min-w-0 flex-1">{label}</span>
                        {isNext ? (
                          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                        ) : null}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Loading checklist…</p>
          )}

          {nextStep ? (
            <div className="mt-3 shrink-0">
              <ButtonLink
                href={nextStep.href}
                className="w-full rounded-xl py-2.5 sm:w-auto"
              >
                Continue: {nextStep.label}
                <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5" />
              </ButtonLink>
            </div>
          ) : allDone ? (
            <p className="mt-3 shrink-0 font-display text-base italic text-accent">
              You’re all set — go show it off!
            </p>
          ) : null}
        </section>
      </motion.div>

      <motion.div
        className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2"
        variants={item}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] leading-5 text-muted">
          <span className="inline-flex items-center gap-2">
            <StatusDot live={published} />
            <span className="font-medium text-fg">
              {published ? "Published" : "Draft"}
            </span>
          </span>
          <BarRule />
          <span>
            <CountUp value={score} reduceMotion={reduceMotion} />% complete
          </span>
          {stats ? (
            <>
              <BarRule />
              <span>
                <CountUp value={stats.visits_7d} reduceMotion={reduceMotion} />{" "}
                visits (7d)
              </span>
              {typeof stats.owner_chats_remaining === "number" &&
              typeof stats.owner_chats_limit === "number" ? (
                <>
                  <BarRule />
                  <span>
                    {stats.owner_chats_remaining}/{stats.owner_chats_limit}{" "}
                    chats left today
                  </span>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        <nav
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] leading-5"
          aria-label="More actions"
        >
          <ButtonLink
            href="/onboarding/publish"
            variant="ghost"
            className="gap-1.5 px-0 py-1 text-muted hover:text-fg"
          >
            <ShareIcon className="h-3.5 w-3.5" />
            Share
          </ButtonLink>
          {publicPath ? (
            <>
              <BarRule />
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 px-0 py-1 text-muted hover:text-fg"
                onClick={() => void copyLink()}
              >
                <CopyIcon className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </>
          ) : null}
          {stats?.username ? (
            <>
              <BarRule />
              <ButtonLink
                href={`/u/${stats.username}`}
                variant="ghost"
                className="gap-1.5 px-0 py-1 text-muted hover:text-fg"
              >
                <ExternalIcon className="h-3.5 w-3.5" />
                Open public page
              </ButtonLink>
            </>
          ) : null}
          <BarRule />
          <ButtonLink
            href="/feedback"
            variant="ghost"
            className="gap-1.5 px-0 py-1 text-muted hover:text-fg"
          >
            <FeedbackIcon className="h-3.5 w-3.5" />
            Send feedback
          </ButtonLink>
        </nav>
      </motion.div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
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

function previewThreadsToRecent(threads: PreviewThread[]): RecentThread[] {
  return threads.map((t) => ({
    id: t.id,
    preview: t.preview,
    when: t.when,
  }));
}

async function loadRecentPublicThreads(
  profileId: string,
): Promise<RecentThread[]> {
  const list = await apiFetch<ConversationListItem[]>(
    `/ai/${profileId}/conversations?channel=public&limit=3`,
  );

  return list.map((row) => ({
    id: row.id,
    preview: truncate(
      row.preview?.trim() || "Visitor started a chat",
      72,
    ),
    when: formatRelativeTime(row.updated_at),
  }));
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function RecentVisitorChats({
  published,
  threads,
  publicPath,
  username,
  onCopyLink,
  copied,
}: {
  published: boolean;
  threads: RecentThread[] | null;
  publicPath: string;
  username?: string | null;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const loading = threads === null;
  const empty = !loading && threads.length === 0;
  const [openThread, setOpenThread] = useState<{
    id: string;
    preview?: string | null;
  } | null>(null);

  return (
    <section className="relative flex flex-col rounded-[22px] border border-border bg-white p-5 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)]">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg leading-tight tracking-tight text-fg">
            Recent visitor chats
          </h2>
          <p className="mt-1 text-sm text-muted">
            Public conversations on your AI page
          </p>
        </div>
        <Link
          href="/app/conversations"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-accent hover:text-accent-hover"
        >
          View all
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex flex-col">
        {loading ? (
          <p className="text-sm text-muted">Loading chats…</p>
        ) : !published ? (
          <div className="flex flex-1 flex-col justify-center gap-3 rounded-xl bg-[var(--atmosphere-1)] px-4 py-6 text-center">
            <p className="font-display text-base text-fg text-balance">
              Publish to start getting visitor chats ✨
            </p>
            <p className="text-sm text-muted text-balance">
              Once your link is live, conversations from your public page show
              up here.
            </p>
            <div className="mt-1">
              <ButtonLink
                href="/onboarding/publish"
                className="rounded-xl px-4 py-2.5"
              >
                Publish your link
                <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5" />
              </ButtonLink>
            </div>
          </div>
        ) : empty ? (
          <div className="flex flex-1 flex-col justify-center gap-3 rounded-xl bg-[var(--atmosphere-1)] px-4 py-6 text-center">
            <p className="font-display text-base text-fg text-balance">
              No visitors yet — share your link 🔗
            </p>
            <p className="text-sm text-muted text-balance">
              When someone chats with your AI, you’ll see it here.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <ButtonLink
                href="/onboarding/publish"
                className="rounded-xl px-4 py-2.5"
              >
                <ShareIcon className="mr-1.5 h-4 w-4" />
                Share
              </ButtonLink>
              {publicPath ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl border border-border bg-white px-4 py-2.5"
                  onClick={onCopyLink}
                >
                  <CopyIcon className="mr-1.5 h-4 w-4" />
                  {copied ? "Copied!" : "Copy link"}
                </Button>
              ) : null}
              {username ? (
                <ButtonLink
                  href={`/u/${username}`}
                  variant="ghost"
                  className="rounded-xl px-3 py-2.5 text-muted"
                >
                  <ExternalIcon className="mr-1.5 h-4 w-4" />
                  Open page
                </ButtonLink>
              ) : null}
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {threads.map((thread, index) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenThread({ id: thread.id, preview: thread.preview })
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-accent-soft ${
                    index === 0
                      ? "border-transparent bg-accent-soft"
                      : "border-border bg-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-accent ${
                      index === 0 ? "bg-white" : "bg-accent-soft"
                    }`}
                  >
                    <ChatIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm leading-5 text-fg">
                      {thread.preview}
                    </span>
                    <span className="block text-xs leading-4 text-muted">
                      {thread.when}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VisitorConversationModal
        thread={openThread}
        onClose={() => setOpenThread(null)}
      />
    </section>
  );
}

function BarRule() {
  return (
    <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
  );
}

function StatusDot({ live }: { live: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        live ? "bg-accent" : "bg-[var(--border)]"
      }`}
      aria-hidden
    />
  );
}

function ChecklistMark({
  done,
  highlight = false,
}: {
  done: boolean;
  highlight?: boolean;
}) {
  if (done) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <CheckIcon className="h-3 w-3" />
        <span className="sr-only">Completed: </span>
      </span>
    );
  }
  return (
    <span
      className={`h-5 w-5 shrink-0 rounded-full border ${
        highlight ? "border-accent bg-white" : "border-border"
      }`}
    >
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
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          className="stroke-border"
          strokeWidth="3"
        />
        <motion.circle
          cx="18"
          cy="18"
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
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums text-fg">
        {Math.round(value)}
      </span>
    </div>
  );
}

function CountUp({
  value,
  reduceMotion,
}: {
  value: number;
  reduceMotion: boolean | null;
}) {
  // Always start at `value` so SSR and the first client paint match
  // (useReducedMotion is null on the server, true/false on the client).
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    setShown(0);
    const controls = animate(0, value, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return <span className="tabular-nums">{shown}</span>;
}
