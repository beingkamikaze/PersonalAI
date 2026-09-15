"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import {
  ACCOUNT_CHANGED_EVENT,
  getSessionUser,
  type SessionUser,
} from "@/lib/auth";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

/**
 * Shows who is signed in. Uses AI profile name when it exists, else auth metadata.
 * Used in onboarding chrome — app shell Profile is a normal nav row.
 */
export function AccountChip({
  href,
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);

  const load = useCallback(async () => {
    const user = await getSessionUser();
    setSession(user);
    try {
      const me = await apiFetch<AiProfile>("/ai/me");
      setProfile(me);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
        setProfile(null);
        return;
      }
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, load);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, load);
  }, [load]);

  const displayName = profile?.name || session?.name || "Account";
  const subtitle =
    session?.email || (profile?.username ? `@${profile.username}` : "Signed in");
  const avatarSrc = profile?.avatar_url || session?.avatarUrl;
  const label = `${displayName}, ${subtitle}`;

  const inner = (
    <>
      <UserAvatar name={displayName} src={avatarSrc} />
      <span
        className={`min-w-0 flex-1 overflow-hidden text-left ${compact ? "hidden sm:block" : ""}`}
      >
        <span className="block truncate text-sm text-fg">{displayName}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
    </>
  );

  const className =
    "flex min-w-0 max-w-full items-center gap-2.5 rounded px-2 py-2 transition hover:bg-white/70";

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={className} title={label}>
      {inner}
    </div>
  );
}
