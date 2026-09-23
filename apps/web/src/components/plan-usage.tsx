"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CrownIcon } from "@/components/ui/icons";
import {
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
} from "@/lib/api";
import { PREVIEW_ANALYTICS } from "@/lib/ui-preview";

export function useOwnerChatUsage() {
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
  } | null>({
    remaining: PREVIEW_ANALYTICS.owner_chats_remaining ?? 39,
    limit: PREVIEW_ANALYTICS.owner_chats_limit ?? 40,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        const summary = await apiFetch<AnalyticsSummary>(
          `/ai/${me.id}/analytics/summary`,
        );
        if (cancelled) return;
        if (
          typeof summary.owner_chats_remaining === "number" &&
          typeof summary.owner_chats_limit === "number"
        ) {
          setUsage({
            remaining: summary.owner_chats_remaining,
            limit: summary.owner_chats_limit,
          });
        }
      } catch {
        if (cancelled) return;
        setUsage({
          remaining: PREVIEW_ANALYTICS.owner_chats_remaining ?? 39,
          limit: PREVIEW_ANALYTICS.owner_chats_limit ?? 40,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const used = usage ? Math.max(0, usage.limit - usage.remaining) : 0;
  const pct =
    usage && usage.limit > 0
      ? Math.min(100, Math.round((used / usage.limit) * 100))
      : 0;

  return { usage, pct };
}

/** Compact plan chip for mobile top chrome. */
export function MobilePlanChip({ className = "" }: { className?: string }) {
  const { usage } = useOwnerChatUsage();

  return (
    <Link
      href="/pricing"
      className={`flex min-w-0 items-center gap-1.5 rounded-xl border border-border bg-[var(--atmosphere-1)] px-2 py-1.5 ${className}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#b45309]">
        <CrownIcon className="h-3 w-3" />
      </span>
      <span className="min-w-0 truncate text-xs text-muted">
        {usage ? `${usage.remaining}/${usage.limit}` : "Free"}
      </span>
      <span className="shrink-0 text-xs font-medium text-accent">Upgrade</span>
    </Link>
  );
}
