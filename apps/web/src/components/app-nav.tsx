"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar } from "@/components/user-avatar";
import { SettingsIcon } from "@/components/ui/icons";
import { ACCOUNT_CHANGED_EVENT, getSessionUser } from "@/lib/auth";
import { apiFetch, type AiProfile } from "@/lib/api";

/** Owner app shell — Profile is identity + public link; Settings is personality + account. */
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
  const [avatarName, setAvatarName] = useState("Profile");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const loadAvatar = useCallback(async () => {
    const session = await getSessionUser();
    let name = session?.name || "Profile";
    let src = session?.avatarUrl || null;
    try {
      const me = await apiFetch<AiProfile>("/ai/me");
      name = me.name || name;
      src = me.avatar_url || src;
    } catch {
      /* keep session fallback */
    }
    setAvatarName(name);
    setAvatarSrc(src);
  }, []);

  useEffect(() => {
    void loadAvatar();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, loadAvatar);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, loadAvatar);
  }, [loadAvatar]);

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
        <Link href="/app/settings" className={navClass(settingsActive)}>
          <SettingsIcon className="shrink-0" />
          Settings
        </Link>
        <Link
          href="/app/profile"
          className={navClass(profileActive)}
          aria-current={profileActive ? "page" : undefined}
        >
          <UserAvatar name={avatarName} src={avatarSrc} />
          Profile
        </Link>
      </nav>
      <div className="shrink-0 md:mt-auto">
        <SignOutButton />
      </div>
    </aside>
  );
}
