"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OwnerChat } from "@/components/owner-chat";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

const SUGGESTIONS = [
  "What do I do professionally?",
  "What are my main skills?",
  "How do I prefer to work?",
];

export default function OnboardingTestPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (!cancelled) setProfile(me);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/onboarding/test");
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
      title="Test your AI"
      description="Private owner chat using interview personality, facts, and uploaded knowledge."
    >
      <OnboardingProgress step={4} />
      <div className="mt-8">
        {profile ? (
          <OwnerChat
            profileId={profile.id}
            assistantName={profile.name}
            avatarUrl={profile.avatar_url}
            suggestions={SUGGESTIONS}
          />
        ) : (
          <p className="text-sm text-muted">{error ?? "Loading chat…"}</p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/onboarding/publish">Looks good — continue</ButtonLink>
        <ButtonLink href="/onboarding/knowledge" variant="ghost">
          Back
        </ButtonLink>
        <ButtonLink href="/app/chat" variant="secondary">
          Open full chat
        </ButtonLink>
      </div>
    </ScreenIntro>
  );
}
