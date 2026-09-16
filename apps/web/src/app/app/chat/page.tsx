"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerChat } from "@/components/owner-chat";
import { ScreenIntro } from "@/components/screen-intro";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

const SUGGESTIONS = [
  "What do I do professionally?",
  "What are my main skills?",
  "What kind of work am I open to?",
  "I prefer async updates over meetings",
];

export default function AppChatPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (!cancelled) setProfileId(me.id);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app/chat");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <ScreenIntro
      title="Talk to your AI"
      description="Preview answers as visitors will hear them. Preferences you state here can be saved as memories."
    >
      {profileId ? (
        <>
          <OwnerChat profileId={profileId} suggestions={SUGGESTIONS} />
          <p className="mt-4 text-sm text-muted">
            Review saved facts in{" "}
            <Link
              href="/app/memories"
              className="text-accent hover:text-accent-hover"
            >
              Memories
            </Link>
            . Visitors chat on your public page, not here.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">{error ?? "Loading chat…"}</p>
      )}
    </ScreenIntro>
  );
}
