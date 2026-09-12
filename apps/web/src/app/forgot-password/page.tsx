"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth";

/**
 * Request a password-reset email (Product Design §6.1).
 * Always shows a generic success message to avoid email enumeration.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/update-password")}`;
    const { error: resetError } = await requestPasswordReset(email, redirectTo);
    setLoading(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setSent(true);
  }

  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-in" ctaLabel="Sign in" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Reset password"
          description="Enter your account email. If it exists, we will send a reset link."
        >
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-fg">
                Check your email for a link to choose a new password. The link
                expires after a short time.
              </p>
              <p className="text-sm text-muted">
                Back to{" "}
                <Link
                  href="/sign-in"
                  className="text-accent hover:text-accent-hover"
                >
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-fg">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="submit" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center text-sm text-muted hover:text-fg"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </ScreenIntro>
      </main>
    </div>
  );
}
