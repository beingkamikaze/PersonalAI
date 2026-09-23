"use client";

import { useEffect, useId, useState } from "react";
import { ChatRow } from "@/components/chat-mark";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";
import {
  apiFetch,
  type ConversationDetail,
} from "@/lib/api";

type OpenThread = {
  id: string;
  preview?: string | null;
};

/**
 * Read-only visitor thread viewer — used from dashboard + conversations list.
 */
export function VisitorConversationModal({
  thread,
  onClose,
}: {
  thread: OpenThread | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const open = thread !== null;
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!thread) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    (async () => {
      try {
        const data = await apiFetch<ConversationDetail>(
          `/conversations/${thread.id}`,
        );
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [thread]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !thread) return null;

  const title =
    thread.preview?.trim() ||
    detail?.messages.find((m) => m.role === "user")?.content?.trim() ||
    "Visitor conversation";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-3 py-3 sm:items-center sm:px-6"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-fg/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(88vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-[0_24px_60px_-24px_rgba(15,31,28,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Visitor conversation
            </p>
            <h2
              id={titleId}
              className="mt-0.5 font-display text-lg leading-snug text-fg text-balance"
            >
              {title.length > 96 ? `${title.slice(0, 95).trimEnd()}…` : title}
            </h2>
            {detail ? (
              <p className="mt-1 text-xs text-muted">
                Updated {new Date(detail.updated_at).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 px-2 py-2 text-muted hover:text-fg"
            aria-label="Close"
            autoFocus
            onClick={onClose}
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-sm text-muted">Loading conversation…</p>
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : detail && detail.messages.length === 0 ? (
            <p className="text-sm text-muted">No messages in this thread.</p>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              {detail.messages.map((m) => (
                <ChatRow
                  key={m.id}
                  role={m.role === "user" ? "user" : "assistant"}
                  speaker={m.role === "user" ? "Visitor" : "AI"}
                  content={m.content}
                />
              ))}
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
          <p className="text-xs text-muted">Read-only — visitor threads can’t be replied to here.</p>
        </footer>
      </div>
    </div>
  );
}
