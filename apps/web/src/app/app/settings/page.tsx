"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { EditableField } from "@/components/ui/editable-field";
import { getSessionUser, notifyAccountChanged, signOut, type SessionUser } from "@/lib/auth";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";
import {
  draftsEqual,
  publicDraftFrom,
  type PublicDraft,
} from "@/lib/profile-forms";

/**
 * Settings — public link, publish state, and account deletion.
 * Identity and personality live on `/app/profile`.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [savedPublic, setSavedPublic] = useState<PublicDraft | null>(null);
  const [publicDraft, setPublicDraft] = useState<PublicDraft>({
    username: "",
    contactEmail: "",
    calendarLink: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publicLock, setPublicLock] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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
        const nextPublic = publicDraftFrom(me);
        setSavedPublic(nextPublic);
        setPublicDraft(nextPublic);
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
        setError(err instanceof Error ? err.message : "Failed to load settings");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const publicDirty =
    savedPublic !== null && !draftsEqual(publicDraft, savedPublic);
  const { open, stay, leaveWithoutSaving } = useLeaveGuard(publicDirty);

  const unsavedDetail = useMemo(() => {
    if (!publicDirty) return "";
    return "You changed a field. Click Save public settings before leaving this page.";
  }, [publicDirty]);

  const confirmHint = account?.email || "DELETE";
  const confirmMatches =
    confirmText.trim().toLowerCase() === confirmHint.trim().toLowerCase();

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
      description="Public link, contact links, and account. Click the pencil to edit a field, then save."
    >
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

      <form
        onSubmit={onDeleteAccount}
        className="space-y-4 border-t border-border pt-10"
      >
        <h2 className="font-display text-xl text-fg">Delete account</h2>
        <p className="text-sm text-muted">
          Permanently removes your AI, knowledge, memories, conversations, and
          login. This cannot be undone. Unpublish if you only want to hide the
          public page.
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
