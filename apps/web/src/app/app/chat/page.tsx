"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthCurveMark } from "@/components/auth-edge-curves";
import { OwnerChat } from "@/components/owner-chat";
import { ButtonLink } from "@/components/ui/button";
import {
  BrainIcon,
  ChatIcon,
  ChevronRightIcon,
  ExternalIcon,
  KnowledgeIcon,
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
    <div className="relative w-full space-y-3.5 md:px-2">
      <AuthCurveMark className="pointer-events-none absolute -top-6 -right-4 z-0 hidden h-56 w-16 -scale-x-100 text-accent/25 xl:block" />

      <header className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_9.35rem] xl:gap-x-3">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
            Chats
          </p>
          <h1 className="mt-2 font-display text-[2.05rem] leading-[1.08] tracking-tight text-fg sm:text-[2.3rem]">
            Talk to your <span className="text-accent">AI</span>
          </h1>
          <p className="mt-2 max-w-[34rem] text-sm leading-snug text-muted">
            Get personalized answers, save what matters, and build a smarter
            version of yourself.
          </p>
        </div>

        <div className="pointer-events-none relative hidden h-full xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:block">
          <p className="absolute top-1 right-[8.4rem] w-[7.25rem] text-right font-display text-[13px] leading-tight font-medium text-accent italic">
            Your Thinking
            <br />
            Partner.
          </p>
          <svg
            viewBox="0 0 72 40"
            className="absolute top-10 right-[8.15rem] h-7 w-12 text-accent"
            aria-hidden
          >
            <path
              d="M2 12c16 0 24 12 56 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M48 15 62 20.5 49 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="absolute right-0 bottom-0 h-[9.6rem] w-[8rem]">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/dashboard/chat-companion-3d-v2.png"
                alt=""
                width={1024}
                height={1024}
                className="absolute h-auto max-w-none select-none"
                style={{ width: "147.8%", left: "-34.9%", top: "-9.7%" }}
                priority
                unoptimized
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-start-1 xl:row-start-2 xl:grid-cols-3">
          <FeatureCard
            tone="mint"
            icon={<ChatIcon className="h-4 w-4" />}
            title="Ask anything"
            subtitle="Instant answers"
          />
          <FeatureCard
            tone="purple"
            icon={<BrainIcon className="h-4 w-4" />}
            title="Save to memory"
            subtitle="Keep what matters"
          />
          <FeatureCard
            tone="amber"
            icon={<KnowledgeIcon className="h-4 w-4" />}
            title="Use knowledge"
            subtitle="From your content"
            className="md:col-span-2 xl:col-span-1"
          />
        </div>
      </header>

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

      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 shadow-[0_8px_20px_-18px_rgba(15,31,28,0.45)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <SproutIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">
              Your conversations stay private
            </p>
            <p className="mt-0.5 text-sm leading-snug text-muted">
              Use chats to get instant answers. Save important information to
              Memory for a better, more personalized experience.
            </p>
          </div>
        </div>
        <ButtonLink
          href="/app/memories"
          variant="secondary"
          className="shrink-0 self-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm"
        >
          Learn more
          <ExternalIcon className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>
    </div>
  );
}

function FeatureCard({
  tone,
  icon,
  title,
  subtitle,
  className = "",
}: {
  tone: "mint" | "purple" | "amber";
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  const tones = {
    mint: "bg-[var(--tone-mint)] text-accent",
    purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
    amber: "bg-[#fff4e6] text-[var(--tone-amber)]",
  } as const;

  return (
    <div className={`flex min-h-[4.75rem] min-w-0 items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 shadow-[0_8px_20px_-16px_rgba(15,31,28,0.4)] ${className}`}>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-fg">{title}</p>
        <p className="mt-0.5 text-xs leading-tight text-muted">{subtitle}</p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted/80" />
    </div>
  );
}
