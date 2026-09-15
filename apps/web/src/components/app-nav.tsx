"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileIcon, SettingsIcon } from "@/components/ui/icons";

/** Owner app shell — Profile is identity; Settings is public link + account. */
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
      <nav className="flex flex-wrap gap-2 md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto">
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
      <div className="shrink-0 space-y-1 md:mt-auto">
        <Link href="/app/profile" className={navClass(profileActive)}>
          <ProfileIcon className="shrink-0" />
          Profile
        </Link>
        <Link href="/app/settings" className={navClass(settingsActive)}>
          <SettingsIcon className="shrink-0" />
          Settings
        </Link>
        <SignOutButton />
      </div>
    </aside>
  );
}
