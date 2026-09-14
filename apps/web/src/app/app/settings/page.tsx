"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button, ButtonLink } from "@/components/ui/button";
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

type ProfileDraft = {
  name: string;
  headline: string;
  bio: string;
};

type PublicDraft = {
  username: string;
  contactEmail: string;
  calendarLink: string;
};

type PersonalityDraft = {
  communication_style: string;
  formality: string;
  humor: string;
  verbosity: string;
  directness: string;
  traits: string;
};

function profileDraftFrom(me: AiProfile): ProfileDraft {
  return {
    name: me.name,
    headline: me.headline ?? "",
    bio: me.bio ?? "",
  };
}

function publicDraftFrom(me: AiProfile): PublicDraft {
  return {
    username: me.username ?? "",
    contactEmail: me.contact_email ?? "",
    calendarLink: me.calendar_link ?? "",
  };
}

function personalityDraftFrom(p: Personality): PersonalityDraft {
  return {
    communication_style: p.communication_style ?? "",
    formality: p.formality ?? "",
    humor: p.humor ?? "",
    verbosity: p.verbosity ?? "",
    directness: p.directness ?? "",
    traits: (p.traits ?? []).map(String).join(", "),
  };
}

function draftsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Profile — public identity, personality, and publish (Phase 1 + 4).
 * Route stays `/app/settings` (MVP screen list).
 * Fields load from the DB; each section must be saved before leaving.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [savedProfile, setSavedProfile] = useState<ProfileDraft | null>(null);
  const [savedPublic, setSavedPublic] = useState<PublicDraft | null>(null);
  const [savedPersonality, setSavedPersonality] =
    useState<PersonalityDraft | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: "",
    headline: "",
    bio: "",
  });
  const [publicDraft, setPublicDraft] = useState<PublicDraft>({
    username: "",
    contactEmail: "",
    calendarLink: "",
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
  const [publicLock, setPublicLock] = useState(0);
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
        const nextPublic = publicDraftFrom(me);
        setSavedProfile(nextProfile);
        setSavedPublic(nextPublic);
        setProfileDraft(nextProfile);
        setPublicDraft(nextPublic);
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
  const publicDirty =
    savedPublic !== null && !draftsEqual(publicDraft, savedPublic);
  const personalityDirty =
    savedPersonality !== null &&
    !draftsEqual(personalityDraft, savedPersonality);
  const hasUnsaved = profileDirty || publicDirty || personalityDirty;

  const unsavedDetail = useMemo(() => {
    const actions: string[] = [];
    if (profileDirty) actions.push("Save profile");
    if (publicDirty) actions.push("Save public settings");
    if (personalityDirty) actions.push("Save personality");
    if (actions.length === 0) return "";
    if (actions.length === 1) {
      return `You changed a field. Click ${actions[0]} before leaving this page.`;
    }
    return `You have unsaved edits. Click ${actions.join(", then ")} before leaving this page.`;
  }, [profileDirty, publicDirty, personalityDirty]);

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
          username: publicDraft.username.trim().toLowerCase() || null,
          contact_email: publicDraft.contactEmail.trim() || null,
          calendar_link: publicDraft.calendarLink.trim() || null,
        }),
      });
      setProfile(updated);
      const next = publicDraftFrom(updated);
      setSavedPublic(next);
      setPublicDraft(next);
      setPublicLock((n) => n + 1);
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
          username: publicDraft.username.trim().toLowerCase() || undefined,
          contact_email: publicDraft.contactEmail.trim() || null,
          calendar_link: publicDraft.calendarLink.trim() || null,
        }),
      });
      setProfile(updated);
      const nextPublic = publicDraftFrom(updated);
      setSavedPublic(nextPublic);
      setPublicDraft(nextPublic);
      setPublicLock((n) => n + 1);
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
      description="Who you are, how the AI represents you, and publish state. Click the pencil to edit a field, then save that section. Photo saves as soon as you pick a file."
    >
      <div className="mb-10 space-y-4">
        <div className="min-w-0">
          <p className="text-fg">{displayName}</p>
          <p className="truncate text-sm text-muted">
            {account?.email ?? "Signed in"}
            {profile ? ` · ${profile.visibility}` : null}
          </p>
        </div>
        {profile ? (
          <AvatarPicker
            name={displayName}
            src={avatarSrc}
            busy={saving}
            onSelect={(file) => void onAvatarSelect(file)}
            onRemove={profile.avatar_url ? () => void onAvatarRemove() : undefined}
            onError={setError}
          />
        ) : null}
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

      <form onSubmit={onSavePublic} className="mb-10 space-y-4">
        <h2 className="font-display text-xl text-fg">Public link</h2>
        <EditableField
          label="Username"
          value={publicDraft.username}
          lockVersion={publicLock}
          onChange={(username) =>
            setPublicDraft({ ...publicDraft, username })
          }
        />
        <EditableField
          label="Contact email"
          value={publicDraft.contactEmail}
          lockVersion={publicLock}
          onChange={(contactEmail) =>
            setPublicDraft({ ...publicDraft, contactEmail })
          }
        />
        <EditableField
          label="Calendar link"
          value={publicDraft.calendarLink}
          lockVersion={publicLock}
          onChange={(calendarLink) =>
            setPublicDraft({ ...publicDraft, calendarLink })
          }
        />
        {publicDirty ? (
          <p className="text-sm text-fg">
            Unsaved — click Save public settings before leaving.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || !publicDirty}>
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
