"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ApiError,
  apiFetch,
  apiUpload,
  type AiProfile,
  type KnowledgeDocument,
} from "@/lib/api";

const POLL_MS = 2500;

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

type Props = {
  /** Where "Continue" goes after knowledge (onboarding vs stay on app page) */
  continueHref?: string;
  showSkip?: boolean;
};

/**
 * Shared knowledge manager for onboarding + /app/knowledge.
 * Polls while any document is pending/processing so the UI updates without refresh.
 */
export function KnowledgePanel({
  continueHref = "/onboarding/test",
  showSkip = false,
}: Props) {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async (id: string) => {
    const list = await apiFetch<KnowledgeDocument[]>(`/ai/${id}/documents`);
    setDocs(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        if (cancelled) return;
        setProfileId(me.id);
        await loadDocs(me.id);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/onboarding/knowledge");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDocs, router]);

  // Poll while ingest is in flight
  useEffect(() => {
    if (!profileId) return;
    const inflight = docs.some(
      (d) => d.status === "pending" || d.status === "processing",
    );
    if (!inflight) return;
    const timer = window.setInterval(() => {
      void loadDocs(profileId).catch(() => {
        /* ignore transient poll errors */
      });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [docs, loadDocs, profileId]);

  async function onUpload(file: File | null) {
    if (!profileId || !file || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiUpload<KnowledgeDocument>(`/ai/${profileId}/documents`, file);
      setMessage(`Uploaded ${file.name} — processing…`);
      await loadDocs(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSaveNotes(e: FormEvent) {
    e.preventDefault();
    if (!profileId || !notes.trim() || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch<KnowledgeDocument>(`/ai/${profileId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: notes.trim(), title: "notes" }),
      });
      setNotes("");
      setMessage("Notes saved — processing…");
      await loadDocs(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Notes failed");
    } finally {
      setBusy(false);
    }
  }

  async function onIngestUrl(e: FormEvent) {
    e.preventDefault();
    if (!profileId || !url.trim() || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch<KnowledgeDocument>(`/ai/${profileId}/knowledge/url`, {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setUrl("");
      setMessage("URL queued — processing…");
      await loadDocs(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "URL ingest failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(docId: string) {
    if (!profileId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/documents/${docId}`, { method: "DELETE" });
      setMessage("Document deleted.");
      await loadDocs(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className="space-y-8">
      <div>
        <label className="text-sm font-medium text-fg">Upload resume or docs</label>
        <p className="mt-1 text-sm text-muted">PDF, DOCX, or TXT — max 8 MB.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.html,.htm"
            className="block w-full max-w-md text-sm text-muted file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            disabled={busy || !profileId}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <form onSubmit={onSaveNotes} className="space-y-3">
        <label htmlFor="notes" className="text-sm font-medium text-fg">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Things people should know about your work…"
          className="w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
          disabled={busy || !profileId}
        />
        <Button type="submit" disabled={busy || !notes.trim()}>
          Save notes
        </Button>
      </form>

      <form onSubmit={onIngestUrl} className="space-y-3">
        <label htmlFor="url" className="text-sm font-medium text-fg">
          Optional URL
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="min-w-[240px] flex-1 rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
            disabled={busy || !profileId}
          />
          <Button type="submit" variant="secondary" disabled={busy || !url.trim()}>
            Add URL
          </Button>
        </div>
      </form>

      <div>
        <h2 className="font-display text-xl text-fg">Documents</h2>
        {docs.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-border bg-elevated px-4 py-8 text-center text-sm text-muted">
            No documents yet
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-fg">{doc.filename}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {doc.source_type} · {statusLabel(doc.status)}
                    {doc.error_message ? ` — ${doc.error_message}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDelete(doc.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={continueHref}>
          {readyCount > 0 ? "Continue" : "Continue without docs"}
        </ButtonLink>
        {showSkip ? (
          <ButtonLink href={continueHref} variant="secondary">
            Skip with warning
          </ButtonLink>
        ) : null}
      </div>
      {readyCount === 0 ? (
        <p className="text-xs text-muted">
          Prefer at least one ready source before publish — answers will only use
          interview facts until documents finish processing.
        </p>
      ) : null}
    </div>
  );
}
