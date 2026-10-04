/**
 * Last recent public chats for the signed-in tab.
 *
 * The dashboard unmounts when you leave `/app`, so component state cannot
 * keep the list. This module stays alive for the tab: the next visit paints
 * the previous rows immediately, then a background refetch replaces them
 * only when a thread id, preview, status, or updated_at changed.
 *
 * Cleared on sign-out so the next account does not see the previous list.
 */

export type RecentPublicThread = {
  id: string;
  preview: string;
  /** ISO timestamp from the API. Null for preview mocks that use `whenLabel`. */
  updatedAt: string | null;
  /** Preformatted label ("Today") used only by UI preview mocks. */
  whenLabel?: string;
  /** The AI said it did not have the information for a question in this thread. */
  needsReview: boolean;
  /** The question the AI could not answer, when `needsReview` is true. */
  unansweredPreview: string | null;
};

type CacheEntry = {
  profileId: string;
  threads: RecentPublicThread[];
  /** When this list was last confirmed by the API. */
  fetchedAt: number;
};

let cache: CacheEntry | null = null;

export function readRecentPublicChats(): CacheEntry | null {
  return cache;
}

export function clearRecentPublicChats(): void {
  if (!cache) return;
  cache = null;
  console.info("[dashboard] recent visitor chats cache cleared");
}

export function recentPublicThreadsUnchanged(
  left: RecentPublicThread[],
  right: RecentPublicThread[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    const a = left[i];
    const b = right[i];
    if (
      a.id !== b.id ||
      a.updatedAt !== b.updatedAt ||
      a.preview !== b.preview ||
      a.needsReview !== b.needsReview ||
      a.unansweredPreview !== b.unansweredPreview
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Remember a successful fetch.
 * When the rows match, `threads` is the cached array so the caller can skip a re-render.
 */
export function publishRecentPublicChats(
  profileId: string,
  threads: RecentPublicThread[],
): { threads: RecentPublicThread[]; changed: boolean } {
  const fetchedAt = Date.now();
  if (
    cache &&
    cache.profileId === profileId &&
    recentPublicThreadsUnchanged(cache.threads, threads)
  ) {
    cache = { profileId, threads: cache.threads, fetchedAt };
    return { threads: cache.threads, changed: false };
  }
  const next = threads.map((row) => ({ ...row }));
  cache = { profileId, threads: next, fetchedAt };
  return { threads: next, changed: true };
}
