"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { animate, motion, useReducedMotion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  ConversationsIcon,
  CopyIcon,
  GlobeIcon,
  KnowledgeIcon,
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
  PREVIEW_ANALYTICS_INCOMPLETE,
  PREVIEW_PROFILE,
  PREVIEW_THREADS,
  type PreviewThread,
} from "@/lib/ui-preview";
import { VisitorConversationModal } from "@/components/visitor-conversation-modal";
import { UserAvatar } from "@/components/user-avatar";

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
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);
  const previewIncomplete =
    isUiPreview() && searchParams.get("incomplete") === "1";
  const [profile, setProfile] = useState<AiProfile | null>(PREVIEW_PROFILE);
  const [stats, setStats] = useState<AnalyticsSummary | null>(
    previewIncomplete ? PREVIEW_ANALYTICS_INCOMPLETE : PREVIEW_ANALYTICS,
  );
  const [recentThreads, setRecentThreads] = useState<RecentThread[] | null>(
    () =>
      isUiPreview()
        ? previewIncomplete
          ? []
          : previewThreadsToRecent(PREVIEW_THREADS)
        : null,
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

    function applyPreviewFallback() {
      setProfile(PREVIEW_PROFILE);
      setStats(
        previewIncomplete ? PREVIEW_ANALYTICS_INCOMPLETE : PREVIEW_ANALYTICS,
      );
      setRecentThreads(
        previewIncomplete ? [] : previewThreadsToRecent(PREVIEW_THREADS),
      );
      setError(null);
    }

    (async () => {
      const load = loadDashboardData(
        () => apiFetch<AiProfile>("/ai/me"),
        (id) => apiFetch<AnalyticsSummary>(`/ai/${id}/analytics/summary`),
        (id) => loadRecentPublicThreads(id),
      );

      // UI preview: don't hang forever when API is down / unreachable.
      const result = isUiPreview()
        ? await Promise.race([
            load,
            new Promise<Awaited<typeof load>>((resolve) => {
              window.setTimeout(
                () =>
                  resolve({
                    profile: PREVIEW_PROFILE,
                    stats: previewIncomplete
                      ? PREVIEW_ANALYTICS_INCOMPLETE
                      : PREVIEW_ANALYTICS,
                    fromApi: false,
                    recent: previewIncomplete
                      ? []
                      : previewThreadsToRecent(PREVIEW_THREADS),
                  }),
                2500,
              );
            }),
          ])
        : await load;

      if (cancelled) return;

      if (result.needsAuth && !isUiPreview()) {
        router.replace("/sign-in?next=/app");
        return;
      }
      if (result.needsOnboarding && !isUiPreview()) {
        router.replace("/onboarding/create");
        return;
      }

      if (previewIncomplete && !result.fromApi) {
        applyPreviewFallback();
        return;
      }

      setProfile(result.profile);
      setStats(result.stats);
      setError(null);

      if (!result.fromApi) {
        setRecentThreads(
          previewIncomplete ? [] : previewThreadsToRecent(PREVIEW_THREADS),
        );
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
      applyPreviewFallback();
      if (!isUiPreview()) {
        setError(err instanceof Error ? err.message : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, previewIncomplete]);

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
  const displayName = profile?.name?.trim() || "Your presence";
  const checklistEntries = Object.entries(CHECKLIST_LABELS);
  const doneCount = checklistEntries.filter(([key]) =>
    Boolean(stats?.completeness_checklist?.[key]),
  ).length;
  const allDone = Boolean(stats) && doneCount === checklistEntries.length;
  const score = stats?.completeness_score ?? profile?.completeness_score ?? 0;

  const headline = profile?.headline?.trim() ?? "";
  const welcomeLine = allDone
    ? published
      ? ""
      : "You’re all set. Publish when you’re ready."
    : nextStep
      ? `${score}% ready — ${nextStep.label.toLowerCase()} next.`
      : `${score}% ready. Keep building.`;
  const subtitle = headline || welcomeLine;
  const statusLine = [
    published ? "Live" : "Draft",
    publicPath || null,
    allDone ? null : `${score}% ready`,
  ]
    .filter(Boolean)
    .join(" · ");

  const primaryLink = nextStep
    ? { href: nextStep.href, label: nextStep.label }
    : !published
      ? { href: "/onboarding/publish", label: "Publish your link" }
      : publicPath
        ? null
        : { href: "/onboarding/publish", label: "Share your link" };

  const secondaryCta =
    published && stats?.username
      ? { href: `/u/${stats.username}`, label: "Open public page" }
      : { href: "/app/chat", label: "Talk to your AI" };

  async function copyLink() {
    if (!publicPath) return;
    const absolute = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Couldn’t copy. Open the public page and copy the address.");
    }
  }

  return (
    <motion.div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {!allDone && nextStep ? (
        <motion.section variants={item}>
          <NextUp
            doneCount={doneCount}
            total={checklistEntries.length}
            nextLabel={
              firstIncompleteKey
                ? CHECKLIST_LABELS[firstIncompleteKey]
                : nextStep.label
            }
            nextHref={
              firstIncompleteKey
                ? CHECKLIST_HREF[firstIncompleteKey] ?? nextStep.href
                : nextStep.href
            }
            checklist={
              stats?.completeness_checklist
                ? checklistEntries.map(([key, label]) => ({
                    key,
                    label,
                    done: Boolean(stats.completeness_checklist?.[key]),
                    href: CHECKLIST_HREF[key],
                    isNext: key === firstIncompleteKey,
                  }))
                : []
            }
          />
        </motion.section>
      ) : null}

      <motion.section
        className="overflow-hidden rounded-[var(--radius)] border border-border"
        style={{
          background:
            "linear-gradient(115deg, #ffffff 0%, #ffffff 42%, var(--tone-mint) 100%)",
        }}
        variants={item}
      >
        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              name={displayName}
              src={profile?.avatar_url}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">
                {displayName}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm leading-snug text-muted sm:text-base">
                  {subtitle}
                </p>
              ) : null}
              <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    published ? "bg-accent" : "bg-border"
                  }`}
                  aria-hidden
                />
                {statusLine}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:pl-6">
            {primaryLink ? (
              <ButtonLink href={primaryLink.href}>
                {primaryLink.label}
              </ButtonLink>
            ) : (
              <Button
                type="button"
                onClick={() => void copyLink()}
                disabled={!publicPath}
              >
                <CopyIcon className="mr-1.5 h-4 w-4" />
                {copied ? "Copied" : "Copy link"}
              </Button>
            )}
            <Link
              href={secondaryCta.href}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>

      </motion.section>

      <motion.section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        variants={item}
        aria-label="This week"
      >
        <MetricCard
          tone="solid"
          icon={<GlobeIcon className="h-4 w-4" />}
          label="Visits"
          value={stats?.visits_7d ?? 0}
          detail="Last 7 days"
          reduceMotion={reduceMotion}
        />
        <MetricCard
          tone="mint"
          icon={<ConversationsIcon className="h-4 w-4" />}
          label="Conversations"
          value={stats?.conversations_7d ?? 0}
          detail="Last 7 days"
          href="/app/conversations"
          reduceMotion={reduceMotion}
        />
        <MetricCard
          tone="sky"
          icon={<ChatIcon className="h-4 w-4" />}
          label="Messages"
          value={stats?.messages_7d ?? 0}
          detail="Last 7 days"
          reduceMotion={reduceMotion}
        />
        <MetricCard
          tone="deep"
          icon={<KnowledgeIcon className="h-4 w-4" />}
          label="Knowledge"
          value={stats?.documents_used ?? 0}
          detail={knowledgeDetail(
            stats?.documents_used ?? 0,
            stats?.documents_limit,
          )}
          href="/app/knowledge"
          reduceMotion={reduceMotion}
        />
      </motion.section>

      <motion.section
        className="rounded-[var(--radius)] border border-border bg-[var(--bg-elevated)] px-5 py-5 sm:px-7"
        variants={item}
      >
        <RecentVisitorChats published={published} threads={recentThreads} />
      </motion.section>

      <CopyToast show={copied} />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="sr-only" aria-live="polite">
        {copied ? "Public link copied." : ""}
      </p>
    </motion.div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  href,
  suffix,
  tone = "mint",
  reduceMotion,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  href?: string;
  suffix?: string;
  tone?: "solid" | "mint" | "deep" | "sky";
  reduceMotion: boolean | null;
}) {
  const solid = tone === "solid";
  const surface = {
    solid: "border-transparent bg-accent text-white",
    mint: "border-transparent bg-[var(--tone-mint)]",
    deep: "border-transparent bg-[var(--atmosphere-2)]",
    sky: "border-transparent bg-[var(--tone-sky)]",
  }[tone];
  const body = (
    <>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          solid ? "bg-white/15 text-white" : "bg-white text-accent"
        }`}
      >
        {icon}
      </span>
      <p className={`mt-4 text-sm ${solid ? "text-white/80" : "text-muted"}`}>
        {label}
      </p>
      <p
        className={`mt-1 font-display text-3xl tabular-nums tracking-tight ${
          solid ? "text-white" : "text-accent"
        }`}
      >
        <CountUp
          value={value}
          reduceMotion={reduceMotion}
          suffix={suffix}
        />
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${
          solid ? "text-white/75" : "text-muted"
        }`}
      >
        {detail}
      </p>
    </>
  );
  const className = `flex h-full flex-col rounded-[var(--radius)] border p-4 text-left sm:p-5 ${surface}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} transition hover:brightness-[0.98]`}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

function knowledgeDetail(used: number, limit: number | undefined) {
  if (typeof limit !== "number") return "Sources on your AI";
  if (used >= limit) return `All ${limit} source slots used`;
  const left = limit - used;
  return left === 1 ? "1 slot left" : `${left} slots left`;
}

function NextUp({
  doneCount,
  total,
  nextLabel,
  nextHref,
  checklist,
}: {
  doneCount: number;
  total: number;
  nextLabel: string;
  nextHref: string;
  checklist: Array<{
    key: string;
    label: string;
    done: boolean;
    href?: string;
    isNext: boolean;
  }>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[var(--bg-elevated)] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Next up
          </p>
          <p className="mt-1.5 text-base text-fg">
            <span className="tabular-nums text-muted">
              {doneCount}/{total}
            </span>
            <span className="mx-2 text-border" aria-hidden>
              ·
            </span>
            <span className="font-medium">{nextLabel}</span>
          </p>
        </div>
        <ButtonLink href={nextHref}>
          Continue
          <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5" />
        </ButtonLink>
      </div>
      {checklist.length > 0 ? (
        <details className="group relative mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer list-none text-xs text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1">
              Full checklist
              <ChevronRightIcon className="h-3 w-3 transition group-open:rotate-90" />
            </span>
          </summary>
          <ul className="mt-2 space-y-0.5">
            {checklist.map((row) => (
              <li key={row.key}>
                {row.done || !row.href ? (
                  <div
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                      row.done ? "text-muted" : "text-fg"
                    }`}
                  >
                    <ChecklistMark done={row.done} />
                    {row.label}
                  </div>
                ) : (
                  <Link
                    href={row.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition ${
                      row.isNext
                        ? "bg-accent-soft font-medium text-fg"
                        : "text-fg hover:bg-[var(--atmosphere-1)]"
                    }`}
                  >
                    <ChecklistMark done={false} highlight={row.isNext} />
                    <span className="min-w-0 flex-1">{row.label}</span>
                    {row.isNext ? (
                      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    ) : null}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
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
}: {
  published: boolean;
  threads: RecentThread[] | null;
}) {
  const loading = threads === null;
  const empty = !loading && threads.length === 0;
  const [openThread, setOpenThread] = useState<{
    id: string;
    preview?: string | null;
  } | null>(null);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg tracking-tight text-fg">
          Recent visitor chats
        </h2>
        <Link
          href="/app/conversations"
          className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading chats…</p>
      ) : !published ? (
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          Publish your link and visitor questions will show up here.
        </p>
      ) : empty ? (
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          No chats yet. When someone messages your public page, it shows up
          here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenThread({ id: thread.id, preview: thread.preview })
                }
                className="-mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between gap-4 rounded-md px-2 py-3.5 text-left hover:bg-[var(--atmosphere-1)]"
              >
                <span className="min-w-0 text-sm leading-snug text-fg sm:text-base">
                  {thread.preview}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {thread.when}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <VisitorConversationModal
        thread={openThread}
        onClose={() => setOpenThread(null)}
      />
    </section>
  );
}

function CopyToast({ show }: { show: boolean }) {
  return (
    <motion.div
      className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
      initial={false}
      animate={
        show
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 8, scale: 0.96 }
      }
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      aria-hidden={!show}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--bg-elevated)] px-3.5 py-2 text-sm text-fg shadow-[0_16px_40px_-18px_rgba(15,31,28,0.45)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <CheckIcon className="h-3 w-3" />
        </span>
        Link copied
      </div>
    </motion.div>
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
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <CheckIcon className="h-2.5 w-2.5" />
        <span className="sr-only">Completed: </span>
      </span>
    );
  }
  return (
    <span
      className={`h-4 w-4 shrink-0 rounded-full border ${
        highlight ? "border-accent bg-white" : "border-border"
      }`}
    >
      <span className="sr-only">Not done: </span>
    </span>
  );
}

function CountUp({
  value,
  reduceMotion,
  suffix = "",
}: {
  value: number;
  reduceMotion: boolean | null;
  suffix?: string;
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

  return <span className="tabular-nums">{`${shown}${suffix}`}</span>;
}
