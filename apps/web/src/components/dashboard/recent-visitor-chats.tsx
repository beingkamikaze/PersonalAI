"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalIcon,
  ShareIcon,
} from "@/components/ui/icons";
import type { RecentPublicThread } from "@/lib/recent-public-chats";
import {
  CardEmptyState,
  CardSkeleton,
  DashboardCard,
  RowIcon,
  StatusPill,
} from "./dashboard-card";
import { formatWhen } from "./format";

/**
 * What are people asking my AI? Last few public threads, newest first.
 */
export function RecentVisitorChats({
  published,
  threads,
  unavailable = false,
  username,
  publicPath,
  copied,
  onCopyLink,
  onOpenThread,
}: {
  published: boolean;
  /** null = never loaded */
  threads: RecentPublicThread[] | null;
  /** The request failed and there is no cached list to show. */
  unavailable?: boolean;
  username: string | null | undefined;
  publicPath: string;
  copied: boolean;
  onCopyLink: () => void;
  onOpenThread: (thread: RecentPublicThread) => void;
}) {
  const loading = threads === null;
  const empty = !loading && threads.length === 0;

  return (
    <DashboardCard
      title="Recent visitor chats"
      subtitle="Questions people asked your AI"
      action={
        !empty ? { href: "/app/conversations", label: "View all" } : undefined
      }
    >
      {loading ? (
        unavailable ? (
          <CardEmptyState
            title="Couldn't load visitor chats."
            description="The rest of your dashboard is still available."
          />
        ) : (
          <CardSkeleton rows={3} />
        )
      ) : empty ? (
        published ? (
          <CardEmptyState
            title="No visitor questions yet."
            description="Share your AI to start receiving questions. Conversations from your public page will appear here."
          >
            {username ? (
              <ButtonLink
                href={`/u/${username}`}
                className="!rounded-xl px-4 py-2.5"
              >
                <ExternalIcon className="mr-1.5 h-4 w-4" />
                Open public page
              </ButtonLink>
            ) : null}
            {publicPath ? (
              <Button
                type="button"
                variant="secondary"
                className="!rounded-xl border border-border bg-white px-4 py-2.5"
                onClick={onCopyLink}
              >
                <CopyIcon className="mr-1.5 h-4 w-4" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
            ) : null}
          </CardEmptyState>
        ) : (
          <CardEmptyState
            title="No visitor questions yet."
            description="Publish your AI so people can ask it questions. Their conversations will show up here."
          >
            <ButtonLink
              href="/onboarding/publish"
              className="!rounded-xl px-4 py-2.5"
            >
              <ShareIcon className="mr-1.5 h-4 w-4" />
              Share your link
            </ButtonLink>
          </CardEmptyState>
        )
      ) : (
        <ul className="divide-y divide-border">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onOpenThread(thread)}
                className="group flex w-full items-start gap-3 rounded-xl px-1.5 py-3 text-left transition hover:bg-[var(--atmosphere-1)]/60"
              >
                <RowIcon tone={thread.needsReview ? "amber" : "accent"}>
                  <ChatIcon className="h-4 w-4" />
                </RowIcon>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm leading-5 text-fg">
                    {thread.preview}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted">
                    {thread.updatedAt
                      ? formatWhen(thread.updatedAt)
                      : (thread.whenLabel ?? "Recently")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 pt-1">
                  {thread.needsReview ? (
                    <StatusPill tone="amber">Needs review</StatusPill>
                  ) : (
                    <StatusPill tone="green">Answered</StatusPill>
                  )}
                  <ChevronRightIcon className="h-3.5 w-3.5 text-muted transition group-hover:text-fg" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
