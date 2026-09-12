"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type AnalyticsSummary,
} from "@/lib/api";

const CHECKLIST_LABELS: Record<string, string> = {
  profile_basics: "Name / headline",
  interview_completed: "Interview completed",
  personality: "Personality saved",
  knowledge_ready: "At least one knowledge source ready",
  has_memory: "At least one memory",
  username_set: "Username chosen",
  published: "Published",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        const summary = await apiFetch<AnalyticsSummary>(
          `/ai/${me.id}/analytics/summary`,
        );
        if (!cancelled) setStats(summary);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/create");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fullLink = useMemo(() => {
    if (!stats?.public_url_path || typeof window === "undefined") return "";
    return `${window.location.origin}${stats.public_url_path}`;
  }, [stats?.public_url_path]);

  const nextStep = useMemo(() => {
    const c = stats?.completeness_checklist;
    if (!c) return null;
    if (!c.interview_completed)
      return { href: "/onboarding/interview", label: "Finish interview" };
    if (!c.knowledge_ready)
      return { href: "/onboarding/knowledge", label: "Add knowledge" };
    if (!c.published)
      return { href: "/onboarding/publish", label: "Publish your link" };
    return null;
  }, [stats?.completeness_checklist]);

  async function copyLink() {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setMessage("Public link copied.");
    } catch {
      setMessage("Copy failed — open Share to copy manually.");
    }
  }

  const statusLabel =
    stats?.visibility === "published"
      ? "Published"
      : profile
        ? "Draft"
        : "—";

  return (
    <ScreenIntro
      title="Dashboard"
      description="Status, completeness, visits, and quick actions to Share or Test."
    >
      <dl className="grid gap-6 sm:grid-cols-3">
        <Stat label="Status" value={statusLabel} />
        <Stat
          label="Completeness"
          value={
            stats ? `${stats.completeness_score}%` : profile ? "—" : "…"
          }
        />
        <Stat
          label="Visits (7d)"
          value={stats ? String(stats.visits_7d) : "…"}
        />
      </dl>

      {stats ? (
        <p className="mt-4 text-sm text-muted">
          Today: {stats.visits_today} visits · {stats.conversations_7d} public
          conversations (7d) · {stats.messages_7d} public messages (7d)
        </p>
      ) : null}

      {stats ? (
        <p className="mt-2 text-sm text-muted">
          Free plan today: {stats.owner_chats_remaining}/
          {stats.owner_chats_limit} private chats left ·{" "}
          {stats.documents_remaining}/{stats.documents_limit} knowledge slots
          left
        </p>
      ) : null}

      {stats?.completeness_checklist ? (
        <ul className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
            const done = Boolean(stats.completeness_checklist?.[key]);
            return (
              <li key={key} className={done ? "text-fg" : "text-muted"}>
                {done ? "✓" : "○"} {label}
              </li>
            );
          })}
        </ul>
      ) : null}

      {nextStep ? (
        <p className="mt-6 text-sm text-fg">
          Next:{" "}
          <ButtonLink href={nextStep.href} variant="secondary">
            {nextStep.label}
          </ButtonLink>
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/app/chat">Test</ButtonLink>
        <ButtonLink href="/onboarding/publish" variant="secondary">
          Share
        </ButtonLink>
        {fullLink ? (
          <Button type="button" variant="ghost" onClick={() => void copyLink()}>
            Copy public link
          </Button>
        ) : null}
        {stats?.username ? (
          <ButtonLink href={`/u/${stats.username}`} variant="ghost">
            Open public page
          </ButtonLink>
        ) : null}
        <ButtonLink href="/feedback" variant="ghost">
          Send feedback
        </ButtonLink>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
    </ScreenIntro>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-fg">{value}</dd>
    </div>
  );
}
