"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/onboarding/create";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? "Authentication failed. Try again." : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-up" ctaLabel="Sign up" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Sign in"
          description="Use email and password, or Google if enabled in your Supabase project."
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            <p className="text-sm">
              <Link
                href="/forgot-password"
                className="text-muted hover:text-fg"
              >
                Forgot password?
              </Link>
            </p>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button type="button" variant="secondary" onClick={signInWithGoogle}>
                Continue with Google
              </Button>
            </div>
          </form>
          <p className="mt-6 text-sm text-muted">
            No account?{" "}
            <Link href="/sign-up" className="text-accent hover:text-accent-hover">
              Sign up
            </Link>
          </p>
        </ScreenIntro>
      </main>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const id = label.toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      />
    </div>
  );
}
