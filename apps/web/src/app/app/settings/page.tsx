"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import { EditableField } from "@/components/ui/editable-field";
import {
  getSessionUser,
  signOut,
  type SessionUser,
} from "@/lib/auth";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { ApiError, apiFetch, type AiProfile, type Personality } from "@/lib/api";
import {
  draftsEqual,
  personalityDraftFrom,
  type PersonalityDraft,
} from "@/lib/profile-forms";

/**
 * Settings — personality tone and account deletion.
 * Interview / Known facts are editable on `/app/profile` (About you).
 */
export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [savedPersonality, setSavedPersonality] =
    useState<PersonalityDraft | null>(null);
  const [personalityDraft, setPersonalityDraft] = useState<PersonalityDraft>({
    communication_style: "",
    formality: "",
    humor: "",
    verbosity: "",
    directness: "",
    traits: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [personalityLock, setPersonalityLock] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

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
        try {
          const p = await apiFetch<Personality>(`/ai/${me.id}/personality`);
          if (cancelled) return;
          setPersonality(p);
          const nextPersonality = personalityDraftFrom(p);
          setSavedPersonality(nextPersonality);
          setPersonalityDraft(nextPersonality);
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
          router.replace("/onboarding/create");
          return;
        }
        const fallback =
          err instanceof TypeError ||
          (err instanceof Error && err.message === "Failed to fetch")
            ? "Can't reach the API. Keep npm run dev:api running, then refresh."
            : err instanceof Error
              ? err.message
              : "Failed to load settings";
        setError(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const personalityDirty =
    savedPersonality !== null &&
    !draftsEqual(personalityDraft, savedPersonality);
  const { open, stay, leaveWithoutSaving } = useLeaveGuard(personalityDirty);

  const unsavedDetail = useMemo(() => {
    if (!personalityDirty) return "";
    return "You changed a field. Click Save personality before leaving this page.";
  }, [personalityDirty]);

  const confirmHint = account?.email || "DELETE";
  const confirmMatches =
    confirmText.trim().toLowerCase() === confirmHint.trim().toLowerCase();

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
            communication_style:
              personalityDraft.communication_style.trim() || null,
            formality: personalityDraft.formality.trim() || null,
            humor: personalityDraft.humor.trim() || null,
            verbosity: personalityDraft.verbosity.trim() || null,
            directness: personalityDraft.directness.trim() || null,
            traits: personalityDraft.traits
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          }),
        },
      );
      setPersonality(updated);
      const next = personalityDraftFrom(updated);
      setSavedPersonality(next);
      setPersonalityDraft(next);
      setPersonalityLock((n) => n + 1);
      setMessage("Personality saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount(e: FormEvent) {
    e.preventDefault();
    if (!confirmMatches || deleting) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: confirmText.trim() }),
      });
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  return (
    <ScreenIntro
      title="Settings"
      description="How the AI talks: communication style, formality, humor, verbosity, directness, and traits. Interview facts are on Profile. Account deletion is at the bottom."
    >
      {error ? (
        <p className="mb-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mb-6 text-sm text-accent">{message}</p> : null}

      <form onSubmit={onSavePersonality} className="mb-10 space-y-5">
        <h2 className="font-display text-xl text-fg">Personality</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading saved values…</p>
        ) : null}
        <EditableField
          label="Communication style"
          value={personalityDraft.communication_style}
          lockVersion={personalityLock}
          onChange={(communication_style) =>
            setPersonalityDraft({
              ...personalityDraft,
              communication_style,
            })
          }
        />
        <EditableField
          label="Formality"
          value={personalityDraft.formality}
          lockVersion={personalityLock}
          onChange={(formality) =>
            setPersonalityDraft({ ...personalityDraft, formality })
          }
        />
        <EditableField
          label="Humor"
          value={personalityDraft.humor}
          lockVersion={personalityLock}
          onChange={(humor) =>
            setPersonalityDraft({ ...personalityDraft, humor })
          }
        />
        <EditableField
          label="Verbosity"
          value={personalityDraft.verbosity}
          lockVersion={personalityLock}
          onChange={(verbosity) =>
            setPersonalityDraft({ ...personalityDraft, verbosity })
          }
        />
        <EditableField
          label="Directness"
          value={personalityDraft.directness}
          lockVersion={personalityLock}
          onChange={(directness) =>
            setPersonalityDraft({ ...personalityDraft, directness })
          }
        />
        <EditableField
          label="Traits (comma-separated)"
          value={personalityDraft.traits}
          lockVersion={personalityLock}
          onChange={(traits) =>
            setPersonalityDraft({ ...personalityDraft, traits })
          }
        />

        {!loading && !personality ? (
          <p className="text-sm text-muted">
            Complete the onboarding interview to unlock Save personality.
          </p>
        ) : null}
        {personalityDirty ? (
          <p className="text-sm text-fg">
            Unsaved — click Save personality before leaving.
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={saving || loading || !personality || !personalityDirty}
        >
          {saving ? "Saving…" : "Save personality"}
        </Button>
      </form>

      <form
        onSubmit={onDeleteAccount}
        className="space-y-4 border-t border-border pt-10"
      >
        <h2 className="font-display text-xl text-fg">Delete account</h2>
        <p className="text-sm text-muted">
          Permanently removes your AI, knowledge, memories, conversations, and
          login. This cannot be undone. Unpublish from Profile if you only want
          to hide the public page.
        </p>
        <label className="block">
          <span className="text-sm font-medium text-fg">
            Type {confirmHint} to confirm
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-fg"
          />
        </label>
        <Button
          type="submit"
          variant="danger"
          disabled={deleting || !confirmMatches}
        >
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
      </form>

      <UnsavedChangesDialog
        open={open}
        detail={unsavedDetail}
        onStay={stay}
        onLeave={leaveWithoutSaving}
      />
    </ScreenIntro>
  );
}
