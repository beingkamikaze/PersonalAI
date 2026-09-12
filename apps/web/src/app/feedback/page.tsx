"use client";

import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch, publicApiFetch } from "@/lib/api";

/**
 * Soft-launch feedback form (Phase 5).
 * Works signed-in (sends Bearer via apiFetch) or anonymous (publicApiFetch).
 */
export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    const payload = {
      message: message.trim(),
      email: email.trim() || null,
      source: "app" as const,
    };
    try {
      // Prefer authenticated submit; fall back to anonymous
      try {
        await apiFetch("/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await publicApiFetch("/feedback", {
            method: "POST",
            body: JSON.stringify({ ...payload, source: "landing" }),
          });
        } else {
          throw err;
        }
      }
      setMessage("");
      setStatus("Thanks — we received your feedback.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/app" ctaLabel="Dashboard" />
      <main className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl text-fg">Feedback</h1>
        <p className="mt-3 text-muted text-balance">
          Soft launch: tell us what worked, what confused you, or what you need
          next. We read every note.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="fb" className="text-sm font-medium text-fg">
              Your note
            </label>
            <textarea
              id="fb"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              required
              minLength={5}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="em" className="text-sm font-medium text-fg">
              Email (optional)
            </label>
            <input
              id="em"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || message.trim().length < 5}>
            {busy ? "Sending…" : "Send feedback"}
          </Button>
        </form>
        {status ? <p className="mt-4 text-sm text-muted">{status}</p> : null}
        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
