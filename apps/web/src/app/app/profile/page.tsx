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
  type FactsResult,
  type Personality,
} from "@/lib/api";
import {
  draftsEqual,
  factLabel,
  factsDraftFrom,
  profileDraftFrom,
  publicDraftFrom,
  type FactsDraft,
  type ProfileDraft,
  type PublicDraft,
} from "@/lib/profile-forms";

/**
 * Profile — who you are, Known facts from interview, and publish state.
 * Personality tone + delete account stay on `/app/settings` (unchanged).
 */
export default function ProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<ProfileDraft | null>(null);
  const [savedPublic, setSavedPublic] = useState<PublicDraft | null>(null);
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
  // Interview / Known facts — always injected into chat prompts (see API prompt.py).
  const [factKeys, setFactKeys] = useState<string[]>([]);
  const [savedFacts, setSavedFacts] = useState<FactsDraft | null>(null);
  const [factsDraft, setFactsDraft] = useState<FactsDraft>({});
  const [factsLoaded, setFactsLoaded] = useState(false);
  const [factsLock, setFactsLock] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileLock, setProfileLock] = useState(0);
  const [publicLock, setPublicLock] = useState(0);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
        const nextPublic = publicDraftFrom(me);
        setSavedPublic(nextPublic);
        setPublicDraft(nextPublic);
        // Facts live on GET /personality; 404 = interview not done yet (not an error).
        try {
          const personality = await apiFetch<Personality>(
            `/ai/${me.id}/personality`,
          );
          if (cancelled) return;
          const nextFacts = factsDraftFrom(personality.facts);
          const keys = personality.facts.map((f) => f.key).filter(Boolean);
          setFactKeys(keys);
          setSavedFacts(nextFacts);
          setFactsDraft(nextFacts);
        } catch (factsErr) {
          if (
            !(factsErr instanceof ApiError && factsErr.status === 404) &&
            !cancelled
          ) {
            setError(
              factsErr instanceof Error
                ? factsErr.message
                : "Failed to load interview facts",
            );
          }
        } finally {
          if (!cancelled) setFactsLoaded(true);
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
        const fallback =
          err instanceof TypeError ||
          (err instanceof Error && err.message === "Failed to fetch")
            ? "Can't reach the API. Start it with npm run dev:api, then refresh."
            : err instanceof Error
              ? err.message
              : "Failed to load profile";
        setError(fallback);
        setFactsLoaded(true);
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
  const factsDirty =
    savedFacts !== null && !draftsEqual(factsDraft, savedFacts);
  const hasUnsaved = profileDirty || publicDirty || factsDirty;

  const unsavedDetail = useMemo(() => {
    const actions: string[] = [];
    if (profileDirty) actions.push("Save profile");
    if (factsDirty) actions.push("Save facts");
    if (publicDirty) actions.push("Save public settings");
    if (actions.length === 0) return "";
    if (actions.length === 1) {
      return `You changed a field. Click ${actions[0]} before leaving this page.`;
    }
    return `You have unsaved edits. Click ${actions.join(", then ")} before leaving this page.`;
  }, [profileDirty, publicDirty, factsDirty]);

  const { open, stay, leaveWithoutSaving } = useLeaveGuard(hasUnsaved);

  const usernameSlug = (
    publicDraft.username ||
    profile?.username ||
    ""
  )
    .trim()
    .toLowerCase();

  const shareableLink = useMemo(() => {
    if (!usernameSlug) return "";
    const path = `/u/${usernameSlug}`;
    return origin ? `${origin}${path}` : path;
  }, [origin, usernameSlug]);

  async function onCopyShareableLink() {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setError(null);
      setMessage("Shareable link copied.");
    } catch {
      setMessage(null);
      setError("Could not copy — select and copy the link manually.");
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

  /** Persist Known facts via dedicated PATCH — does not touch personality tone. */
  async function onSaveFacts(e: FormEvent) {
    e.preventDefault();
    if (!profile || savedFacts === null) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = factKeys.map((key) => ({
        key,
        value: (factsDraft[key] ?? "").trim(),
      }));
      const result = await apiFetch<FactsResult>(`/ai/${profile.id}/facts`, {
        method: "PATCH",
        body: JSON.stringify({ facts: payload }),
      });
      const next = factsDraftFrom(result.facts);
      const keys = result.facts.map((f) => f.key).filter(Boolean);
      setFactKeys(keys);
      setSavedFacts(next);
      setFactsDraft(next);
      setFactsLock((n) => n + 1);
      setMessage("Facts saved — chat will use the updated Known facts.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save facts");
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
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}/unpublish`, {
        method: "POST",
        body: "{}",
      });
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
      description="Who you are, Known facts the AI uses in chat, and publish state. Click the pencil to edit a field, then save that section. Photo saves as soon as you pick a file."
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

      {/* Known facts from onboarding interview — editable so owners can correct
          what the public AI says about them without redoing the interview. */}
      <form onSubmit={onSaveFacts} className="mb-10 space-y-4">
        <h2 className="font-display text-xl text-fg">About you</h2>
        <p className="text-sm text-muted">
          Facts from your interview. These are always used in chat. Wrong?
          Edit here — clearing a value removes that fact.
        </p>
        {!factsLoaded ? (
          <p className="text-sm text-muted">Loading facts…</p>
        ) : factKeys.length === 0 ? (
          <p className="text-sm text-muted">
            No interview facts yet. Complete the onboarding interview to
            populate this section.
          </p>
        ) : (
          factKeys.map((key) => (
            <EditableField
              key={key}
              label={factLabel(key)}
              value={factsDraft[key] ?? ""}
              lockVersion={factsLock}
              onChange={(value) =>
                setFactsDraft({ ...factsDraft, [key]: value })
              }
            />
          ))
        )}
        {factsDirty ? (
          <p className="text-sm text-fg">
            Unsaved — click Save facts before leaving.
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={saving || !factsDirty || factKeys.length === 0}
        >
          {saving ? "Saving…" : "Save facts"}
        </Button>
      </form>

      <form onSubmit={onSavePublic} className="space-y-4">
        <h2 className="font-display text-xl text-fg">Public link</h2>
        <EditableField
          label="Username"
          value={publicDraft.username}
          lockVersion={publicLock}
          onChange={(username) => setPublicDraft({ ...publicDraft, username })}
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
          {usernameSlug ? (
            <Button
              type="button"
              variant="secondary"
              aria-label={`Copy u/${usernameSlug}`}
              onClick={() => void onCopyShareableLink()}
            >
              u/{usernameSlug}
            </Button>
          ) : null}
        </div>
      </form>

      <p className="mt-10 text-sm text-muted">
        Communication style, formality, humor, and traits stay in Settings.
      </p>
      <div className="mt-3">
        <ButtonLink href="/app/settings" variant="secondary">
          Edit personality in Settings
        </ButtonLink>
      </div>

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
