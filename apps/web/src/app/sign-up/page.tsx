"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { POST_SIGNUP_PATH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${POST_SIGNUP_PATH}`,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.push(POST_SIGNUP_PATH);
      router.refresh();
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
  }

  async function signUpWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${POST_SIGNUP_PATH}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-in" ctaLabel="Sign in" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Create your account"
          description="After sign-up you will create a draft AI profile."
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              label="Full name"
              type="text"
              value={fullName}
              onChange={setFullName}
              autoComplete="name"
            />
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
              autoComplete="new-password"
            />
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="text-sm text-accent" role="status">
                {message}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Sign up"}
              </Button>
              <Button type="button" variant="secondary" onClick={signUpWithGoogle}>
                Continue with Google
              </Button>
            </div>
          </form>
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-accent hover:text-accent-hover">
              Sign in
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
  const id = label.toLowerCase().replace(/\s+/g, "-");
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
        minLength={type === "password" ? 6 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      />
    </div>
  );
}
