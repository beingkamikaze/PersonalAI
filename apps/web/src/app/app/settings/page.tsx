"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { UserAvatar } from "@/components/user-avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  getSessionUser,
  notifyAccountChanged,
  type SessionUser,
} from "@/lib/auth";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type Personality,
} from "@/lib/api";

/**
 * Settings — account identity + AI profile + personality + publish (Phase 1 + 4).
 */
export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [calendarLink, setCalendarLink] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSessionUser();
        if (cancelled) return;
        setAccount(session);
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        setName(me.name);
        setHeadline(me.headline ?? "");
        setBio(me.bio ?? "");
        setUsername(me.username ?? "");
        setContactEmail(me.contact_email ?? "");
        setCalendarLink(me.calendar_link ?? "");
        try {
          const p = await apiFetch<Personality>(`/ai/${me.id}/personality`);
          if (!cancelled) setPersonality(p);
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404) && !cancelled) {
            setError(
              err instanceof Error ? err.message : "Failed to load personality",
            );
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app/settings");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSavePersonality(e: FormEvent) {
    e.preventDefault();
    if (!profile || !personality) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<Personality>(
        `/ai/${profile.id}/personality`,
        {
          method: "PATCH",
          body: JSON.stringify({
            communication_style: personality.communication_style,
            formality: personality.formality,
            humor: personality.humor,
            verbosity: personality.verbosity,
            directness: personality.directness,
            traits: personality.traits,
          }),
        },
      );
      setPersonality(updated);
      setMessage("Personality saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setProfile(updated);
      setName(updated.name);
      setHeadline(updated.headline ?? "");
      setBio(updated.bio ?? "");
      notifyAccountChanged();
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSavePublic(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          username: username.trim().toLowerCase() || null,
          contact_email: contactEmail.trim() || null,
          calendar_link: calendarLink.trim() || null,
        }),
      });
      setProfile(updated);
      setUsername(updated.username ?? "");
      setContactEmail(updated.contact_email ?? "");
      setCalendarLink(updated.calendar_link ?? "");
      notifyAccountChanged();
      setMessage("Public settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          username: username.trim().toLowerCase() || undefined,
          contact_email: contactEmail.trim() || null,
          calendar_link: calendarLink.trim() || null,
        }),
      });
      setProfile(updated);
      notifyAccountChanged();
      setMessage("Published.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  async function onUnpublish() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(
        `/ai/${profile.id}/unpublish`,
        { method: "POST", body: "{}" },
      );
      setProfile(updated);
      notifyAccountChanged();
      setMessage("Unpublished — page is no longer public.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unpublish failed");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.name || account?.name || "You";
  const avatarSrc = profile?.avatar_url || account?.avatarUrl;

  return (
    <ScreenIntro
      title="Settings"
      description="Who you are, how the AI represents you, and publish state."
    >
      <div className="mb-10 flex items-center gap-4">
        <UserAvatar name={displayName} src={avatarSrc} size="md" />
        <div className="min-w-0">
          <p className="text-fg">{displayName}</p>
          <p className="truncate text-sm text-muted">
            {account?.email ?? "Signed in"}
            {profile ? ` · ${profile.visibility}` : null}
          </p>
        </div>
      </div>

      {profile ? (
        <form onSubmit={onSaveProfile} className="mb-10 space-y-4">
          <h2 className="font-display text-xl text-fg">Your AI profile</h2>
          <p className="text-sm text-muted">
            Name, headline, and bio visitors see on your public page.
          </p>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Headline" value={headline} onChange={setHeadline} />
          <div>
            <label htmlFor="bio" className="text-sm font-medium text-fg">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
              className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <Button type="submit" disabled={saving || !name.trim()}>
            Save profile
          </Button>
        </form>
      ) : null}

      <form onSubmit={onSavePublic} className="mb-10 space-y-4">
        <h2 className="font-display text-xl text-fg">Public link</h2>
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
        />
        <Field
          label="Contact email"
          value={contactEmail}
          onChange={setContactEmail}
        />
        <Field
          label="Calendar link"
          value={calendarLink}
          onChange={setCalendarLink}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            Save public settings
          </Button>
          {profile?.visibility === "published" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void onUnpublish()}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void onPublish()}
            >
              Publish
            </Button>
          )}
          {profile?.username ? (
            <ButtonLink href={`/u/${profile.username}`} variant="ghost">
              Open /u/{profile.username}
            </ButtonLink>
          ) : null}
        </div>
      </form>

      {personality ? (
        <form onSubmit={onSavePersonality} className="space-y-5">
          <h2 className="font-display text-xl text-fg">Personality</h2>
          <Field
            label="Communication style"
            value={personality.communication_style ?? ""}
            onChange={(v) =>
              setPersonality({ ...personality, communication_style: v || null })
            }
          />
          <Field
            label="Formality"
            value={personality.formality ?? ""}
            onChange={(v) =>
              setPersonality({ ...personality, formality: v || null })
            }
          />
          <Field
            label="Humor"
            value={personality.humor ?? ""}
            onChange={(v) =>
              setPersonality({ ...personality, humor: v || null })
            }
          />
          <Field
            label="Verbosity"
            value={personality.verbosity ?? ""}
            onChange={(v) =>
              setPersonality({ ...personality, verbosity: v || null })
            }
          />
          <Field
            label="Directness"
            value={personality.directness ?? ""}
            onChange={(v) =>
              setPersonality({ ...personality, directness: v || null })
            }
          />
          <Field
            label="Traits (comma-separated)"
            value={(personality.traits ?? []).map(String).join(", ")}
            onChange={(v) =>
              setPersonality({
                ...personality,
                traits: v
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />

          {personality.facts.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-fg">Facts from interview</p>
              <ul className="mt-2 divide-y divide-border border-t border-border text-sm text-muted">
                {personality.facts.map((f) => (
                  <li key={f.key} className="py-2">
                    <span className="text-fg">{f.key}</span>: {f.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save personality"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Complete the onboarding interview to unlock the personality editor.
        </p>
      )}

      {message ? <p className="mt-4 text-sm text-accent">{message}</p> : null}
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </ScreenIntro>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
