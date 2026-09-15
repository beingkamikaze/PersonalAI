"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button } from "@/components/ui/button";
import { EditableField } from "@/components/ui/editable-field";
import {
  getSessionUser,
  notifyAccountChanged,
  type SessionUser,
} from "@/lib/auth";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import {
  ApiError,
  apiFetch,
  apiUpload,
  type AiProfile,
  type Personality,
} from "@/lib/api";
import {
  draftsEqual,
  personalityDraftFrom,
  profileDraftFrom,
  type PersonalityDraft,
  type ProfileDraft,
} from "@/lib/profile-forms";

/**
 * Profile — who you are and how the AI represents you.
 * Public link, publish, and delete live on `/app/settings`.
 */
export default function ProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [savedProfile, setSavedProfile] = useState<ProfileDraft | null>(null);
  const [savedPersonality, setSavedPersonality] =
    useState<PersonalityDraft | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: "",
    headline: "",
    bio: "",
  });
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
  const [profileLock, setProfileLock] = useState(0);
  const [personalityLock, setPersonalityLock] = useState(0);

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
        const nextProfile = profileDraftFrom(me);
        setSavedProfile(nextProfile);
        setProfileDraft(nextProfile);
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
          router.replace("/sign-in?next=/app/profile");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/create");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const profileDirty =
    savedProfile !== null && !draftsEqual(profileDraft, savedProfile);
  const personalityDirty =
    savedPersonality !== null &&
    !draftsEqual(personalityDraft, savedPersonality);
  const hasUnsaved = profileDirty || personalityDirty;

  const unsavedDetail = useMemo(() => {
    const actions: string[] = [];
    if (profileDirty) actions.push("Save profile");
    if (personalityDirty) actions.push("Save personality");
    if (actions.length === 0) return "";
    if (actions.length === 1) {
      return `You changed a field. Click ${actions[0]} before leaving this page.`;
    }
    return `You have unsaved edits. Click ${actions.join(", then ")} before leaving this page.`;
  }, [profileDirty, personalityDirty]);

  const { open, stay, leaveWithoutSaving } = useLeaveGuard(hasUnsaved);

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
          name: profileDraft.name.trim(),
          headline: profileDraft.headline.trim() || null,
          bio: profileDraft.bio.trim() || null,
        }),
      });
      setProfile(updated);
      const next = profileDraftFrom(updated);
      setSavedProfile(next);
      setProfileDraft(next);
      setProfileLock((n) => n + 1);
      notifyAccountChanged();
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarSelect(file: File) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiUpload<AiProfile>(
        `/ai/${profile.id}/avatar`,
        file,
      );
      setProfile(updated);
      notifyAccountChanged();
      setMessage("Photo updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Photo upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarRemove() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}/avatar`, {
        method: "DELETE",
      });
      setProfile(updated);
      notifyAccountChanged();
      setMessage("Photo removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove photo");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.name || account?.name || "You";
  const avatarSrc = profile?.avatar_url;

  return (
    <ScreenIntro
      title="Profile"
      description="Who you are and how the AI represents you. Click the pencil to edit a field, then save that section. Photo saves as soon as you pick a file."
    >
      <div className="mb-10">
        {profile ? (
          <AvatarPicker
            variant="identity"
            name={displayName}
            src={avatarSrc}
            busy={saving}
            details={
              <>
                <p className="text-fg">{displayName}</p>
                <p className="truncate text-sm text-muted">
                  {account?.email ?? "Signed in"}
                  {` · ${profile.visibility}`}
                </p>
              </>
            }
            onSelect={(file) => void onAvatarSelect(file)}
            onRemove={
              profile.avatar_url ? () => void onAvatarRemove() : undefined
            }
            onError={setError}
          />
        ) : (
          <div className="min-w-0">
            <p className="text-fg">{displayName}</p>
            <p className="truncate text-sm text-muted">
              {account?.email ?? "Signed in"}
            </p>
          </div>
        )}
      </div>

      {profile ? (
        <form onSubmit={onSaveProfile} className="mb-10 space-y-4">
          <h2 className="font-display text-xl text-fg">Your AI profile</h2>
          <p className="text-sm text-muted">
            Name, headline, and bio visitors see on your public page.
          </p>
          <EditableField
            label="Name"
            value={profileDraft.name}
            lockVersion={profileLock}
            onChange={(name) => setProfileDraft({ ...profileDraft, name })}
          />
          <EditableField
            label="Headline"
            value={profileDraft.headline}
            lockVersion={profileLock}
            onChange={(headline) =>
              setProfileDraft({ ...profileDraft, headline })
            }
          />
          <EditableField
            label="Bio"
            value={profileDraft.bio}
            lockVersion={profileLock}
            multiline
            onChange={(bio) => setProfileDraft({ ...profileDraft, bio })}
          />
          {profileDirty ? (
            <p className="text-sm text-fg">
              Unsaved — click Save profile before leaving.
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={saving || !profileDraft.name.trim() || !profileDirty}
          >
            Save profile
          </Button>
        </form>
      ) : null}

      {personality ? (
        <form onSubmit={onSavePersonality} className="space-y-5">
          <h2 className="font-display text-xl text-fg">Personality</h2>
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

          {personalityDirty ? (
            <p className="text-sm text-fg">
              Unsaved — click Save personality before leaving.
            </p>
          ) : null}
          <Button type="submit" disabled={saving || !personalityDirty}>
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

      <UnsavedChangesDialog
        open={open}
        detail={unsavedDetail}
        onStay={stay}
        onLeave={leaveWithoutSaving}
      />
    </ScreenIntro>
  );
}
