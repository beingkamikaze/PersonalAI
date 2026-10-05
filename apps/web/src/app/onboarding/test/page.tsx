"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { OnboardingProgress } from "@/components/onboarding-progress";
import {
  PublicChat,
  PublicChatSkeleton,
  PublicRings,
} from "@/components/public-chat";
import { ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";
import {
  revealContainer,
  revealItem,
  useHydratedReducedMotion,
} from "@/lib/motion";
import { suggestedQuestions } from "@/lib/suggested-questions";
import { isUiPreview, PREVIEW_PROFILE } from "@/lib/ui-preview";

export default function OnboardingTestPage() {
  const router = useRouter();
  const reduceMotion = useHydratedReducedMotion();
  const [profile, setProfile] = useState<AiProfile | null>(() =>
    isUiPreview() ? PREVIEW_PROFILE : null,
  );
  const [error, setError] = useState<string | null>(null);

  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

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
          router.replace("/sign-in?next=/onboarding/test");
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
    <motion.div
      className="mx-auto w-full max-w-[1040px]"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.header variants={item}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Test your AI
        </p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.12] tracking-[-0.02em] text-fg md:text-[2.5rem]">
          See how your AI responds.
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted text-balance">
          Ask the questions someone else would ask. Check whether it sounds
          like you and uses what you&apos;ve taught it.
        </p>
      </motion.header>

      <motion.div className="mt-5" variants={item}>
        <OnboardingProgress step={4} />
      </motion.div>

      <motion.div
        className="mx-auto mt-8 w-full max-w-[960px]"
        variants={item}
      >
        <div className="public-visit relative overflow-hidden rounded-[28px]">
          <PublicRings />
          <div className="relative z-10 px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6">
            <p className="mb-3 text-center text-[13px] leading-relaxed text-muted">
              Private preview — only you can see this.
            </p>
            {profile ? (
              <PublicChat
                key={profile.id}
                mode="preview"
                profileId={profile.id}
                profile={{
                  name: profile.name,
                  headline: profile.headline,
                  bio: profile.bio,
                  avatar_url: profile.avatar_url,
                  contact_email: profile.contact_email,
                  calendar_link: profile.calendar_link,
                  suggested_questions: suggestedQuestions(profile.name),
                }}
              />
            ) : error ? (
              <p className="px-2 py-8 text-center text-sm text-muted" role="alert">
                {error}
              </p>
            ) : (
              <PublicChatSkeleton />
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">
          Something wrong? Update your{" "}
          <Link
            href="/onboarding/knowledge"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Knowledge
          </Link>{" "}
          or{" "}
          <Link
            href="/app/memories"
            className="font-medium text-accent hover:text-accent-hover"
          >
            Memory
          </Link>{" "}
          and test again.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <ButtonLink
            href="/onboarding/publish"
            className="w-full gap-1.5 rounded-xl px-5 sm:w-auto"
          >
            Continue to share
            <ChevronRightIcon className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="/onboarding/knowledge"
            variant="ghost"
            className="px-1 text-muted hover:bg-transparent"
          >
            Back to knowledge
          </ButtonLink>
        </div>
      </motion.div>
    </motion.div>
  );
}
