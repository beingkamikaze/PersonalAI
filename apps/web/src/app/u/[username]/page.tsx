"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PublicChat,
  PublicChatSkeleton,
  PublicRings,
  publicCardShell,
} from "@/components/public-chat";
import { ApiError, publicApiFetch, type PublicProfile } from "@/lib/api";

/**
 * Public AI page — no login required.
 * Loads GET /public/:username and chats via POST /public/:username/chat.
 */
export default function PublicAiPage() {
  const params = useParams<{ username: string }>();
  const username = String(params.username ?? "");

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setLoadError(null);
    (async () => {
      try {
        const data = await publicApiFetch<PublicProfile>(
          `/public/${encodeURIComponent(username)}`,
        );
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Public AI not found",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, reloadKey]);

  return (
    <PublicShell stageRef={stageRef}>
      {loadError ? (
        <section className={`${publicCardShell} px-6 py-12 text-center sm:px-10`}>
          <h1 className="font-display text-3xl tracking-tight text-fg">
            This page is unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {loadError}
          </p>
          <Button
            type="button"
            className="mt-6 rounded-full px-5"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </Button>
        </section>
      ) : !profile ? (
        <PublicChatSkeleton />
      ) : (
        <PublicChat
          key={profile.username}
          mode="public"
          username={profile.username}
          profile={profile}
          stageRef={stageRef}
        />
      )}
    </PublicShell>
  );
}

function PublicShell({
  children,
  stageRef,
}: {
  children: ReactNode;
  stageRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="public-visit relative h-dvh overflow-hidden">
      <PublicRings />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5 md:px-12 lg:px-16">
          <Link
            href="/"
            className="shrink-0 font-display text-[1.35rem] tracking-tight text-fg sm:text-[1.5rem]"
          >
            PersonaAI
          </Link>
          <Link
            href="/"
            className="shrink-0 text-[13px] font-medium text-accent transition hover:text-accent-hover sm:text-sm"
          >
            <span className="sm:hidden">Learn more</span>
            <span className="hidden sm:inline">Learn more about PersonaAI</span>
            <span aria-hidden> →</span>
          </Link>
        </header>
        <main className="flex min-h-0 flex-1 flex-col px-3 sm:px-6 md:px-10">
          <div
            ref={stageRef}
            className="mx-auto flex min-h-0 w-full max-w-[960px] flex-1 flex-col justify-center py-3 sm:py-5"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
