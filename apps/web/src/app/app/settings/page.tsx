"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatBody } from "@/components/chat-body";
import { ChatMark, YouMark } from "@/components/chat-mark";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronRightIcon, PencilIcon } from "@/components/ui/icons";
import { getSessionUser, signOut, type SessionUser } from "@/lib/auth";
import { useLeaveGuard } from "@/lib/use-leave-guard";
import { ApiError, apiFetch, type AiProfile, type Personality } from "@/lib/api";
import { invalidateAnalytics, loadProfile } from "@/lib/owner-cache";
import { personalitySample } from "@/lib/personality-preview";
import {
  draftsEqual,
  personalityDraftFrom,
  type PersonalityDraft,
} from "@/lib/profile-forms";
import {
  isUiPreview,
  PREVIEW_PERSONALITY,
  PREVIEW_PROFILE,
} from "@/lib/ui-preview";

const settingsCard =
  "rounded-[20px] border border-border bg-white px-4 py-5 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)] md:px-5 md:py-6";

const PERSONALITY_FIELDS: {
  key: keyof PersonalityDraft;
  label: string;
  description: string;
}[] = [
  {
    key: "communication_style",
    label: "Communication style",
    description: "How your AI naturally communicates.",
  },
  {
    key: "formality",
    label: "Formality",
    description: "How formal should the responses feel?",
  },
  {
    key: "humor",
    label: "Humor",
    description: "How much humor should your AI use?",
  },
  {
    key: "verbosity",
    label: "Response length",
    description: "How detailed should responses be?",
  },
  {
    key: "directness",
    label: "Directness",
    description: "How directly should your AI answer?",
  },
  {
    key: "traits",
    label: "Traits",
    description: "Characteristics that describe your AI.",
  },
];

/**
 * Settings — how the AI talks, where memory and knowledge are managed,
 * what visitors can see, and account deletion.
 * Known facts and public profile fields stay on `/app/profile`.
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
  const [editingKey, setEditingKey] = useState<keyof PersonalityDraft | null>(
    null,
  );
  const editSnapshot = useRef("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
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
        const me = await loadProfile();
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
          if (isUiPreview()) {
            const preview = previewSettings();
            setAccount(preview.account);
            setProfile(preview.profile);
            setPersonality(preview.personality);
            setSavedPersonality(preview.draft);
            setPersonalityDraft(preview.draft);
            return;
          }
          router.replace("/sign-in?next=/app/settings");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/create");
          return;
        }
        if (isUiPreview()) {
          const preview = previewSettings();
          setAccount(preview.account);
          setProfile(preview.profile);
          setPersonality(preview.personality);
          setSavedPersonality(preview.draft);
          setPersonalityDraft(preview.draft);
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
    return "You changed how your AI talks. Save changes before leaving this page.";
  }, [personalityDirty]);

  const confirmHint = account?.email || "DELETE";
  const confirmMatches =
    confirmText.trim().toLowerCase() === confirmHint.trim().toLowerCase();
  const sample = personalitySample(personalityDraft);
  const published = profile?.visibility === "published";

  function updateField(key: keyof PersonalityDraft, value: string) {
    setPersonalityDraft((current) => ({ ...current, [key]: value }));
    setSavedNotice(false);
  }

  function beginEdit(key: keyof PersonalityDraft) {
    if (!personality) return;
    editSnapshot.current = personalityDraft[key];
    setEditingKey(key);
  }

  function finishEdit() {
    setEditingKey(null);
  }

  function cancelEdit() {
    if (!editingKey) return;
    const key = editingKey;
    const previous = editSnapshot.current;
    setPersonalityDraft((current) => ({ ...current, [key]: previous }));
    setEditingKey(null);
  }

  async function onSavePersonality(e: FormEvent) {
    e.preventDefault();
    if (!profile || !personality || saving) return;
    setEditingKey(null);
    if (isUiPreview() && profile.id === PREVIEW_PROFILE.id) {
      const next = { ...personalityDraft };
      setSavedPersonality(next);
      setPersonalityDraft(next);
      setSavedNotice(true);
      return;
    }
    setSaving(true);
    setError(null);
    setSavedNotice(false);
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
      invalidateAnalytics(profile.id);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount(e: FormEvent) {
    e.preventDefault();
    if (!confirmMatches || deleting) return;
    if (isUiPreview() && profile?.id === PREVIEW_PROFILE.id) return;
    setDeleting(true);
    setError(null);
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
    <div className="relative w-full space-y-3.5 md:px-2">
      <header>
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          Settings
        </p>
        <h1 className="mt-1.5 max-w-3xl font-display text-[1.65rem] leading-[1.15] tracking-tight text-fg sm:text-[1.85rem]">
          Your AI&apos;s personality, behavior, and privacy.
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-snug text-muted">
          Control how your AI speaks, what it can use, and what visitors can see.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className={settingsCard}>
        <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-fg sm:text-[1.4rem]">
          AI personality
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-snug text-muted">
          Shape how your AI communicates with people.
        </p>

        <form onSubmit={onSavePersonality} className="mt-4">
          {loading ? (
            <p className="text-sm text-muted">Loading saved values…</p>
          ) : (
            <div className="divide-y divide-border">
              {PERSONALITY_FIELDS.map((field) => (
                <PersonalityField
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  value={personalityDraft[field.key]}
                  editing={editingKey === field.key}
                  disabled={!personality}
                  onEdit={() => beginEdit(field.key)}
                  onChange={(value) => updateField(field.key, value)}
                  onDone={finishEdit}
                  onCancel={cancelEdit}
                />
              ))}
            </div>
          )}

          {!loading && !personality ? (
            <p className="mt-4 text-sm text-muted">
              <Link
                href="/onboarding/interview"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Finish the interview
              </Link>{" "}
              before these choices can be saved.
            </p>
          ) : null}

          {!loading && personality && (personalityDirty || savedNotice) ? (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              {personalityDirty ? (
                <>
                  <p className="mr-auto text-sm text-muted">Unsaved changes</p>
                  <Button
                    type="submit"
                    className="!h-11 !rounded-xl"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </>
              ) : (
                <p
                  className="inline-flex items-center gap-1.5 text-sm text-accent"
                  role="status"
                >
                  <CheckIcon className="h-4 w-4" />
                  Changes saved
                </p>
              )}
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="text-sm font-medium text-fg">
                See how your AI sounds
              </h3>
              <p className="mt-0.5 text-sm text-muted">
                These settings shape the tone of every answer.
              </p>
              <div className="mt-3 space-y-3 rounded-2xl bg-[#f7fbf9] p-3.5">
                <SampleTurn who="You" mark={<YouMark />} content={sample.question} />
                <SampleTurn
                  who="Your AI"
                  mark={<ChatMark />}
                  content={sample.reply}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {sample.voice
                  ? `Shaped by: ${sample.voice}. This is a sample of tone, not a description of you.`
                  : "This is a sample of tone, not a description of you."}
              </p>
            </div>
          ) : null}
        </form>
      </section>

      <section className={settingsCard}>
        <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-fg sm:text-[1.4rem]">
          AI behavior
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-snug text-muted">
          Control what your AI can use when answering. There is no separate
          switch — answers use the memories and knowledge you have saved.
        </p>
        <div className="mt-4 divide-y divide-border">
          <SettingsLink
            href="/app/memories"
            title="Memory"
            description="Saved preferences, facts, and boundaries are used when you have them."
            action="Open Memory"
          />
          <SettingsLink
            href="/app/knowledge"
            title="Knowledge"
            description="Uploaded documents, notes, and links are used when you have them."
            action="Open Knowledge"
          />
        </div>
      </section>

      <section className={settingsCard}>
        <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-fg sm:text-[1.4rem]">
          Privacy & sharing
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-snug text-muted">
          Control what visitors can access through your public AI.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-snug text-fg">
          Your memories are private. Your documents are private. Visitors only
          receive answers through your public AI.
        </p>
        <div className="mt-2 divide-y divide-border">
          <SettingsLink
            href="/app/profile"
            title="Public AI"
            description={
              loading
                ? "Loading…"
                : published
                  ? "Live. Visitors can open your page. Publish and unpublish live on Profile."
                  : "Not shared yet. Visitors cannot open your page. Publish and unpublish live on Profile."
            }
            action="Open profile"
          />
          <SettingsLink
            href="/app/conversations"
            title="Visitor conversations"
            description="Only you can read these threads. They are not shown on your public page."
            action="View conversations"
          />
        </div>
      </section>

      <section className={settingsCard}>
        <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-fg sm:text-[1.4rem]">
          Account
        </h2>
        <div className="mt-4 divide-y divide-border">
          <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm font-medium text-fg">Email</p>
            <p className="min-w-0 text-sm break-all text-fg sm:text-right">
              {account?.email ?? (loading ? "Loading…" : "Not available")}
            </p>
          </div>
          <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">Plan</p>
              <p className="mt-0.5 text-sm text-muted">Free</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex h-11 shrink-0 items-center gap-0.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Upgrade
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <SettingsLink
            href="/app/profile"
            title="Profile"
            description="Manage your public identity and AI profile."
            action="Open profile"
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-[#eadfdc] bg-white px-4 py-5 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.2)] md:px-5 md:py-6">
        <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-[#8f3d38] sm:text-[1.4rem]">
          Danger zone
        </h2>
        <form onSubmit={onDeleteAccount} className="mt-4 max-w-xl">
          <h3 className="text-sm font-medium text-fg">Delete account</h3>
          <p className="mt-1 text-sm leading-snug text-muted">
            Permanently removes your AI, knowledge, memories, conversations and
            account. This cannot be undone. To hide your public page only,{" "}
            <Link
              href="/app/profile"
              className="font-medium text-accent hover:text-accent-hover"
            >
              unpublish it on Profile
            </Link>
            .
          </p>
          <label className="mt-4 block">
            <span className="text-sm text-muted">
              Type {confirmHint} to confirm
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <Button
            type="submit"
            variant="danger"
            className="mt-3 !h-11 !rounded-xl"
            disabled={deleting || !confirmMatches}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </form>
      </section>

      <UnsavedChangesDialog
        open={open}
        detail={unsavedDetail}
        onStay={stay}
        onLeave={leaveWithoutSaving}
      />
    </div>
  );
}

function previewSettings() {
  const draft = personalityDraftFrom(PREVIEW_PERSONALITY);
  return {
    account: {
      email: PREVIEW_PROFILE.contact_email,
      name: PREVIEW_PROFILE.name,
      avatarUrl: null,
    } satisfies SessionUser,
    profile: PREVIEW_PROFILE,
    personality: PREVIEW_PERSONALITY,
    draft,
  };
}

function SampleTurn({
  who,
  mark,
  content,
}: {
  who: string;
  mark: ReactNode;
  content: string;
}) {
  const isYou = who === "You";
  return (
    <div className="flex items-start gap-2.5">
      {mark}
      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium text-muted">{who}</p>
        <div
          className={
            isYou
              ? "rounded-2xl bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-sm text-fg"
              : "rounded-2xl bg-accent-soft px-3.5 py-2.5 text-sm text-fg"
          }
        >
          <ChatBody content={content} />
        </div>
      </div>
    </div>
  );
}

function PersonalityField({
  label,
  description,
  value,
  editing,
  disabled,
  onEdit,
  onChange,
  onDone,
  onCancel,
}: {
  label: string;
  description: string;
  value: string;
  editing: boolean;
  disabled: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = value.trim() ? value.trim() : "Not set";

  useEffect(() => {
    if (!editing) return;
    const node = inputRef.current;
    node?.focus();
    try {
      node?.setSelectionRange(node.value.length, node.value.length);
    } catch {
      /* some inputs do not support selection range */
    }
  }, [editing]);

  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-[24rem]">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted">{description}</p>
      </div>
      {editing ? (
        <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md">
          <input
            ref={inputRef}
            value={value}
            aria-label={label}
            placeholder="Not set"
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onDone();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-accent bg-white px-3 text-sm text-fg outline-none"
          />
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          title={display}
          aria-label={
            disabled
              ? `${label} is not available yet`
              : `Edit ${label}. Current value ${display}`
          }
          className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-[#f7fbf9] px-3 text-left text-sm transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:max-w-[18rem] sm:min-w-[11rem]"
        >
          <span
            className={`truncate ${value.trim() ? "text-fg" : "text-muted"}`}
          >
            {display}
          </span>
          <PencilIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
        </button>
      )}
    </div>
  );
}

function SettingsLink({
  href,
  title,
  description,
  action,
}: {
  href: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 flex-col gap-2 rounded-xl py-3.5 transition hover:bg-[#f7fbf9] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">
          {description}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-accent">
        {action}
        <ChevronRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
