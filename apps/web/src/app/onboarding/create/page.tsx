"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AiPreviewCard } from "@/components/ai-preview-card";
import { AvatarPicker } from "@/components/avatar-picker";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/dashboard-card";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ApiError, apiFetch, apiUpload, type AiProfile } from "@/lib/api";
import { getSessionUser, hasFinishedOnboarding, type SessionUser } from "@/lib/auth";
import { isUiPreview } from "@/lib/env";
import {
  revealContainer,
  revealItem,
  useHydratedReducedMotion,
} from "@/lib/motion";

export default function OnboardingCreatePage() {
  const router = useRouter();
  const reduceMotion = useHydratedReducedMotion();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [account, setAccount] = useState<SessionUser | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [omitGoogleAvatar, setOmitGoogleAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(() => !isUiPreview());

  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  useEffect(() => {
    if (isUiPreview()) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await getSessionUser();
        if (!cancelled) setAccount(session);
        const me = await apiFetch<AiProfile>("/ai/me");
        if (!cancelled) {
          router.replace(
            hasFinishedOnboarding(me) ? "/app" : "/onboarding/interview",
          );
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // No profile yet — stay on create form
        } else if (err instanceof ApiError && err.status === 401) {
          if (!cancelled) router.replace("/sign-in?next=/onboarding/create");
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const googleAvatar =
    !omitGoogleAvatar && !avatarFile ? account?.avatarUrl : null;
  const avatarSrc = avatarPreview || googleAvatar;
  const previewName = name.trim() || displayName.trim() || account?.name || "You";
  const previewSource = displayName.trim() || name.trim() || account?.name || null;
  const canContinue = Boolean(name.trim()) && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const profileName = name.trim() || displayName.trim();
    try {
      const created = await apiFetch<AiProfile>("/ai", {
        method: "POST",
        body: JSON.stringify({
          name: profileName,
          headline: headline.trim() || null,
          avatar_url: avatarFile ? null : googleAvatar || null,
        }),
      });
      if (avatarFile) {
        try {
          await apiUpload<AiProfile>(`/ai/${created.id}/avatar`, avatarFile);
        } catch (uploadErr) {
          console.error("[onboarding] avatar upload failed", uploadErr);
        }
      }
      router.push("/onboarding/interview");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        router.push("/onboarding/interview");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not create profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-[1040px]"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.header variants={item}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Create your AI
        </p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.12] tracking-[-0.02em] text-fg md:text-[2.5rem]">
          Let&apos;s create your AI.
        </h1>
        <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted text-balance">
          Start with the basics. Give your AI a name, a short description, and a
          face. You&apos;ll teach it about your work in the next steps.
        </p>
      </motion.header>

      <motion.div className="mt-5" variants={item}>
        <OnboardingProgress step={1} />
      </motion.div>

      {checking ? (
        <motion.p className="mt-8 text-sm text-muted" variants={item}>
          Checking whether you already started one…
        </motion.p>
      ) : (
        <motion.form
          onSubmit={onSubmit}
          className="mt-5 grid items-stretch gap-5 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-6"
          variants={item}
        >
          <div className={`${DASHBOARD_CARD_CLASS} flex h-full flex-col px-5 py-5 sm:px-6 sm:py-5`}>
            <h2 className="font-display text-[1.45rem] leading-tight tracking-[-0.01em] text-fg">
              Create your AI
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Start with the basics. You can change these later.
            </p>

            <div className="mt-4 space-y-3.5">
              <Field
                label="Full name"
                name="name"
                placeholder="Mayank Sharma"
                value={name}
                onChange={setName}
                required
              />
              <Field
                label="Display name"
                name="displayName"
                placeholder="What should people call your AI?"
                value={displayName}
                onChange={setDisplayName}
              />
              <Field
                label="Headline"
                name="headline"
                placeholder="e.g. Software Engineer building AI products"
                value={headline}
                onChange={setHeadline}
              />
              <AvatarPicker
                name={previewName}
                src={avatarSrc}
                busy={loading}
                onSelect={(file) => {
                  setError(null);
                  setOmitGoogleAvatar(false);
                  setAvatarFile(file);
                }}
                onRemove={
                  avatarSrc
                    ? () => {
                        setAvatarFile(null);
                        setOmitGoogleAvatar(true);
                      }
                    : undefined
                }
                onError={setError}
              />
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-auto hidden pt-4 lg:block">
              <ContinueButton canContinue={canContinue} loading={loading} />
            </div>
          </div>

          <AiPreviewCard
            name={previewSource}
            headline={headline}
            avatarSrc={avatarSrc}
            step={1}
          />

          <div className="lg:hidden">
            <ContinueButton
              canContinue={canContinue}
              loading={loading}
              className="w-full"
            />
          </div>
        </motion.form>
      )}
    </motion.div>
  );
}

function ContinueButton({
  canContinue,
  loading,
  className = "",
}: {
  canContinue: boolean;
  loading: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={!canContinue}
      className={`gap-1.5 rounded-xl px-5 transition-[background-color,transform,box-shadow] duration-200 active:translate-y-px motion-reduce:transition-none ${className}`}
    >
      {loading ? (
        "Creating…"
      ) : (
        <>
          Continue to interview
          <ChevronRightIcon className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

function Field({
  label,
  name,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
    </div>
  );
}
