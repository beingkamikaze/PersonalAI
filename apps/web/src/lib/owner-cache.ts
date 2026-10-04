/**
 * In-memory owner data for the signed-in tab.
 *
 * Dashboard, the top bar, and the plan chip all need the same profile and
 * analytics. One in-flight promise per resource serves every caller. A later
 * visit renders the cached value immediately and refetches only after the
 * stale window. Sign-out clears the whole cache so the next account cannot
 * see it.
 *
 * Stale windows follow how the data moves:
 * - profile: owner edits only (5 min)
 * - documents / memories: owner edits; mutations also drop the cache (2 min)
 * - analytics / usage: visits and chats change without an owner action (45 s)
 * - recent public chats: refetched on every Dashboard visit; the cache is
 *   only so the previous rows can paint before that response arrives
 */

import { truncate } from "@/components/dashboard/format";
import {
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
  type ConversationListItem,
  type KnowledgeDocument,
  type MemoryItem,
} from "@/lib/api";
import {
  clearRecentPublicChats,
  publishRecentPublicChats,
  readRecentPublicChats,
  type RecentPublicThread,
} from "@/lib/recent-public-chats";

const PROFILE_STALE_MS = 5 * 60 * 1000;
const ANALYTICS_STALE_MS = 45 * 1000;
const DOCUMENTS_STALE_MS = 2 * 60 * 1000;
const MEMORIES_STALE_MS = 2 * 60 * 1000;
const RECENT_CHATS_STALE_MS = 0;
const PUBLIC_THREADS_LIMIT = 10;

type Slot<T> = { profileId: string; data: T; fetchedAt: number };
type Flight<T> = { gen: number; profileId: string; promise: Promise<T> };

let profileSlot: { profile: AiProfile; fetchedAt: number } | null = null;
let profileGen = 0;
let profileFlight: Flight<AiProfile> | null = null;

let analyticsSlot: Slot<AnalyticsSummary> | null = null;
let analyticsGen = 0;
let analyticsFlight: Flight<AnalyticsSummary> | null = null;

let documentsSlot: Slot<KnowledgeDocument[]> | null = null;
let documentsGen = 0;
let documentsFlight: Flight<KnowledgeDocument[]> | null = null;

let memoriesSlot: Slot<MemoryItem[]> | null = null;
let memoriesGen = 0;
let memoriesFlight: Flight<MemoryItem[]> | null = null;

let recentGen = 0;
let recentFlight: Flight<RecentPublicThread[]> | null = null;

function fresh(fetchedAt: number, staleMs: number): boolean {
  return Date.now() - fetchedAt < staleMs;
}

function dropResourceCaches(): void {
  analyticsSlot = null;
  analyticsGen += 1;
  analyticsFlight = null;
  documentsSlot = null;
  documentsGen += 1;
  documentsFlight = null;
  memoriesSlot = null;
  memoriesGen += 1;
  memoriesFlight = null;
  recentGen += 1;
  recentFlight = null;
  clearRecentPublicChats();
}

/** Drop everything for this tab. Call after a successful sign-out. */
export function clearOwnerCache(): void {
  profileSlot = null;
  profileGen += 1;
  profileFlight = null;
  dropResourceCaches();
}

export function readProfileCache(): AiProfile | null {
  return profileSlot?.profile ?? null;
}

export function readAnalyticsCache(profileId: string): AnalyticsSummary | null {
  if (!analyticsSlot || analyticsSlot.profileId !== profileId) return null;
  return analyticsSlot.data;
}

export function readDocumentsCache(
  profileId: string,
): KnowledgeDocument[] | null {
  if (!documentsSlot || documentsSlot.profileId !== profileId) return null;
  return documentsSlot.data;
}

export function readMemoriesCache(profileId: string): MemoryItem[] | null {
  if (!memoriesSlot || memoriesSlot.profileId !== profileId) return null;
  return memoriesSlot.data;
}

/** Profile edits, publish, unpublish, avatar. */
export function invalidateProfileAndAnalytics(): void {
  profileSlot = null;
  profileGen += 1;
  profileFlight = null;
  analyticsSlot = null;
  analyticsGen += 1;
  analyticsFlight = null;
}

/** Personality / settings that can change the setup checklist. */
export function invalidateAnalytics(profileId?: string): void {
  if (
    profileId &&
    analyticsSlot &&
    analyticsSlot.profileId !== profileId
  ) {
    return;
  }
  analyticsSlot = null;
  analyticsGen += 1;
  analyticsFlight = null;
}

/** Write a list the knowledge page just loaded, including poll updates. */
export function rememberDocuments(
  profileId: string,
  rows: KnowledgeDocument[],
): void {
  documentsSlot = { profileId, data: rows, fetchedAt: Date.now() };
}

/** Write a list the memory page just loaded. */
export function rememberMemories(profileId: string, rows: MemoryItem[]): void {
  memoriesSlot = { profileId, data: rows, fetchedAt: Date.now() };
}

/** Knowledge upload, notes, URL ingest, or delete. */
export function invalidateKnowledge(profileId: string): void {
  if (!documentsSlot || documentsSlot.profileId === profileId) {
    documentsSlot = null;
    documentsGen += 1;
    documentsFlight = null;
  }
  invalidateAnalytics(profileId);
}

/** Memory create, edit, or delete. */
export function invalidateMemories(profileId: string): void {
  if (!memoriesSlot || memoriesSlot.profileId === profileId) {
    memoriesSlot = null;
    memoriesGen += 1;
    memoriesFlight = null;
  }
  invalidateAnalytics(profileId);
}

export function loadProfile(): Promise<AiProfile> {
  if (profileSlot && fresh(profileSlot.fetchedAt, PROFILE_STALE_MS)) {
    return Promise.resolve(profileSlot.profile);
  }
  if (profileFlight && profileFlight.gen === profileGen) {
    return profileFlight.promise;
  }
  const gen = profileGen;
  const promise = apiFetch<AiProfile>("/ai/me")
    .then((profile) => {
      if (gen !== profileGen) return profile;
      if (profileSlot && profileSlot.profile.user_id !== profile.user_id) {
        dropResourceCaches();
      }
      profileSlot = { profile, fetchedAt: Date.now() };
      return profile;
    })
    .finally(() => {
      if (profileFlight?.gen === gen) profileFlight = null;
    });
  profileFlight = { gen, profileId: "", promise };
  return promise;
}

export function loadAnalytics(profileId: string): Promise<AnalyticsSummary> {
  if (
    analyticsSlot &&
    analyticsSlot.profileId === profileId &&
    fresh(analyticsSlot.fetchedAt, ANALYTICS_STALE_MS)
  ) {
    return Promise.resolve(analyticsSlot.data);
  }
  if (
    analyticsFlight &&
    analyticsFlight.gen === analyticsGen &&
    analyticsFlight.profileId === profileId
  ) {
    return analyticsFlight.promise;
  }
  const gen = analyticsGen;
  const promise = apiFetch<AnalyticsSummary>(
    `/ai/${profileId}/analytics/summary`,
  )
    .then((summary) => {
      if (gen === analyticsGen) {
        analyticsSlot = { profileId, data: summary, fetchedAt: Date.now() };
      }
      return summary;
    })
    .finally(() => {
      if (analyticsFlight?.gen === gen && analyticsFlight.profileId === profileId) {
        analyticsFlight = null;
      }
    });
  analyticsFlight = { gen, profileId, promise };
  return promise;
}

export function loadDocuments(profileId: string): Promise<KnowledgeDocument[]> {
  if (
    documentsSlot &&
    documentsSlot.profileId === profileId &&
    fresh(documentsSlot.fetchedAt, DOCUMENTS_STALE_MS)
  ) {
    return Promise.resolve(documentsSlot.data);
  }
  if (
    documentsFlight &&
    documentsFlight.gen === documentsGen &&
    documentsFlight.profileId === profileId
  ) {
    return documentsFlight.promise;
  }
  const gen = documentsGen;
  const promise = apiFetch<KnowledgeDocument[]>(`/ai/${profileId}/documents`)
    .then((rows) => {
      if (gen === documentsGen) {
        documentsSlot = { profileId, data: rows, fetchedAt: Date.now() };
      }
      return rows;
    })
    .finally(() => {
      if (documentsFlight?.gen === gen && documentsFlight.profileId === profileId) {
        documentsFlight = null;
      }
    });
  documentsFlight = { gen, profileId, promise };
  return promise;
}

export function loadMemories(profileId: string): Promise<MemoryItem[]> {
  if (
    memoriesSlot &&
    memoriesSlot.profileId === profileId &&
    fresh(memoriesSlot.fetchedAt, MEMORIES_STALE_MS)
  ) {
    return Promise.resolve(memoriesSlot.data);
  }
  if (
    memoriesFlight &&
    memoriesFlight.gen === memoriesGen &&
    memoriesFlight.profileId === profileId
  ) {
    return memoriesFlight.promise;
  }
  const gen = memoriesGen;
  const promise = apiFetch<MemoryItem[]>(`/ai/${profileId}/memories`)
    .then((rows) => {
      if (gen === memoriesGen) {
        memoriesSlot = { profileId, data: rows, fetchedAt: Date.now() };
      }
      return rows;
    })
    .finally(() => {
      if (memoriesFlight?.gen === gen && memoriesFlight.profileId === profileId) {
        memoriesFlight = null;
      }
    });
  memoriesFlight = { gen, profileId, promise };
  return promise;
}

export function loadRecentVisitorChats(
  profileId: string,
): Promise<RecentPublicThread[]> {
  const cached = readRecentPublicChats();
  if (
    cached &&
    cached.profileId === profileId &&
    fresh(cached.fetchedAt, RECENT_CHATS_STALE_MS)
  ) {
    return Promise.resolve(cached.threads);
  }
  if (
    recentFlight &&
    recentFlight.gen === recentGen &&
    recentFlight.profileId === profileId
  ) {
    return recentFlight.promise;
  }
  const gen = recentGen;
  const promise = apiFetch<ConversationListItem[]>(
    `/ai/${profileId}/conversations?channel=public&limit=${PUBLIC_THREADS_LIMIT}`,
  )
    .then((list) => {
      console.info(
        "[dashboard] recent visitor chats fetched count=%s",
        list.length,
      );
      const threads = list.map((row) => ({
        id: row.id,
        preview: truncate(row.preview?.trim() || "Visitor started a chat", 96),
        updatedAt: row.updated_at,
        needsReview: Boolean(row.needs_review),
        unansweredPreview: row.unanswered_preview?.trim()
          ? truncate(row.unanswered_preview.trim(), 96)
          : null,
      }));
      if (gen !== recentGen) return threads;
      const published = publishRecentPublicChats(profileId, threads);
      console.info(
        published.changed
          ? "[dashboard] recent visitor chats updated count=%s"
          : "[dashboard] recent visitor chats unchanged count=%s",
        threads.length,
      );
      return published.threads;
    })
    .finally(() => {
      if (recentFlight?.gen === gen && recentFlight.profileId === profileId) {
        recentFlight = null;
      }
    });
  recentFlight = { gen, profileId, promise };
  return promise;
}
