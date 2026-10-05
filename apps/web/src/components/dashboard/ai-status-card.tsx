"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { motion, type Variants } from "motion/react";
import { useHydratedReducedMotion } from "@/lib/motion";
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
  actionsPending = false,
  setupUnknown = false,
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
  /** Profile is visible, but the draft next-step still depends on analytics. */
  actionsPending?: boolean;
  /** Analytics failed, so the draft primary action must not guess "Publish". */
  setupUnknown?: boolean;
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
  const reduceMotion = useHydratedReducedMotion();
  const reduce = !!reduceMotion;
  const aiName = possessiveAiName(name);
  const setupDone =
    completeness !== null && completeness.done >= completeness.total;
  const showSetupProgress = !loading && completeness !== null && !setupDone;
  const actionsAt = showSetupProgress ? 1.92 : 1.7;
  const entrance = useMemo(
    () => ({
      status: beat(reduce, "rise", 0.46),
      name: beat(reduce, "rise", 0.68),
      badge: beat(reduce, "pop", 0.9),
      description: beat(reduce, "fade", 1.12),
      link: beat(reduce, "slide", 1.34),
      progress: beat(reduce, "fade", 1.56),
      actions: actionGroup(reduce, actionsAt),
      action: actionChild(reduce),
    }),
    [reduce, actionsAt],
  );

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
          {loading ? (
            <p className="inline-flex items-center gap-2 text-[13px] font-medium text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
              Checking your AI…
            </p>
          ) : (
            <motion.p
              className={`inline-flex items-center gap-2 text-[13px] font-medium ${
                published ? "text-accent" : "text-muted"
              }`}
              {...entrance.status}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  published ? "bg-accent" : "bg-[#b45309]"
                }`}
                aria-hidden
              />
              {published ? "Your AI is live" : "Your AI is not public yet"}
            </motion.p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {loading ? (
              <h1
                id="ai-status-title"
                className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em] text-fg sm:text-[2.5rem]"
              >
                <span className="inline-block h-9 w-48 animate-pulse rounded-lg bg-[var(--atmosphere-1)] align-middle" />
              </h1>
            ) : (
              <>
                <motion.h1
                  id="ai-status-title"
                  className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em] text-fg sm:text-[2.5rem]"
                  {...entrance.name}
                >
                  {aiName}
                </motion.h1>
                <motion.span className="inline-flex origin-center" {...entrance.badge}>
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
                </motion.span>
              </>
            )}
          </div>

          {loading ? (
            <p className="mt-3 max-w-xl text-[15px] leading-6 text-muted">
              <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded bg-[var(--atmosphere-1)]" />
            </p>
          ) : (
            <motion.p
              className="mt-3 max-w-xl text-[15px] leading-6 text-muted"
              {...entrance.description}
            >
              {headline?.trim() ? (
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
            </motion.p>
          )}

          {!loading ? (
            <motion.div {...entrance.link}>
              <PublicLinkLine
                published={published}
                username={username}
                publicPath={publicPath}
                publicHost={publicHost}
              />
            </motion.div>
          ) : null}

          {showSetupProgress && completeness ? (
            <motion.div {...entrance.progress}>
              <SetupProgress
                done={completeness.done}
                total={completeness.total}
                score={completeness.score}
                nextStep={nextStep}
              />
            </motion.div>
          ) : null}

          {!loading && !actionsPending ? (
            <motion.div
              className="mt-5 flex flex-wrap items-center gap-2.5"
              initial={reduce ? false : "hidden"}
              animate="visible"
              variants={entrance.actions}
            >
              {published ? (
                <>
                  <motion.div className="inline-flex" variants={entrance.action}>
                    <ButtonLink href="/app/chat" className="!h-10 !rounded-xl px-4">
                      <ChatIcon className="mr-1.5 h-4 w-4" />
                      Talk to your AI
                      <ChevronRightIcon className="ml-1 h-3.5 w-3.5 opacity-90" />
                    </ButtonLink>
                  </motion.div>
                  {username ? (
                    <motion.div className="inline-flex" variants={entrance.action}>
                      <ButtonLink
                        href={`/u/${username}`}
                        variant="secondary"
                        className="!h-10 !rounded-xl border border-border bg-white px-4"
                      >
                        <ExternalIcon className="mr-1.5 h-4 w-4" />
                        Open public page
                      </ButtonLink>
                    </motion.div>
                  ) : null}
                  {publicPath ? (
                    <motion.div className="inline-flex" variants={entrance.action}>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!h-10 !rounded-xl border border-border bg-white px-4"
                        onClick={onCopyLink}
                      >
                        <CopyIcon className="mr-1.5 h-4 w-4" />
                        {copied ? "Copied!" : "Copy link"}
                      </Button>
                    </motion.div>
                  ) : null}
                </>
              ) : setupUnknown ? (
                <motion.div className="inline-flex" variants={entrance.action}>
                  <ButtonLink href="/app/chat" className="!h-10 !rounded-xl px-4">
                    <ChatIcon className="mr-1.5 h-4 w-4" />
                    Talk to your AI
                  </ButtonLink>
                </motion.div>
              ) : (
                <>
                  <motion.div className="inline-flex" variants={entrance.action}>
                    <ButtonLink
                      href={nextStep?.href ?? "/onboarding/publish"}
                      className="!h-10 !rounded-xl px-4"
                    >
                      {nextStep ? "Continue setup" : "Publish your AI"}
                      <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5 opacity-90" />
                    </ButtonLink>
                  </motion.div>
                  <motion.div className="inline-flex" variants={entrance.action}>
                    <ButtonLink
                      href="/app/chat"
                      variant="secondary"
                      className="!h-10 !rounded-xl border border-border bg-white px-4"
                    >
                      <ChatIcon className="mr-1.5 h-4 w-4" />
                      Talk to your AI
                    </ButtonLink>
                  </motion.div>
                </>
              )}
            </motion.div>
          ) : (
            <div className="mt-5 flex gap-2.5" aria-hidden>
              <span className="h-10 w-36 animate-pulse rounded-xl bg-[var(--atmosphere-1)]" />
              <span className="h-10 w-36 animate-pulse rounded-xl bg-[var(--atmosphere-1)]" />
            </div>
          )}
        </div>

        {loading ? (
          <div
            className="hidden aspect-square w-[200px] shrink-0 lg:block xl:w-[220px]"
            aria-hidden
          />
        ) : (
          <Companion reduce={reduce} />
        )}
      </div>
    </section>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

type BeatKind = "rise" | "fade" | "slide" | "pop";

/** One step of the hero entrance. Mounted only after the card has real data. */
function beat(reduce: boolean, kind: BeatKind, delay: number) {
  if (reduce) {
    return {
      initial: false as const,
      animate: { opacity: 1, x: 0, y: 0, scale: 1 },
      transition: { duration: 0 },
    };
  }
  if (kind === "fade") {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { delay, duration: 0.5, ease: EASE },
    };
  }
  if (kind === "slide") {
    return {
      initial: { opacity: 0, x: -18 },
      animate: { opacity: 1, x: 0 },
      transition: { delay, duration: 0.5, ease: EASE },
    };
  }
  if (kind === "pop") {
    return {
      initial: { opacity: 0, scale: 0.55 },
      animate: { opacity: 1, scale: 1 },
      transition: {
        delay,
        type: "spring" as const,
        stiffness: 520,
        damping: 16,
        mass: 0.62,
      },
    };
  }
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.48, ease: EASE },
  };
}

function actionGroup(reduce: boolean, delayChildren: number): Variants {
  return {
    hidden: {},
    visible: {
      transition: reduce
        ? { duration: 0 }
        : { delayChildren, staggerChildren: 0.1 },
    },
  };
}

function actionChild(reduce: boolean): Variants {
  return {
    hidden: reduce ? {} : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduce
        ? { duration: 0 }
        : { duration: 0.4, ease: EASE },
    },
  };
}

function Companion({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      className="relative hidden w-[200px] shrink-0 justify-self-end lg:block xl:w-[220px]"
      initial={reduce ? false : { opacity: 0, x: 84, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.78, ease: [0.16, 1, 0.3, 1] }
      }
      aria-hidden
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.78,
              }
        }
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
    </motion.div>
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
