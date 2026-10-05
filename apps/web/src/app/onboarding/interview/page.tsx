"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/dashboard-card";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type InterviewState,
} from "@/lib/api";
import { hasFinishedOnboarding } from "@/lib/auth";
import { isUiPreview } from "@/lib/env";
import { useHydratedReducedMotion } from "@/lib/motion";
import { PREVIEW_PROFILE } from "@/lib/ui-preview";

/** Mirrors `apps/api/app/interview_script.py` for UI preview only. */
const PREVIEW_QUESTIONS = [
  "What's your full name, and what should people call you?",
  "What's your current role, and what do you do day to day?",
  "What are your top skills or domains?",
  "What recent projects or outcomes are you proud of?",
  "Who usually reaches out to you (recruiters, clients, teammates)?",
  "How do you prefer to communicate (async, calls, short vs long messages)?",
  "What should your AI never say or invent about you?",
  "What opportunities are you open to right now?",
  "Is there anything people always misunderstand about your work?",
  "What's a one-line headline for your public page?",
] as const;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Fixed 10-question professional interview.
 * Answers save via FastAPI; LLM structuring runs in the background.
 */
export default function OnboardingInterviewPage() {
  const router = useRouter();
  const reduceMotion = useHydratedReducedMotion();
  const preview = isUiPreview();
  const [profile, setProfile] = useState<AiProfile | null>(() =>
    preview ? PREVIEW_PROFILE : null,
  );
  const [state, setState] = useState<InterviewState | null>(() =>
    preview ? previewState(0) : null,
  );
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(() => !preview);

  useEffect(() => {
    if (preview) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        const started = await apiFetch<InterviewState>(
          `/ai/${me.id}/interview/start`,
          { method: "POST" },
        );
        if (cancelled) return;
        setState(started);
        if (started.completed) {
          router.replace(
            hasFinishedOnboarding(me)
              ? "/app"
              : "/onboarding/knowledge",
          );
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/create");
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/onboarding/interview");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to start interview");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, router]);

  const bindAnswer = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (!node) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const delay = reduceMotion ? 40 : 340;
      window.setTimeout(() => {
        if (!node.isConnected) return;
        node.focus({ preventScroll: true });
      }, delay);
    },
    [reduceMotion],
  );

  async function submitTurn(opts: { skipped: boolean }) {
    if (!profile || !state) return;
    if (!opts.skipped && !answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (isUiPreview()) {
        const nextIndex = state.current_index + 1;
        const done = nextIndex >= PREVIEW_QUESTIONS.length;
        setState(done ? previewState(state.current_index, true) : previewState(nextIndex));
        setAnswer("");
        if (done) router.push("/onboarding/knowledge");
        return;
      }

      const next = await apiFetch<InterviewState>(
        `/ai/${profile.id}/interview/answer`,
        {
          method: "POST",
          body: JSON.stringify(
            opts.skipped
              ? { answer: "", skipped: true }
              : { answer: answer.trim(), skipped: false },
          ),
        },
      );
      setState(next);
      setAnswer("");
      if (next.completed) {
        router.push("/onboarding/knowledge");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitTurn({ skipped: false });
  }

  const active = state && !state.completed;
  const questionNumber = state
    ? Math.min(state.current_index + 1, state.total_questions)
    : 1;

  const container = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: reduceMotion
          ? { duration: 0 }
          : { staggerChildren: 0.08, delayChildren: 0.04 },
      },
    }),
    [reduceMotion],
  );
  const item = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: reduceMotion
          ? { duration: 0 }
          : { duration: 0.42, ease: EASE },
      },
    }),
    [reduceMotion],
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-[1040px]"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.header variants={item}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Interview
        </p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.12] tracking-[-0.02em] text-fg md:text-[2.5rem]">
          Let&apos;s teach your AI.
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted text-balance">
          A few questions about your work, how you communicate, and what your
          AI should know. Your answers help shape how it responds.
        </p>
      </motion.header>

      <motion.div className="mt-5" variants={item}>
        <OnboardingProgress step={2} />
      </motion.div>

      {booting ? (
        <motion.p className="mt-8 text-sm text-muted" variants={item}>
          Starting your interview…
        </motion.p>
      ) : (
        <motion.div
          className="mx-auto mt-8 w-full max-w-[920px]"
          variants={item}
        >
          {active ? (
            <div className="text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.current_index}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.32, ease: EASE }
                  }
                >
                  <p className="text-[13px] text-muted">
                    Question {questionNumber} of {state.total_questions}
                  </p>
                  <p className="mt-1 text-xs text-muted/80">About 3 minutes</p>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : null}

          <motion.form
            onSubmit={onSubmit}
            aria-busy={loading}
            className={`${DASHBOARD_CARD_CLASS} mt-4 px-5 py-7 sm:px-8 sm:py-8`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"
                aria-hidden
              >
                <SparkleIcon className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                Interview
              </p>
            </div>

            {active ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.current_index}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.32, ease: EASE }
                  }
                  className="mt-6"
                >
                  <h2
                    id="interview-question"
                    className="max-w-2xl font-display text-[1.55rem] leading-[1.28] tracking-[-0.02em] text-fg text-balance sm:text-[1.75rem]"
                  >
                    {state.question}
                  </h2>
                  <textarea
                    ref={bindAnswer}
                    id="interview-answer"
                    rows={5}
                    aria-labelledby="interview-question"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Your answer..."
                    disabled={loading}
                    className="mt-5 min-h-[148px] w-full resize-y rounded-xl border border-border bg-white px-4 py-3.5 text-[15px] leading-relaxed text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-[rgba(0,109,91,0.18)] disabled:opacity-60"
                  />
                </motion.div>
              </AnimatePresence>
            ) : state?.completed ? (
              <p className="mt-6 font-display text-[1.55rem] leading-snug tracking-[-0.02em] text-fg">
                Interview complete.
              </p>
            ) : null}

            {active ? (
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button
                  type="submit"
                  disabled={loading || !answer.trim()}
                  className="w-full gap-1.5 rounded-xl px-5 transition-[background-color,transform,box-shadow] duration-200 active:translate-y-px motion-reduce:transition-none sm:w-auto"
                >
                  {loading ? (
                    "Saving…"
                  ) : (
                    <>
                      Continue
                      <ChevronRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => void submitTurn({ skipped: true })}
                  className="px-1 text-muted hover:bg-transparent"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/onboarding/create")}
                  className="px-1 text-muted hover:bg-transparent"
                >
                  Back
                </Button>
              </div>
            ) : !active && error ? (
              <div className="mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/onboarding/create")}
                  className="px-1 text-muted hover:bg-transparent"
                >
                  Back
                </Button>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </motion.form>

          <p className="mt-4 text-center text-[13px] text-muted">
            You can edit these answers later.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function previewState(index: number, completed = false): InterviewState {
  return {
    session_id: "preview-session",
    status: completed ? "completed" : "in_progress",
    current_index: index,
    total_questions: PREVIEW_QUESTIONS.length,
    question: completed ? null : PREVIEW_QUESTIONS[index] ?? null,
    completed,
  };
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}
