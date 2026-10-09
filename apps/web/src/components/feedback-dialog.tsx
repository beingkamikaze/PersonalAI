"use client";

import {
  type FormEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import { ApiError, apiFetch, publicApiFetch } from "@/lib/api";

const MIN_MESSAGE = 5;

type FeedbackResponse = {
  id: string;
  created_at: string;
  message: string;
};

/**
 * Lightweight in-app feedback. Stays on the current page.
 * Signed-in submits go to POST /feedback (user + timestamp are stored server-side).
 * There is no route or category column, so those are not collected.
 */
export function FeedbackDialog({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  /** Focus this after close when the opener unmounts (profile menu item). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (open) return;
    setMessage("");
    setError(null);
    setSent(false);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const restoreTarget = returnFocusRef?.current ?? null;
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), textarea:not(:disabled), a[href], input:not(:disabled)",
        ),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      } else if (
        previouslyFocused &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open || !sent) return;
    dialogRef.current
      ?.querySelector<HTMLButtonElement>("[data-feedback-done]")
      ?.focus();
  }, [open, sent]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (text.length < MIN_MESSAGE || busy) return;
    setBusy(true);
    setError(null);
    const payload = { message: text, source: "app" as const };
    try {
      try {
        await apiFetch<FeedbackResponse>("/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await publicApiFetch<FeedbackResponse>("/feedback", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          throw err;
        }
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send feedback");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const canSend = message.trim().length >= MIN_MESSAGE && !busy;

  function requestClose() {
    if (busyRef.current) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center sm:px-6"
      role="presentation"
      onClick={requestClose}
    >
      <div className="absolute inset-0 bg-fg/40" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={sent ? undefined : descriptionId}
        aria-busy={busy || undefined}
        className="relative flex max-h-[min(90dvh,36rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-elevated p-5 shadow-[0_24px_60px_-28px_rgba(15,31,28,0.4)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl tracking-tight text-fg">
            {sent ? "Thanks" : "Send feedback"}
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            aria-label="Close"
            onClick={requestClose}
            disabled={busy}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-muted">
              We received your feedback.
            </p>
            <div className="mt-6 flex justify-end">
              <Button type="button" data-feedback-done onClick={requestClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-3">
            <p id={descriptionId} className="text-sm text-muted">
              What&apos;s on your mind?
            </p>
            <label htmlFor={fieldId} className="sr-only">
              Your feedback
            </label>
            <textarea
              ref={textareaRef}
              id={fieldId}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              maxLength={4000}
              disabled={busy}
              className="mt-3 w-full resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            />
            {message.trim().length > 0 && message.trim().length < MIN_MESSAGE ? (
              <p className="mt-1.5 text-xs text-muted">A few more words, please.</p>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={requestClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSend}>
                {busy ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
