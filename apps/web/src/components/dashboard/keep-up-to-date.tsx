"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import {
  ChevronRightIcon,
  KnowledgeIcon,
  MemoryIcon,
} from "@/components/ui/icons";
import type { KnowledgeDocument, MemoryItem } from "@/lib/api";
import { CardSkeleton, DashboardCard, RowIcon } from "./dashboard-card";
import { countWithinDays, formatDay, latestTimestamp } from "./format";

/**
 * What should I update? Real timestamps from the knowledge and memory lists.
 * Each row deep-links to the page where the owner changes that thing.
 */
export function KeepUpToDate({
  documents,
  memories,
}: {
  /** null = loading, undefined = request failed */
  documents: KnowledgeDocument[] | null | undefined;
  memories: MemoryItem[] | null | undefined;
}) {
  const loading = documents === null || memories === null;

  return (
    <DashboardCard
      title="Keep your AI up to date"
      subtitle="Recent changes to what your AI knows"
    >
      {loading ? (
        <CardSkeleton rows={2} />
      ) : (
        <ul className="divide-y divide-border">
          <KnowledgeRow documents={documents} />
          <MemoryRow memories={memories} />
        </ul>
      )}
    </DashboardCard>
  );
}

function KnowledgeRow({
  documents,
}: {
  documents: KnowledgeDocument[] | undefined;
}) {
  if (documents === undefined) {
    return (
      <UpdateRow
        icon={<KnowledgeIcon className="h-4 w-4" />}
        title="Knowledge"
        detail="Couldn't load your knowledge sources."
        href="/app/knowledge"
        cta="Manage knowledge"
      />
    );
  }
  const ready = documents.filter((d) => d.status === "ready");
  const processing = documents.filter(
    (d) => d.status === "pending" || d.status === "processing",
  ).length;
  const failed = documents.filter((d) => d.status === "failed").length;

  if (documents.length === 0) {
    return (
      <UpdateRow
        icon={<KnowledgeIcon className="h-4 w-4" />}
        title="No knowledge added yet"
        detail="Upload a résumé, notes, or a link so your AI has something to draw on."
        href="/app/knowledge"
        cta="Add knowledge"
      />
    );
  }

  const latest = latestTimestamp(documents);
  const recent = countWithinDays(documents, 7);
  const parts: string[] = [];
  if (latest) parts.push(formatDay(latest));
  parts.push(
    recent > 0
      ? `${recent} new ${recent === 1 ? "source" : "sources"} this week`
      : `${ready.length} ${ready.length === 1 ? "source" : "sources"} ready`,
  );
  if (processing > 0) parts.push(`${processing} processing`);
  if (failed > 0) parts.push(`${failed} failed`);

  return (
    <UpdateRow
      icon={<KnowledgeIcon className="h-4 w-4" />}
      title="Knowledge updated"
      detail={parts.join(" · ")}
      href="/app/knowledge"
      cta="Manage knowledge"
      warn={failed > 0}
    />
  );
}

function MemoryRow({ memories }: { memories: MemoryItem[] | undefined }) {
  if (memories === undefined) {
    return (
      <UpdateRow
        icon={<MemoryIcon className="h-4 w-4" />}
        title="Memory"
        detail="Couldn't load your memories."
        href="/app/memories"
        cta="Manage memory"
      />
    );
  }
  if (memories.length === 0) {
    return (
      <UpdateRow
        icon={<MemoryIcon className="h-4 w-4" />}
        title="No memories saved yet"
        detail="Tell your AI a preference or boundary in chat and it will remember it."
        href="/app/chat"
        cta="Talk to your AI"
      />
    );
  }
  const latest = latestTimestamp(memories);
  const recent = countWithinDays(memories, 7);
  const parts: string[] = [];
  if (latest) parts.push(formatDay(latest));
  parts.push(
    recent > 0
      ? `${recent} new ${recent === 1 ? "memory" : "memories"} this week`
      : `${memories.length} ${memories.length === 1 ? "memory" : "memories"} saved`,
  );
  return (
    <UpdateRow
      icon={<MemoryIcon className="h-4 w-4" />}
      title="Memory updated"
      detail={parts.join(" · ")}
      href="/app/memories"
      cta="Manage memory"
    />
  );
}

function UpdateRow({
  icon,
  title,
  detail,
  href,
  cta,
  warn = false,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href: string;
  cta: string;
  warn?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1.5 py-3.5">
      <RowIcon tone={warn ? "amber" : "neutral"}>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-fg">{title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted">{detail}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 basis-full items-center gap-0.5 pl-12 text-[13px] font-medium text-accent hover:text-accent-hover sm:basis-auto sm:pl-0"
      >
        {cta}
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </Link>
    </li>
  );
}
