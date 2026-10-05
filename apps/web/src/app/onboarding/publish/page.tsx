"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/dashboard-card";
import { OnboardingProgress } from "@/components/onboarding-progress";
import {
  PublicChat,
  PublicChatSkeleton,
  PublicRings,
} from "@/components/public-chat";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";
import { invalidateProfileAndAnalytics } from "@/lib/owner-cache";
import {
  revealContainer,
  revealItem,
  useHydratedReducedMotion,
} from "@/lib/motion";
import { suggestedQuestions } from "@/lib/suggested-questions";
import { isUiPreview, PREVIEW_PROFILE } from "@/lib/ui-preview";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fieldClass =
  "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2 disabled:opacity-60";

/**
 * Onboarding share step — public profile, live public-chat preview, publish.
 * Publish still posts the same payload to POST /ai/:id/publish.
 */
export default function OnboardingPublishPage() {
  const router = useRouter();
  const reduceMotion = useHydratedReducedMotion();
  const previewMode = isUiPreview();
  const [profile, setProfile] = useState<AiProfile | null>(() =>
    previewMode ? PREVIEW_PROFILE : null,
  );
  const [username, setUsername] = useState(() =>
    previewMode ? (PREVIEW_PROFILE.username ?? "") : "",
  );
  const [contactEmail, setContactEmail] = useState(() =>
    previewMode ? (PREVIEW_PROFILE.contact_email ?? "") : "",
  );
  const [calendarLink, setCalendarLink] = useState(() =>
    previewMode ? (PREVIEW_PROFILE.calendar_link ?? "") : "",
  );
  const [bio, setBio] = useState(() =>
    previewMode ? (PREVIEW_PROFILE.bio ?? "") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [usernameServerError, setUsernameServerError] = useState<string | null>(
    null,
  );
  const [attempted, setAttempted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [calendarTouched, setCalendarTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishedUsername, setPublishedUsername] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState("");

  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

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
          if (previewMode) return;
          router.replace("/sign-in?next=/onboarding/publish");
          return;
        }
        if (previewMode) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewMode, router]);

  const slug = username.trim().toLowerCase();
  const formatIssue = usernameFormatIssue(username);
  const usernameFeedback =
    usernameServerError ||
    formatIssue ||
    (attempted && !slug ? "Choose a username" : null);
  const emailFeedback =
    emailTouched || attempted ? emailIssue(contactEmail) : null;
  const calendarFeedback =
    calendarTouched || attempted ? calendarIssue(calendarLink) : null;
  const publicPath = slug ? `/u/${slug}` : null;
  const prettyLink = publicPath ? `${host}${publicPath}` : "";

  const chatProfile = useMemo(() => {
    if (!profile) return null;
    const email = contactEmail.trim();
    const calendar = calendarLink.trim();
    return {
      name: profile.name,
      headline: profile.headline,
      bio: bio.trim() || null,
      avatar_url: profile.avatar_url,
      contact_email: email && !emailIssue(email) ? email : null,
      calendar_link: calendar && !calendarIssue(calendar) ? calendar : null,
      suggested_questions: suggestedQuestions(profile.name),
    };
  }, [profile, bio, contactEmail, calendarLink]);

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    if (!profile || busy) return;
    setAttempted(true);
    setEmailTouched(true);
    setCalendarTouched(true);
    const nextFormat = usernameFormatIssue(username);
    const nextEmail = emailIssue(contactEmail);
    const nextCalendar = calendarIssue(calendarLink);
    if (!slug || nextFormat || nextEmail || nextCalendar) return;

    setBusy(true);
    setError(null);
    setUsernameServerError(null);
    try {
      if (previewMode && profile.id === "preview-profile") {
        setPublishedUsername(slug);
        return;
      }
      const updated = await apiFetch<AiProfile>(`/ai/${profile.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          username: slug,
          contact_email: contactEmail.trim() || null,
          calendar_link: calendarLink.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setProfile(updated);
      invalidateProfileAndAnalytics();
      if (!updated.username) {
        setError("Choose a username before publishing");
        return;
      }
      setPublishedUsername(updated.username);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Publish failed";
      if (/username/i.test(message)) setUsernameServerError(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyPublicLink(path: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setError(null);
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  }

  const enter = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: EASE };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1120px]">
      <AnimatePresence mode="wait" initial={false}>
        {publishedUsername ? (
          <motion.div
            key="published"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={enter}
          >
            <PageHeader
              title="Your AI is live."
              description="Anyone with your link can talk to your AI."
            />
            <div className="mt-5">
              <OnboardingProgress step={6} />
            </div>
            <div className={`${DASHBOARD_CARD_CLASS} mt-8 px-5 py-6 sm:px-7 sm:py-7`}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Public link
              </p>
              <p className="mt-3 break-all font-display text-[1.65rem] leading-tight tracking-[-0.02em] text-fg sm:text-[2rem]">
                {host ? `${host}/u/${publishedUsername}` : `/u/${publishedUsername}`}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <ButtonLink
                  href={`/u/${publishedUsername}`}
                  className="w-full gap-1.5 rounded-xl px-5 shadow-[0_8px_16px_-12px_rgba(12,107,86,0.85)] transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_12px_22px_-12px_rgba(12,107,86,0.95)] active:translate-y-px motion-reduce:transition-none sm:w-auto"
                >
                  Open public page
                  <ChevronRightIcon className="h-4 w-4" />
                </ButtonLink>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl px-5"
                  onClick={() => void copyPublicLink(`/u/${publishedUsername}`)}
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              {error ? (
                <p className="mt-4 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="draft"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={enter}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={container}
            >
            <motion.div variants={item}>
              <PageHeader
                title="Your AI is ready to meet people."
                description="Choose your public link, add a few optional details, preview the experience, then publish."
              />
            </motion.div>

            <motion.div className="mt-5" variants={item}>
              <OnboardingProgress step={5} />
            </motion.div>

            <motion.div
              className="mt-8 flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:items-start lg:gap-6"
              variants={item}
            >
              <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
              <form
                id="publish-form"
                onSubmit={onPublish}
                noValidate
                className={`${DASHBOARD_CARD_CLASS} order-1 min-w-0 px-5 py-5 sm:px-6 sm:py-5 lg:order-none`}
              >
                <h2 className="font-display text-[1.45rem] leading-tight tracking-[-0.01em] text-fg">
                  Public profile
                </h2>
                <p className="mt-1.5 text-sm text-muted">
                  Choose what visitors will see on your public page.
                </p>

                <div className="mt-5">
                  <label htmlFor="username" className="text-sm font-medium text-fg">
                    Username
                  </label>
                  <p id="username-help" className="mt-1 text-[12px] leading-relaxed text-muted">
                    This becomes your public URL.
                  </p>
                  <div
                    className={`mt-2 flex items-center gap-1.5 rounded-xl border bg-white px-3.5 transition-[border-color,box-shadow] duration-200 focus-within:ring-2 ${
                      usernameFeedback
                        ? "border-red-700/70 focus-within:border-red-700 focus-within:ring-red-700/15"
                        : "border-border focus-within:border-accent focus-within:ring-accent/15"
                    }`}
                  >
                    <span className="shrink-0 select-none text-[15px] font-medium text-muted">
                      /u/
                    </span>
                    <input
                      id="username"
                      name="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase());
                        setUsernameServerError(null);
                      }}
                      placeholder="your-name"
                      aria-describedby="username-help"
                      aria-invalid={usernameFeedback ? true : undefined}
                      className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-medium text-fg placeholder:font-normal placeholder:text-muted/70 focus:outline-none disabled:opacity-60"
                      disabled={busy || !profile}
                      required
                      minLength={3}
                      maxLength={40}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    {slug && !usernameFeedback ? (
                      <>
                        <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                        <span className="sr-only">Username format is valid</span>
                      </>
                    ) : null}
                  </div>
                  {usernameFeedback ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-red-700" role="alert">
                      {usernameFeedback}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <OptionalLabel htmlFor="bio">Short bio</OptionalLabel>
                    <FieldHint id="bio-help">
                      A short introduction visitors can see.
                    </FieldHint>
                    <textarea
                      id="bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      aria-describedby="bio-help"
                      className={`${fieldClass} min-h-[88px] resize-y border-border focus:border-accent focus:ring-accent/15`}
                      disabled={busy || !profile}
                    />
                  </div>

                  <div>
                    <OptionalLabel htmlFor="email">Contact email</OptionalLabel>
                    <FieldHint id="email-help">
                      Optional — visitors can use this to contact you.
                    </FieldHint>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      aria-describedby="email-help"
                      aria-invalid={emailFeedback ? true : undefined}
                      className={`${fieldClass} ${
                        emailFeedback
                          ? "border-red-700/70 focus:border-red-700 focus:ring-red-700/15"
                          : "border-border focus:border-accent focus:ring-accent/15"
                      }`}
                      disabled={busy || !profile}
                    />
                    {emailFeedback ? (
                      <p className="mt-1.5 text-[12px] text-red-700" role="alert">
                        {emailFeedback}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <OptionalLabel htmlFor="cal">Calendar / booking link</OptionalLabel>
                    <FieldHint id="cal-help">
                      Optional — let visitors book time with you.
                    </FieldHint>
                    <input
                      id="cal"
                      name="calendar"
                      type="url"
                      value={calendarLink}
                      onChange={(e) => setCalendarLink(e.target.value)}
                      onBlur={() => setCalendarTouched(true)}
                      placeholder="https://"
                      aria-describedby="cal-help"
                      aria-invalid={calendarFeedback ? true : undefined}
                      className={`${fieldClass} ${
                        calendarFeedback
                          ? "border-red-700/70 focus:border-red-700 focus:ring-red-700/15"
                          : "border-border focus:border-accent focus:ring-accent/15"
                      }`}
                      disabled={busy || !profile}
                    />
                    {calendarFeedback ? (
                      <p className="mt-1.5 text-[12px] text-red-700" role="alert">
                        {calendarFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </form>

              <aside className="order-3 min-w-0 rounded-2xl border border-accent/15 bg-accent-soft/80 px-4 py-3.5 sm:px-5 lg:order-none">
                <p className="text-[13px] font-medium text-fg">What visitors can see</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Visitors can see your public profile and AI responses. Your
                  private conversations, uploaded documents, and Memory list stay
                  private.
                </p>
              </aside>

              <div className="order-4 min-w-0 lg:order-none">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Button
                    type="submit"
                    form="publish-form"
                    disabled={
                      busy || !profile || !slug || Boolean(formatIssue)
                    }
                    className="w-full gap-1.5 rounded-xl px-5 shadow-[0_8px_16px_-12px_rgba(12,107,86,0.85)] hover:shadow-[0_12px_22px_-12px_rgba(12,107,86,0.95)] active:translate-y-px motion-reduce:transform-none sm:w-auto"
                  >
                    {busy ? (
                      "Publishing…"
                    ) : (
                      <>
                        Publish your AI
                        <ChevronRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <ButtonLink
                    href="/onboarding/test"
                    variant="ghost"
                    className="px-1 text-muted hover:bg-transparent"
                  >
                    Back to test
                  </ButtonLink>
                </div>
                {error ? (
                  <p className="mt-4 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
              </div>

              <section
                className={`${DASHBOARD_CARD_CLASS} order-2 min-w-0 px-3 py-4 sm:px-4 sm:py-5 lg:order-none`}
                aria-label="Live preview"
              >
                <div className="px-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                    Live preview
                  </p>
                  <p className="mt-1.5 text-sm text-muted">
                    This is what visitors will see.
                  </p>
                  {prettyLink ? (
                    <p className="mt-1 truncate text-[13px] font-medium text-fg">
                      {prettyLink}
                    </p>
                  ) : (
                    <p className="mt-1 text-[13px] text-muted">/u/…</p>
                  )}
                </div>
                <div className="public-visit relative mt-4 overflow-hidden rounded-[22px]">
                  <PublicRings />
                  <div className="relative z-10 p-2 sm:p-3">
                    {chatProfile && profile ? (
                      <PublicChat
                        key={profile.id}
                        mode="preview"
                        profileId={profile.id}
                        profile={chatProfile}
                      />
                    ) : error && !profile ? (
                      <p className="px-2 py-8 text-center text-sm text-muted" role="alert">
                        {error}
                      </p>
                    ) : (
                      <PublicChatSkeleton />
                    )}
                  </div>
                </div>
              </section>
            </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        Share your AI
      </p>
      <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.12] tracking-[-0.02em] text-fg md:text-[2.5rem]">
        {title}
      </h1>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted text-balance">
        {description}
      </p>
    </header>
  );
}

function OptionalLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
      {children}{" "}
      <span className="font-normal text-muted">(optional)</span>
    </label>
  );
}

function FieldHint({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="mt-1 text-[12px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

/** Mirrors `validate_username` in `apps/api/app/usernames.py`. */
const RESERVED_USERNAMES = new Set([
  "account",
  "admin",
  "api",
  "app",
  "auth",
  "feedback",
  "health",
  "me",
  "onboarding",
  "pricing",
  "profile",
  "public",
  "settings",
  "sign-in",
  "sign-up",
  "u",
  "www",
]);

const USERNAME_RE = /^[a-z0-9]([a-z0-9_-]{1,38}[a-z0-9])?$/;

function usernameFormatIssue(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  if (!username) return null;
  if (username.length < 3 || username.length > 40) {
    return "Username must be 3–40 characters";
  }
  if (!USERNAME_RE.test(username)) {
    return "Username may use lowercase letters, numbers, hyphens, and underscores";
  }
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved";
  return null;
}

function emailIssue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

function calendarIssue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Enter a link starting with https://";
    }
  } catch {
    return "Enter a full link, including https://";
  }
  return null;
}
