"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OwnerChat } from "@/components/owner-chat";
import { ScreenIntro } from "@/components/screen-intro";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

const SUGGESTIONS = [
  "What do I do professionally?",
  "What are my main skills?",
  "How do I prefer to communicate?",
  "What kind of work am I open to?",
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
      title="Private chat"
      description="Owner testing surface. Uses identity, personality, facts, knowledge (RAG), and memories."
    >
      {profileId ? (
        <OwnerChat profileId={profileId} suggestions={SUGGESTIONS} />
      ) : (
        <p className="text-sm text-muted">{error ?? "Loading chat…"}</p>
      )}
    </ScreenIntro>
  );
}
