"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Set a new password after the recovery email link creates a session
 * via `/auth/callback?next=/update-password`. Also usable when already signed in.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError || !data.session) {
        console.warn("[auth] update-password: no session — redirect to forgot-password");
        router.replace("/forgot-password");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await updatePassword(password);
    setLoading(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="atmosphere min-h-screen px-6 py-16 text-muted md:px-10">
        Checking session…
      </div>
    );
  }

  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-in" ctaLabel="Sign in" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Choose a new password"
          description="Use a password you have not used here before."
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              id="password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <Field
              id="confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Update password"}
              </Button>
              <Link
                href="/sign-in"
                className="inline-flex items-center text-sm text-muted hover:text-fg"
              >
                Cancel
              </Link>
            </div>
          </form>
        </ScreenIntro>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        required
        minLength={MIN_PASSWORD_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      />
    </div>
  );
}
