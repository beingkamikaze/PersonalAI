"use client";

import { type ReactNode } from "react";
import { ChatIcon, DocIcon, SendIcon, UsersIcon } from "@/components/ui/icons";
import type { AnalyticsSummary } from "@/lib/api";
import { DashboardCard } from "./dashboard-card";

/**
 * Is anyone using my AI? Four real counters, no trends (we only keep
 * daily rollups for the current window, so there is no prior period to
 * compare against — rather than invent one we show none).
 */
export function AiSnapshot({
  stats,
  activityUnavailable = false,
  knowledgeSources,
}: {
  /** null = never loaded */
  stats: AnalyticsSummary | null;
  /** Analytics failed and there is no cached summary to show. */
  activityUnavailable?: boolean;
  /** Ready knowledge sources; null while loading, undefined if the request failed */
  knowledgeSources: number | null | undefined;
}) {
  const loading = stats === null;
  const quiet =
    !loading &&
    stats.visits_7d === 0 &&
    stats.conversations_7d === 0 &&
    stats.messages_7d === 0;

  return (
    <DashboardCard title="AI snapshot" subtitle="Activity from the last 7 days">
      <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-border">
        <Stat
          icon={<UsersIcon className="h-4 w-4" />}
          label="Visitors"
          value={loading ? (activityUnavailable ? undefined : null) : stats.visits_7d}
        />
        <Stat
          icon={<ChatIcon className="h-4 w-4" />}
          label="Conversations"
          value={
            loading ? (activityUnavailable ? undefined : null) : stats.conversations_7d
          }
        />
        <Stat
          icon={<SendIcon className="h-4 w-4" />}
          label="Messages"
          value={loading ? (activityUnavailable ? undefined : null) : stats.messages_7d}
        />
        <Stat
          icon={<DocIcon className="h-4 w-4" />}
          label="Knowledge sources"
          hint="all time"
          value={knowledgeSources}
        />
      </dl>
      {activityUnavailable ? (
        <p className="mt-4 text-xs text-muted">
          Couldn&apos;t load activity. The rest of your dashboard is still
          available.
        </p>
      ) : quiet ? (
        <p className="mt-4 text-xs text-muted">
          Activity will appear here once people start using your AI.
        </p>
      ) : null}
    </DashboardCard>
  );
}

function Stat({
  icon,
  label,
  hint,
  value,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  /** null = loading, undefined = unavailable */
  value: number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <dt className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="font-display text-[1.75rem] leading-none tabular-nums text-fg">
        {value === null ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-[var(--atmosphere-1)] align-middle" />
        ) : value === undefined ? (
          <span className="text-muted" aria-label="Unavailable">
            —
          </span>
        ) : (
          value.toLocaleString()
        )}
      </dd>
      <dd className="text-xs leading-4 text-muted">
        {label}
        {hint ? <span className="block text-[11px] opacity-80">{hint}</span> : null}
      </dd>
    </div>
  );
}
