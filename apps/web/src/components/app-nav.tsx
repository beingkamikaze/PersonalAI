"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileIcon, SettingsIcon } from "@/components/ui/icons";

/** Owner app shell — tools vs account (profile, settings, sign out). */
const links = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/knowledge", label: "Knowledge" },
  { href: "/app/memories", label: "Memories" },
  { href: "/app/chat", label: "Chat" },
  { href: "/app/conversations", label: "Conversations" },
] as const;

function navClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
    active
      ? "bg-white text-fg shadow-sm"
      : "text-muted hover:bg-white/70 hover:text-fg"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const profileActive = pathname.startsWith("/app/profile");
  const settingsActive = pathname.startsWith("/app/settings");

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-border bg-elevated px-5 py-6 md:h-full md:w-56 md:border-b-0 md:border-r">
      <Link href="/app" className="font-display text-lg text-fg">
        PersonaAI
      </Link>
      <nav
        aria-label="Workspace"
        className="flex flex-wrap gap-2 md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto"
      >
        {links.map((link) => {
          const active =
            link.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={navClass(active)}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <nav
        aria-label="Account"
        className="flex flex-wrap items-center justify-end gap-1 md:mt-auto md:flex-col md:items-stretch md:justify-start md:border-t md:border-border md:pt-3"
      >
        <Link
          href="/app/profile"
          className={`${navClass(profileActive)} w-full`}
          aria-current={profileActive ? "page" : undefined}
        >
          <ProfileIcon className="shrink-0" />
          Profile
        </Link>
        <Link
          href="/app/settings"
          className={`${navClass(settingsActive)} w-full`}
          aria-current={settingsActive ? "page" : undefined}
        >
          <SettingsIcon className="shrink-0" />
          Settings
        </Link>
        <SignOutButton fullWidth className="w-full" />
      </nav>
    </aside>
  );
}
