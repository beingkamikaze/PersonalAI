"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch, type AiProfile } from "@/lib/api";

export default function OnboardingCreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiFetch<AiProfile>("/ai/me");
        if (!cancelled) {
          router.replace("/onboarding/interview");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const profileName = name.trim() || displayName.trim();
    try {
      await apiFetch<AiProfile>("/ai", {
        method: "POST",
        body: JSON.stringify({
          name: profileName,
          headline: headline.trim() || null,
        }),
      });
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

  if (checking) {
    return (
      <ScreenIntro
        title="Create your AI profile"
        description="Checking for an existing draft…"
      />
    );
  }

  return (
    <ScreenIntro
      title="Create your AI profile"
      description="Name, display name, and headline. Done when a draft profile exists."
    >
      <OnboardingProgress step={1} />
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
          placeholder="Mayank"
          value={displayName}
          onChange={setDisplayName}
        />
        <Field
          label="Headline"
          name="headline"
          placeholder="Software engineer building personal AI products"
          value={headline}
          onChange={setHeadline}
        />
        <div>
          <label className="text-sm font-medium text-fg">Avatar</label>
          <div className="mt-2 rounded border border-dashed border-border bg-elevated px-4 py-8 text-center text-sm text-muted">
            Upload comes in Phase 2 (object storage)
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Continue"}
        </Button>
      </form>
    </ScreenIntro>
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
      <label htmlFor={name} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
    </div>
  );
}
