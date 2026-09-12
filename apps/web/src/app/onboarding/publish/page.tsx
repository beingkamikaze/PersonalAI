"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScreenIntro } from "@/components/screen-intro";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

/**
 * Onboarding publish step — set username, publish, copy share helpers.
 */
export default function OnboardingPublishPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [calendarLink, setCalendarLink] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        setUsername(me.username ?? "");
        setContactEmail(me.contact_email ?? "");
        setCalendarLink(me.calendar_link ?? "");
        setBio(me.bio ?? "");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/onboarding/publish");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const publicPath = useMemo(() => {
    const u = username.trim().toLowerCase();
    return u ? `/u/${u}` : null;
  }, [username]);

  const shareOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          contact_email: contactEmail.trim() || null,
          calendar_link: calendarLink.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setProfile(updated);
      setMessage("Published. Your public link is live.");
      if (updated.username) {
        router.push(`/u/${updated.username}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`Copied ${label}.`);
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  const fullLink = publicPath && shareOrigin ? `${shareOrigin}${publicPath}` : "";
  const linkedInBlurb = fullLink
    ? `Talk to my AI when I'm busy: ${fullLink}`
    : "";
  const emailSig = fullLink
    ? `Prefer async? Chat with my AI → ${fullLink}`
    : "";

  return (
    <ScreenIntro
      title="Publish your public link"
      description="Pick a username, add optional contact links, then publish and share."
    >
      <OnboardingProgress step={5} />
      <form onSubmit={onPublish} className="mt-8 space-y-5">
        <div>
          <label htmlFor="username" className="text-sm font-medium text-fg">
            Username
          </label>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span>/u/</span>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mayank"
              className="w-full rounded border border-border bg-elevated px-3 py-2.5 text-fg focus:border-accent focus:outline-none"
              disabled={busy}
              required
              minLength={3}
              maxLength={40}
              pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]|[a-zA-Z0-9]{3,}"
            />
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="text-sm font-medium text-fg">
            Short bio (optional)
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            disabled={busy}
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-fg">
            Contact email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            disabled={busy}
          />
        </div>

        <div>
          <label htmlFor="cal" className="text-sm font-medium text-fg">
            Calendar / booking link (optional)
          </label>
          <input
            id="cal"
            type="url"
            value={calendarLink}
            onChange={(e) => setCalendarLink(e.target.value)}
            placeholder="https://"
            className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            disabled={busy}
          />
        </div>

        <div className="rounded border border-border bg-elevated p-5">
          <p className="font-display text-xl text-fg">Preview</p>
          <p className="mt-2 text-sm text-muted">
            {profile?.name ?? "Your name"}
            {profile?.headline ? ` — ${profile.headline}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted">
            Public URL: {publicPath ?? "/u/…"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy || !username.trim()}>
            {busy ? "Publishing…" : "Publish & open preview"}
          </Button>
          <ButtonLink href="/app" variant="secondary">
            Go to dashboard
          </ButtonLink>
        </div>
      </form>

      {fullLink ? (
        <div className="mt-8 space-y-3 border-t border-border pt-6">
          <p className="text-sm font-medium text-fg">Share helpers</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyText("link", fullLink)}
            >
              Copy link
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyText("LinkedIn blurb", linkedInBlurb)}
            >
              Copy LinkedIn blurb
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyText("email signature", emailSig)}
            >
              Copy email signature
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
    </ScreenIntro>
  );
}
