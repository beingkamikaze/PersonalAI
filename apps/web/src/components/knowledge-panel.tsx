"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useHydratedReducedMotion } from "@/lib/motion";
import { AuthCurveMark } from "@/components/auth-edge-curves";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/dashboard-card";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ChevronRightIcon,
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
  type KnowledgeDocument,
} from "@/lib/api";
import { isUiPreview, PREVIEW_DOCS } from "@/lib/ui-preview";
import {
  invalidateAnalytics,
  invalidateKnowledge,
  loadProfile,
  readDocumentsCache,
  rememberDocuments,
} from "@/lib/owner-cache";

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

function statusTone(status: string): string {
  if (status === "failed") return "text-red-700";
  if (status === "pending" || status === "processing") return "text-[#b45309]";
  return "text-muted";
}

const cardShadow = "shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)]";

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
  const reduceMotion = useHydratedReducedMotion();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [extra, setExtra] = useState<"note" | "url" | null>(null);
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
  const dropRef = useRef<HTMLButtonElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLElement>(null);

  function reveal(el: HTMLElement | null) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  const loadDocs = useCallback(async (id: string) => {
    const previous = readDocumentsCache(id);
    const list = await apiFetch<KnowledgeDocument[]>(`/ai/${id}/documents`);
    setDocs(list);
    rememberDocuments(id, list);
    const ready = (rows: KnowledgeDocument[]) =>
      rows.filter((row) => row.status === "ready").length;
    if (previous && ready(previous) !== ready(list)) {
      invalidateAnalytics(id);
    }
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadProfile();
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

  useEffect(() => {
    if (isApp || !extra) return;
    if (extra === "note") notesRef.current?.focus();
    if (extra === "url") urlRef.current?.focus();
  }, [extra, isApp]);

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
      invalidateKnowledge(profileId);
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
      invalidateKnowledge(profileId);
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
      invalidateKnowledge(profileId);
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
      invalidateKnowledge(profileId);
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
  const hasDocuments = docs.length > 0;

  const entrance = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: reduceMotion
          ? { duration: 0 }
          : { staggerChildren: 0.08, delayChildren: 0.12 },
      },
    }),
    [reduceMotion],
  );
  const piece = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: reduceMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      },
    }),
    [reduceMotion],
  );

  if (!isApp) {
    return (
      <motion.div
        className="space-y-5"
        initial="hidden"
        animate="visible"
        variants={entrance}
      >
        <motion.section
          id="upload-document"
          className={`${DASHBOARD_CARD_CLASS} px-5 py-6 sm:px-8 sm:py-7`}
          variants={piece}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"
              aria-hidden
            >
              <SparkleIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              Knowledge
            </p>
          </div>
          <h2 className="mt-4 font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-fg sm:text-[1.7rem]">
            Upload your knowledge
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
            Give your AI reference material it can use when answering questions.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.html,.htm"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />

          <button
            ref={dropRef}
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
            className={`group mt-5 flex min-h-[13.5rem] w-full flex-col items-center justify-center rounded-[18px] border border-dashed px-6 py-8 text-center transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
              dragOver
                ? "border-accent bg-accent-soft shadow-[0_0_0_4px_var(--accent-soft)]"
                : "border-[#c9ddd4] bg-[#f7fbf9] hover:border-accent/50 hover:bg-accent-soft/50"
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform duration-200 ${
                dragOver ? "scale-110" : "group-hover:scale-105"
              }`}
            >
              <CloudUploadIcon className="h-5 w-5" />
            </span>
            <span className="mt-3 block font-display text-[1.35rem] leading-tight tracking-[-0.02em] text-fg">
              Drop your files here
            </span>
            <span className="mt-1.5 block text-sm text-muted">
              or choose files from your computer
            </span>
            <span className="mt-2 block text-xs tracking-wide text-muted/80">
              PDF · DOCX · TXT · max 8 MB
            </span>
            <span className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white transition-colors group-hover:bg-accent-hover">
              Choose files
            </span>
          </button>
        </motion.section>

        <motion.div variants={piece}>
          <p className="text-sm text-muted">Or add something another way</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-expanded={extra === "note"}
              aria-controls="knowledge-note"
              onClick={() =>
                setExtra((current) => (current === "note" ? null : "note"))
              }
              className={`flex items-start gap-3 rounded-[22px] border bg-white px-4 py-4 text-left shadow-[0_16px_40px_-28px_rgba(18,40,32,0.28)] transition-[border-color,background-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                extra === "note"
                  ? "border-accent bg-accent-soft/40"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <NoteIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">
                  Add a note
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                  Add a fact or piece of context.
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-expanded={extra === "url"}
              aria-controls="knowledge-url"
              onClick={() =>
                setExtra((current) => (current === "url" ? null : "url"))
              }
              className={`flex items-start gap-3 rounded-[22px] border bg-white px-4 py-4 text-left shadow-[0_16px_40px_-28px_rgba(18,40,32,0.28)] transition-[border-color,background-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                extra === "url"
                  ? "border-accent bg-accent-soft/40"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <LinkIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">
                  Add a URL
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                  Let your AI learn from a webpage.
                </span>
              </span>
            </button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {extra === "note" ? (
              <motion.form
                id="knowledge-note"
                key="note"
                onSubmit={onSaveNotes}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`${DASHBOARD_CARD_CLASS} mt-3 px-5 py-5`}
              >
                <label htmlFor="notes" className="text-sm font-medium text-fg">
                  Add a note
                </label>
                <textarea
                  ref={notesRef}
                  id="notes"
                  rows={4}
                  maxLength={NOTE_MAX}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, NOTE_MAX))}
                  placeholder="Things people should know about your work..."
                  className="mt-3 min-h-[7.5rem] w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-[15px] leading-relaxed text-fg placeholder:text-muted/70 transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-[rgba(0,109,91,0.18)]"
                  disabled={busy}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs tabular-nums text-muted">
                    {noteLen}/{NOTE_MAX}
                  </p>
                  <Button
                    type="submit"
                    disabled={busy || !notes.trim()}
                    className="rounded-xl px-4"
                  >
                    Save note
                  </Button>
                </div>
              </motion.form>
            ) : null}
            {extra === "url" ? (
              <motion.form
                id="knowledge-url"
                key="url"
                onSubmit={onIngestUrl}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`${DASHBOARD_CARD_CLASS} mt-3 px-5 py-5`}
              >
                <label htmlFor="url" className="text-sm font-medium text-fg">
                  Add a URL
                </label>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={urlRef}
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-fg placeholder:text-muted/70 transition-colors duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-[rgba(0,109,91,0.18)]"
                    disabled={busy}
                  />
                  <Button
                    type="submit"
                    disabled={busy || !url.trim()}
                    className="rounded-xl px-4 sm:shrink-0"
                  >
                    Add URL
                  </Button>
                </div>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}

        <motion.section
          ref={statusRef}
          id="track-status"
          tabIndex={-1}
          variants={piece}
          className={`${DASHBOARD_CARD_CLASS} scroll-mt-6 px-5 py-5 outline-none sm:px-6`}
        >
          <h2 className="font-display text-[1.35rem] leading-tight tracking-[-0.01em] text-fg">
            Your knowledge
          </h2>
          {docs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-[#f7fbf9] px-4 py-7 text-center">
              <p className="text-sm text-fg">Your knowledge will appear here.</p>
              <p className="mt-1 text-sm text-muted">
                Files you add will be processed and become available to your AI.
              </p>
            </div>
          ) : (
            <ul className="mt-3 border-t border-border">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <DocIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {doc.filename}
                      </p>
                      <p className={`mt-0.5 text-xs leading-4 ${statusTone(doc.status)}`}>
                        {doc.source_type} · {statusLabel(doc.status)}
                        {doc.error_message ? ` — ${doc.error_message}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    className="!h-8 shrink-0 px-2 py-1 text-sm text-muted hover:text-fg"
                    onClick={() => void onDelete(doc.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.div variants={piece}>
          {hasDocuments && readyCount === 0 ? (
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              Your files are still processing. You can continue — your AI will
              use them when they&apos;re ready.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <ButtonLink
              href={continueHref}
              className="w-full gap-1.5 rounded-xl px-5 sm:w-auto"
            >
              {hasDocuments
                ? "Continue to testing"
                : "Continue without documents"}
              <ChevronRightIcon className="h-4 w-4" />
            </ButtonLink>
            {showSkip ? (
              hasDocuments ? (
                <ButtonLink
                  href={continueHref}
                  variant="ghost"
                  className="px-1 text-muted hover:bg-transparent"
                >
                  Skip for now
                </ButtonLink>
              ) : (
                <ButtonLink
                  href="/onboarding/interview"
                  variant="ghost"
                  className="px-1 text-muted hover:bg-transparent"
                >
                  Back
                </ButtonLink>
              )
            ) : null}
          </div>
          <p className="mt-4 text-center text-[13px] text-muted">
            You can add or update knowledge anytime.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div
      className={
        isApp
          ? "relative w-full space-y-3 xl:pr-8"
          : "space-y-6"
      }
    >
      {isApp ? (
        <header className="relative">
          <div className="min-w-0 xl:pr-[17rem]">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
              Knowledge
            </p>
            <h1 className="mt-1.5 font-display text-[2.05rem] leading-[1.08] tracking-tight text-fg sm:text-[2.35rem]">
              Add your <span className="text-accent">knowledge</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-snug text-muted">
              Documents, notes, and links your AI can answer from. Short facts,
              preferences, and boundaries belong in Memory.
            </p>
          </div>

          <div className="pointer-events-none absolute top-0 right-1 hidden h-[8.15rem] w-[17rem] xl:block">
            <AuthCurveMark className="absolute top-1 right-0 h-28 w-7 -scale-x-100 text-accent/30" />
            <p className="absolute top-0.5 right-[8.15rem] w-[7.15rem] text-right font-display text-[13px] leading-[1.25] font-medium text-accent italic">
              Feed your AI with
              <br />
              what matters.
            </p>
            <svg
              viewBox="0 0 72 32"
              className="absolute top-[2.55rem] right-[7.4rem] h-6 w-12 text-accent"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6c16 2 30 10 58 18"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
              <path
                d="M48 18.5 62 24.5 50 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="absolute top-0 right-3 h-[7.8rem] w-[7.25rem] overflow-hidden">
              <Image
                src="/dashboard/knowledge-companion-3d.png"
                alt=""
                width={1024}
                height={1024}
                priority
                className="absolute h-auto max-w-none select-none"
                style={{ width: "136%", left: "-16%", top: "-13%" }}
              />
            </div>
          </div>

          <div className="relative z-10 mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:mt-[3.05rem] xl:grid-cols-4">
            <Shortcut
              tone="mint"
              icon={<DocIcon className="h-4 w-4" />}
              title="Upload docs"
              subtitle="PDF, DOCX, TXT"
              onClick={() => reveal(dropRef.current)}
            />
            <Shortcut
              tone="purple"
              icon={<NoteIcon className="h-4 w-4" />}
              title="Add notes"
              subtitle="Save key info"
              onClick={() => reveal(notesRef.current)}
            />
            <Shortcut
              tone="sky"
              icon={<LinkIcon className="h-4 w-4" />}
              title="Add a URL"
              subtitle="From the web"
              onClick={() => reveal(urlRef.current)}
            />
            <Shortcut
              tone="amber"
              icon={<DatabaseIcon className="h-4 w-4" />}
              title="Track status"
              subtitle="See processing"
              onClick={() => reveal(statusRef.current)}
            />
          </div>
        </header>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.72fr)_minmax(17.75rem,1fr)]">
        <section
          id="upload-document"
          className={`flex flex-col rounded-[22px] border border-border bg-white p-5 ${cardShadow}`}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tone-mint)] text-accent">
              <CloudUploadIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg leading-tight tracking-tight text-fg">
                Upload a document
              </h2>
              <p className="mt-1 text-xs leading-snug text-muted">
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
            ref={dropRef}
            type="button"
            disabled={busy}
            aria-label="Choose a file to upload"
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
            className={`mt-3 flex min-h-[6.75rem] w-full flex-col items-center justify-center rounded-[18px] border border-dashed px-6 py-4 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              dragOver
                ? "border-accent bg-accent-soft"
                : "border-[#c9ddd4] bg-[#f7fbf9] hover:border-accent/45"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f4ef] text-accent">
              <CloudUploadIcon className="h-5 w-5" />
            </span>
            <span className="mt-2.5 block max-w-[16.5rem] text-sm text-balance text-fg">
              Drag & drop your file here or click to choose a file
            </span>
            <span className="mt-2.5 inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white">
              Choose File
            </span>
          </button>
        </section>

        <div className="flex flex-col gap-2.5">
          <form
            onSubmit={onSaveNotes}
            className={`flex flex-col rounded-[22px] border border-border bg-white p-5 ${cardShadow}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]">
                <NoteIcon className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg leading-tight tracking-tight text-fg">
                Add a note
              </h2>
            </div>
            <textarea
              ref={notesRef}
              id="notes"
              rows={3}
              maxLength={NOTE_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Things people should know about your work..."
              className="mt-3 h-[4.75rem] w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs tabular-nums text-muted">
                {noteLen}/{NOTE_MAX}
              </p>
              <Button
                type="submit"
                disabled={busy || !notes.trim()}
                className="!h-9 !rounded-xl px-3.5 py-0"
              >
                Save note
              </Button>
            </div>
          </form>

          <form
            onSubmit={onIngestUrl}
            className={`rounded-[22px] border border-border bg-white p-4 ${cardShadow}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--tone-sky)] text-[#2563eb]">
                <LinkIcon className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg leading-tight tracking-tight text-fg">
                Add a URL{isApp ? " (optional)" : ""}
              </h2>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={urlRef}
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
                disabled={busy}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={busy || !url.trim()}
                className="!h-10 shrink-0 !rounded-xl bg-white px-3.5 py-0"
              >
                Add URL
              </Button>
            </div>
          </form>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}

      <section
        ref={statusRef}
        id="track-status"
        tabIndex={-1}
        className={`scroll-mt-6 rounded-[22px] border border-border bg-white px-5 py-4 outline-none ${cardShadow}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff7e6] text-[var(--tone-amber)]">
            <DatabaseIcon className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg leading-tight tracking-tight text-fg">
            Documents & status
          </h2>
        </div>
        {docs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-[#f7fbf9] px-4 py-8 text-center text-sm text-muted">
            No documents yet
          </p>
        ) : (
          <ul className="mt-3.5 border-t border-border">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fdecec] text-[#e11d48]">
                    <DocIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {doc.filename}
                    </p>
                    <p className={`mt-0.5 text-xs leading-4 ${statusTone(doc.status)}`}>
                      {doc.source_type} · {statusLabel(doc.status)}
                      {doc.error_message ? ` — ${doc.error_message}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  className="!h-8 shrink-0 px-2 py-1 text-sm text-muted hover:text-fg"
                  onClick={() => void onDelete(doc.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isApp ? (
        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-[#f6faf8] px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
              <LightbulbIcon className="h-4 w-4" />
            </span>
            <p className="text-sm leading-snug text-fg">
              <span className="font-medium">Pro tip:</span> Add your resumes,
              project docs, notes, or useful links to help your AI give more
              relevant and personalized answers.
            </p>
          </div>
          <ButtonLink
            href="/app/chat"
            variant="secondary"
            className="!h-9 shrink-0 gap-1.5 !rounded-xl bg-white px-3.5 py-0 text-sm"
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
  onClick,
}: {
  tone: "mint" | "purple" | "sky" | "amber";
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  const tones = {
    mint: "bg-[var(--tone-mint)] text-accent",
    purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
    sky: "bg-[var(--tone-sky)] text-[#2563eb]",
    amber: "bg-[#fff7e6] text-[var(--tone-amber)]",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[4.35rem] w-full items-center gap-2.5 rounded-[20px] border border-border bg-white px-3.5 py-2.5 text-left shadow-[0_8px_20px_-16px_rgba(15,31,28,0.4)] transition hover:border-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold leading-tight whitespace-nowrap text-fg">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-tight whitespace-nowrap text-muted">
          {subtitle}
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted/80" />
    </button>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}
