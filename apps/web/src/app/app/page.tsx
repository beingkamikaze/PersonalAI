"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { revealContainer, revealItem } from "@/lib/motion";
import {
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
  type ConversationListItem,
  type KnowledgeDocument,
  type MemoryItem,
} from "@/lib/api";
import {
  isUiPreview,
  loadDashboardData,
  PREVIEW_ANALYTICS,
  PREVIEW_DOCS,
  PREVIEW_MEMORY_ITEMS,
  PREVIEW_PROFILE,
  PREVIEW_THREADS,
  type PreviewThread,
} from "@/lib/ui-preview";
import { VisitorConversationModal } from "@/components/visitor-conversation-modal";
import {
  clearRecentPublicChats,
  publishRecentPublicChats,
  readRecentPublicChats,
  recentPublicThreadsUnchanged,
  type RecentPublicThread,
} from "@/lib/recent-public-chats";
import { AiStatusCard } from "@/components/dashboard/ai-status-card";
import { RecentVisitorChats } from "@/components/dashboard/recent-visitor-chats";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AiSnapshot } from "@/components/dashboard/ai-snapshot";
import { KeepUpToDate } from "@/components/dashboard/keep-up-to-date";
import { truncate } from "@/components/dashboard/format";

/** Public threads fetched per load: the first few are "recent", flagged ones feed "needs attention". */
const PUBLIC_THREADS_LIMIT = 10;
const RECENT_VISIBLE = 3;

const CHECKLIST_KEYS = [
  "profile_basics",
  "interview_completed",
  "personality",
  "knowledge_ready",
  "has_memory",
  "username_set",
  "published",
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  // null = still loading. Mock data is only used when the API is unreachable
  // (or NEXT_PUBLIC_UI_PREVIEW=true), and that case is labelled on screen.
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [recentThreads, setRecentThreads] = useState<RecentPublicThread[] | null>(
    () => readRecentPublicChats()?.threads ?? null,
  );
  // null = loading, undefined = request failed
  const [documents, setDocuments] = useState<
    KnowledgeDocument[] | null | undefined
  >(null);
  const [memories, setMemories] = useState<MemoryItem[] | null | undefined>(
    null,
  );
  const [apiProfileId, setApiProfileId] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openThread, setOpenThread] = useState<{
    id: string;
    preview?: string | null;
  } | null>(null);
  const [publicHost, setPublicHost] = useState("");

  useLayoutEffect(() => {
    setPublicHost(window.location.host);
    const cached = readRecentPublicChats();
    if (!cached) return;
    console.info(
      "[dashboard] recent visitor chats restored count=%s",
      cached.threads.length,
    );
    setRecentThreads((current) =>
      current && recentPublicThreadsUnchanged(current, cached.threads)
        ? current
        : cached.threads,
    );
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;

    // Keep the module cache even if this visit unmounts mid-request.
    // Only touch React state while this effect is still current.
    const rememberRecent = (
      profileId: string,
      threads: RecentPublicThread[],
    ) => {
      const published = publishRecentPublicChats(profileId, threads);
      console.info(
        published.changed
          ? "[dashboard] recent visitor chats updated count=%s"
          : "[dashboard] recent visitor chats unchanged count=%s",
        threads.length,
      );
      if (cancelled) return;
      setRecentThreads((current) =>
        current && recentPublicThreadsUnchanged(current, published.threads)
          ? current
          : published.threads,
      );
    };

    (async () => {
      const result = await loadDashboardData(
        () => apiFetch<AiProfile>("/ai/me"),
        (id) => apiFetch<AnalyticsSummary>(`/ai/${id}/analytics/summary`),
        (id) => loadRecentPublicThreads(id),
        (profileId, recent) => {
          // null means the chat request failed. Keep whatever is already shown.
          if (recent == null) return;
          rememberRecent(profileId, recent);
        },
      );
      if (cancelled) return;

      if (result.needsAuth && !isUiPreview()) {
        clearRecentPublicChats();
        router.replace("/sign-in?next=/app");
        return;
      }
      if (result.needsOnboarding && !isUiPreview()) {
        clearRecentPublicChats();
        router.replace("/onboarding/create");
        return;
      }

      setProfile(result.profile);
      setStats(result.stats);
      setError(null);

      if (!result.fromApi) {
        // Preview fallback is not a real thread list — do not cache it.
        setUsingSampleData(true);
        setRecentThreads(previewThreadsToRecent(PREVIEW_THREADS));
        setDocuments(PREVIEW_DOCS);
        setMemories(PREVIEW_MEMORY_ITEMS);
        return;
      }

      setUsingSampleData(false);
      setApiProfileId(result.profile.id);

      // A successful list (including []) was published in onRecent.
      if (result.recent != null) return;

      if (readRecentPublicChats()?.profileId === result.profile.id) {
        console.info(
          "[dashboard] recent visitor chats refresh failed; keeping cache",
        );
        return;
      }
      setRecentThreads([]);
    })().catch((err) => {
      if (cancelled) return;
      setProfile(PREVIEW_PROFILE);
      setStats(PREVIEW_ANALYTICS);
      setRecentThreads(previewThreadsToRecent(PREVIEW_THREADS));
      setDocuments(PREVIEW_DOCS);
      setMemories(PREVIEW_MEMORY_ITEMS);
      setUsingSampleData(true);
      setError(err instanceof Error ? err.message : null);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Knowledge + memory lists feed "AI snapshot" and "Keep your AI up to date".
  // Independent of analytics, so they run as soon as we know the profile id.
  useEffect(() => {
    if (!apiProfileId) return;
    let cancelled = false;
    apiFetch<KnowledgeDocument[]>(`/ai/${apiProfileId}/documents`).then(
      (docs) => {
        if (!cancelled) setDocuments(docs);
      },
      (err: unknown) => {
        console.warn("[dashboard] documents request failed", err);
        if (!cancelled) setDocuments(undefined);
      },
    );
    apiFetch<MemoryItem[]>(`/ai/${apiProfileId}/memories`).then(
      (rows) => {
        if (!cancelled) setMemories(rows);
      },
      (err: unknown) => {
        console.warn("[dashboard] memories request failed", err);
        if (!cancelled) setMemories(undefined);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [apiProfileId]);

  const publicPath = stats?.public_url_path ?? "";
  const published = (stats?.visibility ?? profile?.visibility) === "published";
  const loading = profile === null || stats === null;

  const nextStep = useMemo(() => {
    const c = stats?.completeness_checklist;
    if (!c) return null;
    if (!c.interview_completed)
      return { href: "/onboarding/interview", label: "Finish interview" };
    if (!c.knowledge_ready)
      return { href: "/onboarding/knowledge", label: "Add knowledge" };
    if (!c.username_set)
      return { href: "/app/profile", label: "Choose your link name" };
    if (!c.published)
      return { href: "/onboarding/publish", label: "Publish your AI" };
    return null;
  }, [stats?.completeness_checklist]);

  const completeness = useMemo(() => {
    const c = stats?.completeness_checklist;
    if (!c) return null;
    const done = CHECKLIST_KEYS.filter((k) => Boolean(c[k])).length;
    return {
      done,
      total: CHECKLIST_KEYS.length,
      score: stats?.completeness_score ?? profile?.completeness_score ?? 0,
    };
  }, [stats?.completeness_checklist, stats?.completeness_score, profile?.completeness_score]);

  const recentVisible = useMemo(
    () => (recentThreads ? recentThreads.slice(0, RECENT_VISIBLE) : null),
    [recentThreads],
  );

  const knowledgeSources =
    documents === null
      ? null
      : documents === undefined
        ? undefined
        : documents.filter((d) => d.status === "ready").length;

  async function copyLink() {
    if (!publicPath) return;
    const absolute = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Copy failed — open your public page and copy the address bar.");
    }
  }

  function showThread(thread: RecentPublicThread) {
    setOpenThread({ id: thread.id, preview: thread.preview });
  }

  return (
    <motion.div
      className="flex w-full flex-col gap-4 lg:gap-5"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.div variants={item}>
        <AiStatusCard
          loading={loading}
          name={profile?.name}
          headline={profile?.headline}
          published={published}
          username={stats?.username ?? profile?.username}
          publicPath={publicPath}
          publicHost={publicHost}
          completeness={completeness}
          nextStep={nextStep}
          copied={copied}
          onCopyLink={() => void copyLink()}
        />
      </motion.div>

      <motion.div
        className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5"
        variants={item}
      >
        <RecentVisitorChats
          published={published}
          threads={recentVisible}
          username={stats?.username ?? profile?.username}
          publicPath={publicPath}
          copied={copied}
          onCopyLink={() => void copyLink()}
          onOpenThread={showThread}
        />
        <NeedsAttention threads={recentThreads} onOpenThread={showThread} />
      </motion.div>

      <motion.div
        className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5"
        variants={item}
      >
        <AiSnapshot stats={stats} knowledgeSources={knowledgeSources} />
        <KeepUpToDate documents={documents} memories={memories} />
      </motion.div>

      {usingSampleData && !isUiPreview() ? (
        <p className="text-xs text-muted">
          Couldn&apos;t reach the PersonaAI API — showing sample data until it
          is back.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="sr-only" aria-live="polite">
        {copied ? "Public link copied." : ""}
      </p>

      <VisitorConversationModal
        thread={openThread}
        onClose={() => setOpenThread(null)}
      />
    </motion.div>
  );
}

function previewThreadsToRecent(threads: PreviewThread[]): RecentPublicThread[] {
  return threads.map((t) => ({
    id: t.id,
    preview: t.preview,
    updatedAt: null,
    whenLabel: t.when,
    needsReview: Boolean(t.needsReview),
    unansweredPreview: t.unansweredPreview ?? null,
  }));
}

async function loadRecentPublicThreads(
  profileId: string,
): Promise<RecentPublicThread[]> {
  const list = await apiFetch<ConversationListItem[]>(
    `/ai/${profileId}/conversations?channel=public&limit=${PUBLIC_THREADS_LIMIT}`,
  );
  console.info(
    "[dashboard] recent visitor chats fetched count=%s",
    list.length,
  );

  return list.map((row) => ({
    id: row.id,
    preview: truncate(row.preview?.trim() || "Visitor started a chat", 96),
    updatedAt: row.updated_at,
    needsReview: Boolean(row.needs_review),
    unansweredPreview: row.unanswered_preview?.trim()
      ? truncate(row.unanswered_preview.trim(), 96)
      : null,
  }));
}
