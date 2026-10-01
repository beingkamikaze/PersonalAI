"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ChatIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalIcon,
  LinkIcon,
} from "@/components/ui/icons";
import { AuthCurveMark } from "@/components/auth-edge-curves";
import { DASHBOARD_CARD_CLASS, StatusPill } from "./dashboard-card";
import { possessiveAiName } from "./format";

export type SetupNextStep = { href: string; label: string };

/**
 * Hero: is my AI live, what does it do, where does it live, and the three
 * things I most often want to do from here.
 */
export function AiStatusCard({
  loading,
  name,
  headline,
  published,
  username,
  publicPath,
  publicHost,
  completeness,
  nextStep,
  copied,
  onCopyLink,
}: {
  loading: boolean;
  name: string | null | undefined;
  headline: string | null | undefined;
  published: boolean;
  username: string | null | undefined;
  publicPath: string;
  publicHost: string;
  /** done/total setup steps + score from the analytics checklist */
  completeness: { done: number; total: number; score: number } | null;
  nextStep: SetupNextStep | null;
  copied: boolean;
  onCopyLink: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const idle = useMemo(
    () => (reduceMotion ? undefined : { y: [0, -6, 0] }),
    [reduceMotion],
  );

  const aiName = possessiveAiName(name);
  const setupDone =
    completeness !== null && completeness.done >= completeness.total;
  const showSetupProgress = !loading && completeness !== null && !setupDone;

  return (
    <section
      className={`${DASHBOARD_CARD_CLASS} overflow-hidden px-5 py-5 sm:px-7 sm:py-6`}
      aria-labelledby="ai-status-title"
    >
      {/* Soft wash + edge curve on the right, behind the companion. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 80% 50%, rgba(227,242,238,0.9), transparent 70%)",
        }}
      />
      <AuthCurveMark className="pointer-events-none absolute -right-5 top-1/2 hidden h-48 w-12 -translate-y-1/2 -scale-x-100 text-fg/15 lg:block" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p
            className={`inline-flex items-center gap-2 text-[13px] font-medium ${
              published || loading ? "text-accent" : "text-muted"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                published ? "bg-accent" : "bg-[#b45309]"
              }`}
              aria-hidden
            />
            {loading
              ? "Checking your AI…"
              : published
                ? "Your AI is live"
                : "Your AI is not public yet"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1
              id="ai-status-title"
              className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em] text-fg sm:text-[2.5rem]"
            >
              {loading ? (
                <span className="inline-block h-9 w-48 animate-pulse rounded-lg bg-[var(--atmosphere-1)] align-middle" />
              ) : (
                aiName
              )}
            </h1>
            {!loading ? (
              <StatusPill
                tone={published ? "green" : "neutral"}
                className="!px-3 !py-1.5 !text-xs"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    published ? "bg-accent" : "bg-muted"
                  }`}
                  aria-hidden
                />
                {published ? "Published" : "Draft"}
              </StatusPill>
            ) : null}
          </div>

          <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted">
            {loading ? (
              <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded bg-[var(--atmosphere-1)]" />
            ) : headline?.trim() ? (
              headline
            ) : (
              <>
                Add a headline so visitors know what your AI can answer.{" "}
                <Link
                  href="/app/profile"
                  className="font-medium text-accent hover:text-accent-hover"
                >
                  Edit profile
                </Link>
              </>
            )}
          </p>

          {!loading ? (
            <PublicLinkLine
              published={published}
              username={username}
              publicPath={publicPath}
              publicHost={publicHost}
            />
          ) : null}

          {showSetupProgress && completeness ? (
            <SetupProgress
              done={completeness.done}
              total={completeness.total}
              score={completeness.score}
              nextStep={nextStep}
            />
          ) : null}

          {!loading ? (
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {published ? (
                <>
                  <ButtonLink href="/app/chat" className="!h-10 !rounded-xl px-4">
                    <ChatIcon className="mr-1.5 h-4 w-4" />
                    Talk to your AI
                    <ChevronRightIcon className="ml-1 h-3.5 w-3.5 opacity-90" />
                  </ButtonLink>
                  {username ? (
                    <ButtonLink
                      href={`/u/${username}`}
                      variant="secondary"
                      className="!h-10 !rounded-xl border border-border bg-white px-4"
                    >
                      <ExternalIcon className="mr-1.5 h-4 w-4" />
                      Open public page
                    </ButtonLink>
                  ) : null}
                  {publicPath ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!h-10 !rounded-xl border border-border bg-white px-4"
                      onClick={onCopyLink}
                    >
                      <CopyIcon className="mr-1.5 h-4 w-4" />
                      {copied ? "Copied!" : "Copy link"}
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <ButtonLink
                    href={nextStep?.href ?? "/onboarding/publish"}
                    className="!h-10 !rounded-xl px-4"
                  >
                    {nextStep ? "Continue setup" : "Publish your AI"}
                    <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5 opacity-90" />
                  </ButtonLink>
                  <ButtonLink
                    href="/app/chat"
                    variant="secondary"
                    className="!h-10 !rounded-xl border border-border bg-white px-4"
                  >
                    <ChatIcon className="mr-1.5 h-4 w-4" />
                    Talk to your AI
                  </ButtonLink>
                </>
              )}
            </div>
          ) : (
            <div className="mt-5 flex gap-2.5" aria-hidden>
              <span className="h-10 w-36 animate-pulse rounded-xl bg-[var(--atmosphere-1)]" />
              <span className="h-10 w-36 animate-pulse rounded-xl bg-[var(--atmosphere-1)]" />
            </div>
          )}
        </div>

        <motion.div
          className="relative hidden w-[200px] shrink-0 justify-self-end lg:block xl:w-[220px]"
          animate={idle}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }
          aria-hidden
        >
          <Image
            src="/dashboard/chat-companion-3d-v2.png"
            alt=""
            width={420}
            height={420}
            className="h-auto w-full select-none drop-shadow-[0_18px_28px_rgba(15,31,28,0.14)]"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}

function PublicLinkLine({
  published,
  username,
  publicPath,
  publicHost,
}: {
  published: boolean;
  username: string | null | undefined;
  publicPath: string;
  publicHost: string;
}) {
  if (!username || !publicPath) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
        <LinkIcon className="h-4 w-4 shrink-0" />
        <Link
          href="/app/profile"
          className="font-medium text-accent hover:text-accent-hover"
        >
          Choose your public link name
        </Link>
      </p>
    );
  }
  const display = `${publicHost}${publicPath}`;
  if (!published) {
    return (
      <p className="mt-3 inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <LinkIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{display}</span>
        <span className="text-xs">· not live until you publish</span>
      </p>
    );
  }
  return (
    <Link
      href={publicPath}
      className="mt-3 inline-flex min-w-0 max-w-full items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover"
    >
      <LinkIcon className="h-4 w-4 shrink-0" />
      <span className="truncate">{display}</span>
      <ExternalIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
    </Link>
  );
}

function SetupProgress({
  done,
  total,
  score,
  nextStep,
}: {
  done: number;
  total: number;
  score: number;
  nextStep: SetupNextStep | null;
}) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="mt-4 max-w-md">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {done} of {total} setup steps done
          {nextStep ? (
            <>
              {" "}
              · Next:{" "}
              <Link
                href={nextStep.href}
                className="font-medium text-fg hover:text-accent"
              >
                {nextStep.label}
              </Link>
            </>
          ) : null}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--atmosphere-1)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
