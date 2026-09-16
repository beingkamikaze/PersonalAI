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
      description="Try the answers visitors will hear. Preferences you state here can be saved as memories."
    >
      <OnboardingProgress step={4} />
      <div className="mt-8">
        {profileId ? (
          <OwnerChat profileId={profileId} suggestions={SUGGESTIONS} />
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
          Talk to your AI
        </ButtonLink>
      </div>
    </ScreenIntro>
  );
}
