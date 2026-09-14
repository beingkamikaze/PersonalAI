"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountChip } from "@/components/account-chip";
import { SignOutButton } from "@/components/sign-out-button";

/** Owner app shell nav — Profile is the identity screen (`/app/settings`). */
const links = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/knowledge", label: "Knowledge" },
  { href: "/app/memories", label: "Memories" },
  { href: "/app/chat", label: "Chat" },
  { href: "/app/conversations", label: "Conversations" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const profileActive = pathname.startsWith("/app/settings");

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
              className={`rounded px-3 py-2 text-sm transition ${
                active
                  ? "bg-white text-fg shadow-sm"
                  : "text-muted hover:bg-white/70 hover:text-fg"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <AccountChip href="/app/settings" variant="nav" active={profileActive} />
      </nav>
      <div className="shrink-0 md:mt-auto">
        <SignOutButton />
      </div>
    </aside>
  );
}
