"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  CrownIcon,
  DashboardIcon,
  KnowledgeIcon,
  MemoryIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import {
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
} from "@/lib/api";
import { PREVIEW_ANALYTICS } from "@/lib/ui-preview";

/** Mockup nav: Dashboard, Chats, Knowledge, Memory, Settings + Upgrade. */
const links = [
  { href: "/app", label: "Dashboard", icon: DashboardIcon },
  { href: "/app/chat", label: "Chats", icon: ChatIcon },
  { href: "/app/knowledge", label: "Knowledge", icon: KnowledgeIcon },
  { href: "/app/memories", label: "Memory", icon: MemoryIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon },
] as const;

function navClass(active: boolean) {
  return `inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
    active
      ? "bg-accent-soft font-medium text-accent"
      : "text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
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
        // API down / unauthorized — keep Free Plan card filled
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

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 border-b border-border bg-white px-4 py-5 md:w-[15.5rem] md:border-b-0 md:border-r md:py-6">
      <Link
        href="/app"
        className="px-1 font-display text-xl tracking-tight text-accent"
      >
        PersonaAI
      </Link>

      <nav
        aria-label="Workspace"
        className="flex flex-wrap gap-1 md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto"
      >
        {links.map((link) => {
          const active =
            link.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={navClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-border bg-[var(--atmosphere-1)] p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#b45309]">
            <CrownIcon className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-medium text-fg">Free Plan</p>
        </div>
        <p className="mt-2 text-xs text-muted">
          {usage
            ? `${usage.remaining}/${usage.limit} chats left today`
            : "Chats with your AI today"}
        </p>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily chat usage"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ButtonLink href="/pricing" className="mt-3 w-full rounded-xl py-2 text-sm">
          Upgrade Plan
        </ButtonLink>
      </div>
    </aside>
  );
}
