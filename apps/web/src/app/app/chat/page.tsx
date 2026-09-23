"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { OwnerChat } from "@/components/owner-chat";
import { ButtonLink } from "@/components/ui/button";
import {
  BrainIcon,
  ChatIcon,
  ExternalIcon,
  SproutIcon,
} from "@/components/ui/icons";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";
import { isUiPreview, PREVIEW_PROFILE } from "@/lib/ui-preview";

const SUGGESTIONS = [
  "What do I do professionally?",
  "What are my main skills?",
  "What kind of work am I open to?",
  "I prefer async updates over meetings",
  "What projects am I proud of?",
  "How do I prefer to communicate?",
];

/** Book icon fallback — KnowledgeIcon shape */
function BookIconLocal({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default function AppChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(
    isUiPreview() ? PREVIEW_PROFILE : null,
  );
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
          if (isUiPreview()) {
            setProfile(PREVIEW_PROFILE);
            return;
          }
          router.replace("/sign-in?next=/app/chat");
          return;
        }
        if (isUiPreview()) {
          setProfile(PREVIEW_PROFILE);
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
    <div className="mx-auto w-full max-w-6xl space-y-3">
      {/* Compact hero */}
      <header className="flex min-w-0 flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
            Chats
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-fg md:text-[2rem]">
            Talk to your <span className="text-accent">AI</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted text-balance">
            Get personalized answers, save what matters, and build a smarter
            version of yourself.
          </p>

          <div className="mt-3 grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:items-stretch">
            <FeatureChip
              tone="mint"
              icon={<ChatIcon className="h-3.5 w-3.5" />}
              title="Ask anything"
              subtitle="Instant answers"
            />
            <FeatureChip
              tone="purple"
              icon={<BrainIcon className="h-3.5 w-3.5" />}
              title="Save to memory"
              subtitle="Keep what matters"
            />
            <FeatureChip
              tone="amber"
              icon={<BookIconLocal className="h-3.5 w-3.5" />}
              title="Use knowledge"
              subtitle="From your content"
            />
          </div>
      </header>

      {/* Composer sits higher */}
      {profile ? (
        <OwnerChat
          profileId={profile.id}
          assistantName={profile.name}
          suggestions={SUGGESTIONS}
          variant="app"
        />
      ) : (
        <p className="text-sm text-muted">{error ?? "Loading chat…"}</p>
      )}

      {/* Step 4: privacy tip — full width */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/15 bg-accent-soft/70 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
            <SproutIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-fg">
              Your conversations stay private
            </p>
            <p className="mt-0.5 text-sm text-muted text-balance">
              Use chats to get instant answers. Save important information to
              Memory for a better, more personalized experience.
            </p>
          </div>
        </div>
        <ButtonLink
          href="/app/memories"
          variant="secondary"
          className="gap-2 rounded-xl bg-white py-2"
        >
          Learn more
          <ExternalIcon className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
    </div>
  );
}

function FeatureChip({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: "mint" | "purple" | "amber";
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const tones = {
    mint: "bg-[var(--tone-mint)] text-accent",
    purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
    amber: "bg-[#fff7e6] text-[var(--tone-amber)]",
  } as const;

  return (
    <div className="flex h-full min-h-[4.75rem] min-w-0 items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-3 shadow-[0_6px_16px_-14px_rgba(15,31,28,0.28)] sm:min-h-[5.5rem]">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-snug text-fg">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs leading-snug text-muted">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
