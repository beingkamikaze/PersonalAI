"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CrownIcon } from "@/components/ui/icons";
import type { AnalyticsSummary } from "@/lib/api";
import {
  loadAnalytics,
  loadProfile,
  readAnalyticsCache,
  readProfileCache,
} from "@/lib/owner-cache";
import { PREVIEW_ANALYTICS } from "@/lib/ui-preview";

function usageFromSummary(summary: AnalyticsSummary | null): {
  remaining: number;
  limit: number;
} | null {
  if (
    summary &&
    typeof summary.owner_chats_remaining === "number" &&
    typeof summary.owner_chats_limit === "number"
  ) {
    return {
      remaining: summary.owner_chats_remaining,
      limit: summary.owner_chats_limit,
    };
  }
  return null;
}

export function useOwnerChatUsage() {
  const pathname = usePathname();
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
  } | null>(() => {
    const profile = readProfileCache();
    return (
      (profile ? usageFromSummary(readAnalyticsCache(profile.id)) : null) ?? {
        remaining: PREVIEW_ANALYTICS.owner_chats_remaining ?? 39,
        limit: PREVIEW_ANALYTICS.owner_chats_limit ?? 40,
      }
    );
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadProfile();
        const summary = await loadAnalytics(me.id);
        if (cancelled) return;
        const next = usageFromSummary(summary);
        if (next) setUsage(next);
      } catch {
        if (cancelled) return;
        const profile = readProfileCache();
        const cached = profile
          ? usageFromSummary(readAnalyticsCache(profile.id))
          : null;
        if (cached) {
          setUsage(cached);
          return;
        }
        setUsage({
          remaining: PREVIEW_ANALYTICS.owner_chats_remaining ?? 39,
          limit: PREVIEW_ANALYTICS.owner_chats_limit ?? 40,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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
