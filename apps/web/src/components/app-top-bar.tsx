"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, SearchIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/user-avatar";
import { SignOutButton } from "@/components/sign-out-button";
import {
  ACCOUNT_CHANGED_EVENT,
  getSessionUser,
  type SessionUser,
} from "@/lib/auth";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";
import { PREVIEW_PROFILE } from "@/lib/ui-preview";

/**
 * App top chrome: conversation search (full field on md+), notifications, profile.
 * Mobile uses a search icon instead of a persistent input.
 */
export function AppTopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [user, me] = await Promise.all([
          getSessionUser().catch(() => null),
          apiFetch<AiProfile>("/ai/me").catch((err) => {
            if (
              err instanceof ApiError &&
              (err.status === 401 || err.status === 404)
            ) {
              return null;
            }
            throw err;
          }),
        ]);
        if (cancelled) return;
        setSession(
          user ?? {
            email: PREVIEW_PROFILE.contact_email,
            name: PREVIEW_PROFILE.name,
            avatarUrl: PREVIEW_PROFILE.avatar_url,
          },
        );
        setProfile(me ?? PREVIEW_PROFILE);
      } catch {
        if (!cancelled) {
          // API / auth down — keep chrome visible
          setSession({
            email: PREVIEW_PROFILE.contact_email,
            name: PREVIEW_PROFILE.name,
            avatarUrl: PREVIEW_PROFILE.avatar_url,
          });
          setProfile(PREVIEW_PROFILE);
        }
      }
    }
    void load();
    const onChange = () => void load();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, onChange);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(
      q
        ? `/app/conversations?q=${encodeURIComponent(q)}`
        : "/app/conversations",
    );
  }

  const displayName = profile?.name ?? session?.name ?? "Profile";
  const iconBtn =
    "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg";

  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2.5 md:ml-auto md:w-full md:max-w-xl">
      <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-full border-0 bg-white py-2 pl-9 pr-4 text-sm text-fg shadow-[0_6px_18px_-6px_rgba(15,31,28,0.28),0_1px_2px_rgba(15,31,28,0.06)] ring-1 ring-black/[0.04] placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/35"
          aria-label="Search conversations"
        />
      </form>

      <Link
        href="/app/conversations"
        className={`${iconBtn} md:hidden`}
        aria-label="Search conversations"
      >
        <SearchIcon className="h-4 w-4" />
      </Link>

      <button type="button" className={iconBtn} aria-label="Notifications">
        <BellIcon className="h-4 w-4" />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
      </button>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Profile menu"
        >
          <UserAvatar
            name={displayName}
            src={profile?.avatar_url ?? session?.avatarUrl}
            size="xs"
          />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-white py-1 shadow-[0_12px_30px_-16px_rgba(18,24,31,0.45)]"
          >
            <Link
              href="/app/profile"
              role="menuitem"
              className="block px-3 py-2 text-sm text-fg hover:bg-[var(--atmosphere-1)]"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/app/conversations"
              role="menuitem"
              className="block px-3 py-2 text-sm text-fg hover:bg-[var(--atmosphere-1)]"
              onClick={() => setMenuOpen(false)}
            >
              Conversations
            </Link>
            <Link
              href="/app/settings"
              role="menuitem"
              className="block px-3 py-2 text-sm text-fg hover:bg-[var(--atmosphere-1)]"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
            <div className="border-t border-border px-1 py-1">
              <SignOutButton fullWidth className="w-full" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
