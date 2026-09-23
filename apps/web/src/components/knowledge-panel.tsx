"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  CloudUploadIcon,
  DatabaseIcon,
  DocIcon,
  ExternalIcon,
  LightbulbIcon,
  LinkIcon,
  NoteIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  apiFetch,
  apiUpload,
  type AiProfile,
  type KnowledgeDocument,
} from "@/lib/api";
import { isUiPreview, PREVIEW_DOCS } from "@/lib/ui-preview";

const POLL_MS = 2500;
const NOTE_MAX = 1000;

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
  continueHref?: string;
  showSkip?: boolean;
  /** Full mockup chrome for /app/knowledge */
  variant?: "app" | "onboarding";
};

/**
 * Shared knowledge manager for onboarding + /app/knowledge.
 */
export function KnowledgePanel({
  continueHref = "/onboarding/test",
  showSkip = false,
  variant = "onboarding",
}: Props) {
  const router = useRouter();
  const isApp = variant === "app";
  const [profileId, setProfileId] = useState<string | null>(null);
  const [docs, setDocs] = useState<KnowledgeDocument[]>(
    isUiPreview() ? PREVIEW_DOCS : [],
  );
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
          if (isUiPreview()) {
            setDocs(PREVIEW_DOCS);
            return;
          }
          router.replace(
            `/sign-in?next=${isApp ? "/app/knowledge" : "/onboarding/knowledge"}`,
          );
          return;
        }
        if (isUiPreview()) {
          setDocs(PREVIEW_DOCS);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isApp, loadDocs, router]);

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
    if (!file || busy) return;
    if (!profileId) {
      if (isUiPreview()) {
        setMessage(`Preview: would upload ${file.name}`);
      }
      return;
    }
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
    if (!notes.trim() || busy) return;
    if (!profileId) {
      if (isUiPreview()) {
        setMessage("Preview: note would be saved");
        setNotes("");
      }
      return;
    }
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
    if (!url.trim() || busy) return;
    if (!profileId) {
      if (isUiPreview()) {
        setMessage("Preview: URL would be queued");
        setUrl("");
      }
      return;
    }
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
    if (busy) return;
    if (!profileId) {
      if (isUiPreview()) {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        setMessage("Preview: document removed");
      }
      return;
    }
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

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    void onUpload(file);
  }

  const readyCount = docs.filter((d) => d.status === "ready").length;
  const noteLen = notes.length;

  return (
    <div className={isApp ? "mx-auto w-full max-w-6xl space-y-3" : "space-y-6"}>
      {isApp ? (
        <header className="flex min-w-0 flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
              Knowledge
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight text-fg md:text-[2rem]">
              Add your <span className="text-accent">knowledge</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted text-balance">
              Upload documents, add notes or a URL, and track processing
              status.
            </p>

            <div className="mt-3 grid flex-1 grid-cols-2 gap-2 md:grid-cols-4 md:items-stretch">
              <Shortcut
                tone="mint"
                icon={<DocIcon className="h-3.5 w-3.5" />}
                title="Upload docs"
                subtitle="PDF, DOCX, TXT"
              />
              <Shortcut
                tone="purple"
                icon={<NoteIcon className="h-3.5 w-3.5" />}
                title="Add notes"
                subtitle="Save key info"
              />
              <Shortcut
                tone="sky"
                icon={<LinkIcon className="h-3.5 w-3.5" />}
                title="Add a URL"
                subtitle="From the web"
              />
              <Shortcut
                tone="amber"
                icon={<DatabaseIcon className="h-3.5 w-3.5" />}
                title="Track status"
                subtitle="See processing"
              />
            </div>
        </header>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)] lg:col-span-3">
          <div className="flex items-start gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--tone-mint)] text-accent">
              <CloudUploadIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg text-fg">Upload a document</h2>
              <p className="mt-0.5 text-xs text-muted">
                PDF, DOCX, or TXT — max 8 MB.
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.html,.htm"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragOver
                ? "border-accent bg-accent-soft/60"
                : "border-border bg-[var(--atmosphere-1)]/40 hover:border-accent/50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-accent shadow-sm">
              <CloudUploadIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-fg">
              Drag & drop your file here or click to choose a file
            </p>
            <span className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
              Choose File
            </span>
          </button>
        </section>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <form
            onSubmit={onSaveNotes}
            className="flex flex-1 flex-col rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)]"
          >
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]">
                <NoteIcon className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg text-fg">Add a note</h2>
            </div>
            <textarea
              id="notes"
              rows={4}
              maxLength={NOTE_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Things people should know about your work…"
              className="mt-3 min-h-[6rem] w-full flex-1 resize-none rounded-xl border border-border bg-[var(--atmosphere-1)]/30 px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {noteLen}/{NOTE_MAX}
              </p>
              <Button
                type="submit"
                disabled={busy || !notes.trim()}
                className="rounded-xl"
              >
                Save note
              </Button>
            </div>
          </form>

          <form
            onSubmit={onIngestUrl}
            className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)]"
          >
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--tone-sky)] text-[#2563eb]">
                <LinkIcon className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg text-fg">
                Add a URL{isApp ? " (optional)" : ""}
              </h2>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-xl border border-border bg-[var(--atmosphere-1)]/30 px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
                disabled={busy}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={busy || !url.trim()}
                className="rounded-xl bg-white"
              >
                Add URL
              </Button>
            </div>
          </form>
        </div>
      </div>

      <section
        id="track-status"
        className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)]"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff7e6] text-[var(--tone-amber)]">
            <DatabaseIcon className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg text-fg">Documents & status</h2>
        </div>
        {docs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-[var(--atmosphere-1)]/40 px-4 py-8 text-center text-sm text-muted">
            No documents yet
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
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
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {isApp ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/15 bg-accent-soft/70 px-4 py-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
              <LightbulbIcon className="h-4 w-4" />
            </span>
            <p className="text-sm text-fg text-balance">
              <span className="font-medium">Pro tip:</span> Add your resumes,
              project docs, notes, or useful links to help your AI give more
              relevant and personalized answers.
            </p>
          </div>
          <ButtonLink
            href="/app/chat"
            variant="secondary"
            className="gap-2 rounded-xl bg-white py-2"
          >
            Learn more
            <ExternalIcon className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={continueHref} className="rounded-xl">
            {readyCount > 0 ? "Continue" : "Continue without docs"}
          </ButtonLink>
          {showSkip ? (
            <ButtonLink
              href={continueHref}
              variant="secondary"
              className="rounded-xl"
            >
              Skip with warning
            </ButtonLink>
          ) : null}
        </div>
      )}

      {!isApp && readyCount === 0 ? (
        <p className="text-xs text-muted">
          Prefer at least one ready source before publish — answers will only use
          interview facts until documents finish processing.
        </p>
      ) : null}
    </div>
  );
}

function Shortcut({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: "mint" | "purple" | "sky" | "amber";
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const tones = {
    mint: "bg-[var(--tone-mint)] text-accent",
    purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
    sky: "bg-[var(--tone-sky)] text-[#2563eb]",
    amber: "bg-[#fff7e6] text-[var(--tone-amber)]",
  } as const;

  return (
    <div className="flex h-full min-h-[4.75rem] min-w-0 items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-3 shadow-[0_6px_16px_-14px_rgba(15,31,28,0.28)] sm:min-h-[5.5rem]">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-snug text-fg">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs leading-snug text-muted">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
