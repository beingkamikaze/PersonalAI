"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { RecentPublicThread } from "@/lib/recent-public-chats";
import {
  CardEmptyState,
  CardSkeleton,
  DashboardCard,
  RowIcon,
} from "./dashboard-card";
import { formatWhen } from "./format";

/**
 * Closes the loop: visitor asks → AI says it doesn't have the info →
 * owner sees the question here → adds knowledge/memory → AI improves.
 *
 * Items come from the same conversation list as "Recent visitor chats";
 * a thread is flagged when the API's `needs_review` heuristic fired.
 */
export function NeedsAttention({
  threads,
  onOpenThread,
}: {
  /** null = never loaded */
  threads: RecentPublicThread[] | null;
  onOpenThread: (thread: RecentPublicThread) => void;
}) {
  const loading = threads === null;
  const flagged = (threads ?? []).filter((t) => t.needsReview);

  return (
    <DashboardCard
      title="Needs your attention"
      subtitle="Questions your AI said it couldn't answer"
      action={
        flagged.length > 0
          ? { href: "/app/conversations", label: "View all" }
          : undefined
      }
    >
      {loading ? (
        <CardSkeleton rows={2} />
      ) : flagged.length === 0 ? (
        <CardEmptyState
          title="You're all caught up."
          description="No visitor questions currently need your attention. When your AI tells someone it doesn't have the answer, that question will show up here."
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {flagged.map((thread) => (
              <li key={thread.id} className="flex items-start gap-3 px-1.5 py-3">
                <RowIcon tone="amber">
                  <AlertCircleIcon className="h-4 w-4" />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-5 text-fg">
                    {thread.unansweredPreview || thread.preview}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-muted">
                    {thread.updatedAt
                      ? formatWhen(thread.updatedAt)
                      : (thread.whenLabel ?? "Recently")}
                  </p>
                  <p className="mt-1.5 text-xs leading-4 text-muted">
                    Your AI replied that it didn&apos;t have this information
                    yet.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!h-8 !rounded-lg border border-border bg-white px-3 text-xs"
                    onClick={() => onOpenThread(thread)}
                  >
                    Review
                  </Button>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-muted" />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Teach it the answer in{" "}
            <Link
              href="/app/knowledge"
              className="font-medium text-accent hover:text-accent-hover"
            >
              Knowledge
            </Link>{" "}
            or{" "}
            <Link
              href="/app/chat"
              className="font-medium text-accent hover:text-accent-hover"
            >
              tell your AI directly
            </Link>
            .
          </p>
        </>
      )}
    </DashboardCard>
  );
}
