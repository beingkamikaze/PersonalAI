"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type InterviewState,
} from "@/lib/api";
import { hasFinishedOnboarding } from "@/lib/auth";

/**
 * Fixed 10-question professional interview.
 * Each answer is sent to FastAPI, which calls OpenAI to structure personality/facts.
 */
export default function OnboardingInterviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [state, setState] = useState<InterviewState | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
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
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile || !state || !answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<InterviewState>(
        `/ai/${profile.id}/interview/answer`,
        {
          method: "POST",
          body: JSON.stringify({ answer: answer.trim() }),
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

  if (booting) {
    return (
      <ScreenIntro
        title="Professional interview"
        description="Starting your interview…"
      />
    );
  }

  const progressLabel =
    state && !state.completed
      ? `Question ${Math.min(state.current_index + 1, state.total_questions)} of ${state.total_questions}`
      : null;

  return (
    <ScreenIntro
      title="Professional interview"
      description="Answer a short fixed set of questions. We structure your answers into personality and facts — the browser never calls the LLM."
    >
      <OnboardingProgress step={2} />
      {progressLabel ? (
        <p className="mt-4 text-sm text-muted">{progressLabel}</p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded border border-border bg-elevated p-5">
        <p className="text-sm font-medium text-fg">
          {state?.question ?? "Interview complete."}
        </p>
        {state && !state.completed ? (
          <>
            <textarea
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer…"
              disabled={loading}
              className="w-full rounded border border-border bg-white px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading || !answer.trim()}>
                {loading ? "Saving…" : "Continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/onboarding/create")}
              >
                Back
              </Button>
            </div>
          </>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </ScreenIntro>
  );
}
