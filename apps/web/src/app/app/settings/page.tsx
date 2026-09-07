"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type Personality,
} from "@/lib/api";

/**
 * Settings + simple personality editor (Phase 1).
 * Profile publish/delete remain Phase 4 scaffolds.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfile(me);
        try {
          const p = await apiFetch<Personality>(`/ai/${me.id}/personality`);
          if (!cancelled) setPersonality(p);
        } catch (err) {
          // 404 until interview is done — that's OK
          if (!(err instanceof ApiError && err.status === 404) && !cancelled) {
            setError(err instanceof Error ? err.message : "Failed to load personality");
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app/settings");
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

  return (
    <ScreenIntro
      title="Settings"
      description="Edit personality from your interview. Publish controls come in Phase 4."
    >
      {profile ? (
        <p className="mb-6 text-sm text-muted">
          Profile: <span className="text-fg">{profile.name}</span>
          {profile.headline ? ` — ${profile.headline}` : null}
        </p>
      ) : null}

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
