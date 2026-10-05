"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  revealContainer,
  revealItem,
  useHydratedReducedMotion,
} from "@/lib/motion";
import {
  ApiError,
  type AiProfile,
  type AnalyticsSummary,
  type KnowledgeDocument,
  type MemoryItem,
} from "@/lib/api";
import {
  isUiPreview,
  PREVIEW_ANALYTICS,
  PREVIEW_DOCS,
  PREVIEW_MEMORY_ITEMS,
  PREVIEW_PROFILE,
  PREVIEW_THREADS,
  type PreviewThread,
} from "@/lib/ui-preview";
import { VisitorConversationModal } from "@/components/visitor-conversation-modal";
import {
  clearOwnerCache,
  loadAnalytics,
  loadDocuments,
  loadMemories,
  loadProfile,
  loadRecentVisitorChats,
  readAnalyticsCache,
  readDocumentsCache,
  readMemoriesCache,
  readProfileCache,
} from "@/lib/owner-cache";
import {
  readRecentPublicChats,
  type RecentPublicThread,
} from "@/lib/recent-public-chats";
import { AiStatusCard } from "@/components/dashboard/ai-status-card";
import { RecentVisitorChats } from "@/components/dashboard/recent-visitor-chats";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AiSnapshot } from "@/components/dashboard/ai-snapshot";
import { KeepUpToDate } from "@/components/dashboard/keep-up-to-date";

/** The first few public threads are "recent"; flagged ones feed "needs attention". */
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
  const reduceMotion = useHydratedReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  // null = still loading. Cached rows paint immediately. Mock data is only
  // used when the API is unreachable, and that case is labelled on screen.
  const [profile, setProfile] = useState<AiProfile | null>(() =>
    readProfileCache(),
  );
  const [stats, setStats] = useState<AnalyticsSummary | null>(() => {
    const cached = readProfileCache();
    return cached ? readAnalyticsCache(cached.id) : null;
  });
  const [recentThreads, setRecentThreads] = useState<
    RecentPublicThread[] | null
  >(() => threadsForProfile(readProfileCache()?.id));
  // null = loading, undefined = request failed with nothing to show
  const [documents, setDocuments] = useState<
    KnowledgeDocument[] | null | undefined
  >(() => {
    const cached = readProfileCache();
    return cached ? readDocumentsCache(cached.id) : null;
  });
  const [memories, setMemories] = useState<MemoryItem[] | null | undefined>(
    () => {
      const cached = readProfileCache();
      return cached ? readMemoriesCache(cached.id) : null;
    },
  );
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [chatsFailed, setChatsFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openThread, setOpenThread] = useState<{
    id: string;
    preview?: string | null;
  } | null>(null);
  const [publicHost, setPublicHost] = useState("");

  useEffect(() => {
    setPublicHost(window.location.host);
    const cached = readRecentPublicChats();
    const profileId = readProfileCache()?.id;
    if (!cached || cached.profileId !== profileId) return;
    console.info(
      "[dashboard] recent visitor chats restored count=%s",
      cached.threads.length,
    );
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    let cancelled = false;
    let activeProfileId: string | null = null;

    // Each section settles on its own. A slow or failed call does not block
    // the others, and a failed refresh keeps whatever is already on screen.
    function loadSections(profileId: string) {
      activeProfileId = profileId;
      const still = () => !cancelled && activeProfileId === profileId;

      const cachedStats = readAnalyticsCache(profileId);
      if (cachedStats) setStats(cachedStats);
      const cachedDocs = readDocumentsCache(profileId);
      setDocuments(cachedDocs);
      const cachedMemories = readMemoriesCache(profileId);
      setMemories(cachedMemories);
      setRecentThreads(threadsForProfile(profileId));

      void loadAnalytics(profileId).then(
        (summary) => {
          if (!still()) return;
          setStats(summary);
          setStatsFailed(false);
        },
        (err: unknown) => {
          console.warn("[dashboard] analytics request failed", err);
          if (!still()) return;
          if (!readAnalyticsCache(profileId)) setStatsFailed(true);
        },
      );
      void loadDocuments(profileId).then(
        (docs) => {
          if (still()) setDocuments(docs);
        },
        (err: unknown) => {
          console.warn("[dashboard] documents request failed", err);
          if (still() && !readDocumentsCache(profileId)) setDocuments(undefined);
        },
      );
      void loadMemories(profileId).then(
        (rows) => {
          if (still()) setMemories(rows);
        },
        (err: unknown) => {
          console.warn("[dashboard] memories request failed", err);
          if (still() && !readMemoriesCache(profileId)) setMemories(undefined);
        },
      );
      void loadRecentVisitorChats(profileId).then(
        (threads) => {
          if (!still()) return;
          setChatsFailed(false);
          setRecentThreads(threads);
        },
        (err: unknown) => {
          console.warn(
            "[dashboard] recent visitor chats refresh failed; keeping cache",
            err,
          );
          if (!still()) return;
          if (threadsForProfile(profileId) == null) setChatsFailed(true);
        },
      );
    }

    function showSample(err: unknown) {
      if (readProfileCache()) return;
      setProfile(PREVIEW_PROFILE);
      setStats(PREVIEW_ANALYTICS);
      setRecentThreads(previewThreadsToRecent(PREVIEW_THREADS));
      setDocuments(PREVIEW_DOCS);
      setMemories(PREVIEW_MEMORY_ITEMS);
      setUsingSampleData(true);
      setStatsFailed(false);
      setChatsFailed(false);
      setError(err instanceof Error ? err.message : null);
    }

    const startedAt = performance.now();
    const cachedProfile = readProfileCache();
    if (cachedProfile) {
      setProfile(cachedProfile);
      setUsingSampleData(false);
      loadSections(cachedProfile.id);
      console.info(
        "[dashboard] hero ready ms=%.0f source=cache",
        performance.now() - startedAt,
      );
    }

    loadProfile().then(
      (me) => {
        if (cancelled) return;
        if (me.user_id && cachedProfile && cachedProfile.user_id !== me.user_id) {
          setStats(null);
          setRecentThreads(null);
          setDocuments(null);
          setMemories(null);
        }
        setProfile(me);
        setUsingSampleData(false);
        setError(null);
        if (!cachedProfile || cachedProfile.id !== me.id) {
          console.info(
            "[dashboard] hero ready ms=%.0f source=network",
            performance.now() - startedAt,
          );
          loadSections(me.id);
        }
      },
      (err: unknown) => {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401 && !isUiPreview()) {
          clearOwnerCache();
          router.replace("/sign-in?next=/app");
          return;
        }
        if (status === 404 && !isUiPreview()) {
          clearOwnerCache();
          router.replace("/onboarding/create");
          return;
        }
        if (isUiPreview() || status !== 401) {
          showSample(err);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [router]);

  const publicPath =
    stats?.public_url_path ??
    (profile?.username ? `/u/${profile.username}` : "");
  const published = (stats?.visibility ?? profile?.visibility) === "published";
  const profileLoading = profile === null;
  const actionsPending =
    profile !== null && !published && stats === null && !statsFailed && !usingSampleData;

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
      <AiStatusCard
        loading={profileLoading}
        actionsPending={actionsPending}
        setupUnknown={statsFailed && !published}
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

      <motion.div
        className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5"
        variants={item}
      >
        <RecentVisitorChats
          published={published}
          threads={recentVisible}
          unavailable={chatsFailed && recentThreads === null}
          username={stats?.username ?? profile?.username}
          publicPath={publicPath}
          copied={copied}
          onCopyLink={() => void copyLink()}
          onOpenThread={showThread}
        />
        <NeedsAttention
          threads={recentThreads}
          unavailable={chatsFailed && recentThreads === null}
          onOpenThread={showThread}
        />
      </motion.div>

      <motion.div
        className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5"
        variants={item}
      >
        <AiSnapshot
          stats={stats}
          activityUnavailable={statsFailed && stats === null}
          knowledgeSources={knowledgeSources}
        />
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

function threadsForProfile(
  profileId: string | undefined,
): RecentPublicThread[] | null {
  if (!profileId) return null;
  const cached = readRecentPublicChats();
  if (!cached || cached.profileId !== profileId) return null;
  return cached.threads;
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

