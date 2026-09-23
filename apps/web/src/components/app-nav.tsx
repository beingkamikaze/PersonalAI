"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  CrownIcon,
  DashboardIcon,
  KnowledgeIcon,
  MemoryIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import { useOwnerChatUsage } from "@/components/plan-usage";

/** Mockup nav: Dashboard, Chats, Knowledge, Memory, Settings + Upgrade. */
const links = [
  { href: "/app", label: "Dashboard", short: "Home", icon: DashboardIcon },
  { href: "/app/chat", label: "Chats", short: "Chats", icon: ChatIcon },
  {
    href: "/app/knowledge",
    label: "Knowledge",
    short: "Knowledge",
    icon: KnowledgeIcon,
  },
  { href: "/app/memories", label: "Memory", short: "Memory", icon: MemoryIcon },
  {
    href: "/app/settings",
    label: "Settings",
    short: "Settings",
    icon: SettingsIcon,
  },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function sidebarNavClass(active: boolean) {
  return `inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
    active
      ? "bg-accent-soft font-medium text-accent"
      : "text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg"
  }`;
}

function tabNavClass(active: boolean) {
  return `flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] leading-tight transition ${
    active ? "font-medium text-accent" : "text-muted"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const { usage, pct } = useOwnerChatUsage();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[15.5rem] shrink-0 flex-col gap-5 border-r border-border bg-white px-4 py-6 md:sticky md:top-0 md:flex md:h-dvh md:self-start">
        <Link
          href="/app"
          className="shrink-0 px-1 font-display text-xl tracking-tight text-accent"
        >
          PersonaAI
        </Link>

        <nav
          aria-label="Workspace"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        >
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={sidebarNavClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 rounded-2xl border border-border bg-[var(--atmosphere-1)] p-3.5">
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
          <ButtonLink
            href="/pricing"
            className="mt-3 w-full rounded-xl py-2 text-sm"
          >
            Upgrade Plan
          </ButtonLink>
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Workspace"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-14 grid-cols-5">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={tabNavClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{link.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
