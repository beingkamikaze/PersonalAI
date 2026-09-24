"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, type ReactNode } from "react";
import { AuthEdgeCurves } from "@/components/auth-edge-curves";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  ChartIcon,
  LinkIcon,
  LockIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { POST_LOGIN_PATH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const BENEFITS = [
  {
    title: "Track conversations",
    body: "See how people use your AI",
    icon: ChartIcon,
  },
  {
    title: "Update anytime",
    body: "Keep your AI aligned with your latest work",
    icon: PencilIcon,
  },
  {
    title: "Share your link",
    body: "Use it anywhere — LinkedIn, your site, or email",
    icon: LinkIcon,
  },
] as const;

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? POST_LOGIN_PATH;
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="landing auth-surface relative isolate flex min-h-screen flex-col overflow-x-hidden">
      <AuthEdgeCurves />
      <SiteHeader
        contained
        ctaHref="/sign-up"
        buttonClassName="!rounded-full"
      />
      <main className="relative mx-auto w-full max-w-[1200px] px-5 pb-10 pt-6 sm:px-8 lg:pt-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-x-16 lg:gap-y-7">
          <section className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Your knowledge. Always available.
            </p>
            <h1 className="mt-4 max-w-xl font-display text-[2.45rem] leading-[1.05] tracking-[-0.02em] text-fg sm:text-[3.15rem] lg:text-[3.45rem]">
              <span className="block">Welcome back</span>
              <span className="block text-accent">to PersonaAI.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
              Sign in to manage your AI, update your knowledge, and see how
              people are interacting with it.
            </p>
          </section>

          <div className="order-2 min-w-0 lg:col-start-1 lg:row-start-2">
            <ul className="max-w-md space-y-3.5">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-5 text-fg">
                        {item.title}
                      </span>
                      <span className="block text-[13px] leading-5 text-muted">
                        {item.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <figure className="mt-6 hidden max-w-md items-start gap-3 rounded-2xl bg-accent-soft/70 px-4 py-3.5 lg:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/visitor.jpg"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover object-top"
              />
              <div className="min-w-0">
                <blockquote className="text-sm leading-snug text-fg">
                  “PersonaAI helps me share my work and experience without
                  repeating myself.”
                </blockquote>
                <figcaption className="mt-2">
                  <span className="block text-sm font-medium leading-4 text-fg">
                    Mayank Sandilya
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Software Developer
                  </span>
                </figcaption>
              </div>
            </figure>
          </div>

          <section className="order-3 rounded-[22px] border border-border bg-white px-5 py-7 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)] sm:px-8 sm:py-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 className="font-display text-[2.15rem] leading-none tracking-[-0.02em] text-fg">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-muted">
              Welcome back! Sign in to your account.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@example.com"
                icon={<MailMark />}
              />
              <Field
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="Enter your password"
                icon={<LockIcon className="h-4 w-4" />}
                trailing={
                  <button
                    type="button"
                    className="text-muted hover:text-fg"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOffMark /> : <EyeMark />}
                  </button>
                }
              />
              <p className="!mt-2 text-right text-[13px]">
                <Link
                  href="/forgot-password"
                  className="font-medium text-accent hover:text-accent-hover"
                >
                  Forgot password?
                </Link>
              </p>
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={loading}
                className="!mt-5 !h-[52px] w-full !rounded-xl text-[15px] hover:-translate-y-px hover:shadow-[0_10px_22px_-14px_rgba(12,107,86,0.7)]"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-border" />
              Or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={signInWithGoogle}
              className="!h-[52px] w-full !rounded-xl bg-white text-[15px] hover:-translate-y-px"
            >
              <GoogleMark />
              Continue with Google
            </Button>
            <p className="mt-5 text-center text-sm text-muted">
              No account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign up
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  icon,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative mt-1.5">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          onChange={(e) => onChange(e.target.value)}
          className={`h-[52px] w-full rounded-xl border border-border bg-white text-[15px] text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none ${
            icon ? "pl-10" : "pl-3.5"
          } ${trailing ? "pr-11" : "pr-3.5"}`}
        />
        {trailing ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MailMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function EyeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="mr-2">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4A7.2 7.2 0 0 1 5 12c0-.8.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
