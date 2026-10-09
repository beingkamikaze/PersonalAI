"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { InfoFeatureStrip } from "@/components/info-feature-strip";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  BrainIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatIcon,
  ExternalIcon,
  LightbulbIcon,
  LockIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  apiFetch,
  type MemoryItem,
} from "@/lib/api";
import { isUiPreview, PREVIEW_MEMORY_ITEMS } from "@/lib/ui-preview";
import {
  invalidateMemories,
  loadProfile,
  rememberMemories,
} from "@/lib/owner-cache";

const MEMORY_TYPES = [
  "preference",
  "fact",
  "boundary",
  "project",
  "other",
] as const;

/**
 * Owner memories manager. Presentation matches the Knowledge / Chats shell.
 */
export default function MemoriesPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>(
    isUiPreview() ? PREVIEW_MEMORY_ITEMS : [],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<string>("fact");
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<string>("preference");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const list = await apiFetch<MemoryItem[]>(`/ai/${id}/memories`);
    setMemories(list);
    rememberMemories(id, list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadProfile();
        if (cancelled) return;
        setProfileId(me.id);
        await load(me.id);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          if (isUiPreview()) {
            setMemories(PREVIEW_MEMORY_ITEMS);
            return;
          }
          router.replace("/sign-in?next=/app/memories");
          return;
        }
        if (isUiPreview()) {
          setMemories(PREVIEW_MEMORY_ITEMS);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memories.filter((m) => {
      if (category !== "all" && m.memory_type !== category) return false;
      if (!q) return true;
      return (
        m.content.toLowerCase().includes(q) ||
        m.memory_type.toLowerCase().includes(q) ||
        m.source.toLowerCase().includes(q)
      );
    });
  }, [memories, query, category]);

  function startEdit(mem: MemoryItem) {
    setEditingId(mem.id);
    setEditContent(mem.content);
    setEditType(mem.memory_type);
    setAdding(false);
    setMessage(null);
    setError(null);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editingId || busy || !editContent.trim()) return;
    if (!profileId) {
      if (isUiPreview()) {
        setMemories((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? { ...m, content: editContent.trim(), memory_type: editType }
              : m,
          ),
        );
        setEditingId(null);
        setMessage("Preview: memory updated");
      }
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch<MemoryItem>(`/memories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content: editContent.trim(),
          memory_type: editType,
        }),
      });
      invalidateMemories(profileId);
      setEditingId(null);
      setMessage("Memory saved.");
      await load(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (busy) return;
    if (!profileId) {
      if (isUiPreview()) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        if (editingId === id) setEditingId(null);
        setMessage("Preview: memory deleted");
      }
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/memories/${id}`, { method: "DELETE" });
      invalidateMemories(profileId);
      setMessage("Memory deleted.");
      if (editingId === id) setEditingId(null);
      await load(profileId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (busy || !newContent.trim()) return;
    if (!profileId) {
      if (isUiPreview()) {
        const item: MemoryItem = {
          id: `mem-local-${Date.now()}`,
          ai_profile_id: "preview-profile",
          memory_type: newType,
          content: newContent.trim(),
          importance: 0.7,
          confidence: 0.8,
          source: "owner_chat",
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
        };
        setMemories((prev) => [item, ...prev]);
        setNewContent("");
        setAdding(false);
        setMessage("Preview: memory added");
      }
      return;
    }
    // API may not support create yet — keep UI ready; fall back message if missing
    setBusy(true);
    setError(null);
    try {
      await apiFetch<MemoryItem>(`/ai/${profileId}/memories`, {
        method: "POST",
        body: JSON.stringify({
          content: newContent.trim(),
          memory_type: newType,
        }),
      });
      invalidateMemories(profileId);
      setNewContent("");
      setAdding(false);
      setMessage("Memory added.");
      await load(profileId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Add memory is not available yet — use Chat to create memories.",
      );
    } finally {
      setBusy(false);
    }
  }

  const noMemories = memories.length === 0;

  return (
    <div className="relative w-full space-y-3.5 md:px-2">
      <header className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_9.35rem] xl:gap-x-3">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
            Memories
          </p>
          <h1 className="mt-2 font-display text-[2.05rem] leading-[1.08] tracking-tight text-fg sm:text-[2.3rem]">
            Your saved <span className="text-accent">memories</span>
          </h1>
          <p className="mt-2 max-w-[34rem] text-sm leading-snug text-muted">
            Short facts, preferences, and boundaries you want your AI to follow.
            This list is private. Visitors never see it, but answers can use
            what you save. Longer documents belong in Knowledge.
          </p>
        </div>

        <div className="pointer-events-none relative hidden h-full xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:block">
          <p className="absolute top-1 right-[8.4rem] w-[7.25rem] text-right font-display text-[13px] leading-tight font-medium text-accent italic">
            A more you,
            <br />
            a better AI.
          </p>
          <svg
            viewBox="0 0 72 36"
            className="absolute top-10 right-[8.15rem] h-7 w-12 text-accent"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 8c18 1 28 8 58 16"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M48 18 62 24.5 49 28"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="absolute right-0 bottom-0 h-[9.6rem] w-[8rem]">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/dashboard/memory-companion-3d.png"
                alt=""
                width={1024}
                height={1024}
                priority
                className="absolute h-auto max-w-none select-none"
                style={{ width: "145.42%", left: "-37.21%", top: "-7.57%" }}
              />
            </div>
          </div>
        </div>

        <InfoFeatureStrip
          label="How memory works"
          items={[
            {
              title: "Used in answers",
              description: "Your AI can follow these facts and preferences.",
              tone: "mint",
              icon: <BrainIcon className="h-4 w-4" />,
            },
            {
              title: "Private",
              description: "Visitors never see your memory list.",
              tone: "purple",
              icon: <LockIcon className="h-4 w-4" />,
            },
            {
              title: "In your control",
              description: "Edit or remove anything anytime.",
              tone: "amber",
              icon: <ShieldIcon className="h-4 w-4" />,
            },
          ]}
          className="mt-5 xl:col-start-1 xl:row-start-2"
        />
      </header>

      <section className="rounded-[20px] border border-border bg-white px-4 pt-5 pb-4 shadow-[0_16px_40px_-24px_rgba(18,40,32,0.28)] md:px-5 md:pt-6 md:pb-5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="h-11 w-full rounded-xl border border-border bg-white py-2 pl-10 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              aria-label="Search memories"
            />
          </div>
          <div className="flex gap-2.5 lg:shrink-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm text-fg focus:border-accent focus:outline-none sm:w-[10.5rem] sm:flex-none"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {MEMORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {memoryTypeLabel(t)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="!h-11 shrink-0 gap-1.5 !rounded-xl px-4"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setMessage(null);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add a memory
            </Button>
          </div>
        </div>

        {adding ? (
          <form
            onSubmit={onAdd}
            className="mt-4 rounded-2xl border border-border bg-[#f7fbf9] p-4"
          >
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              placeholder="Write a memory…"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
              disabled={busy}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
                disabled={busy}
              >
                {MEMORY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                disabled={busy || !newContent.trim()}
                className="!h-10 !rounded-xl"
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAdding(false);
                  setNewContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {filtered.length === 0 ? (
          noMemories ? (
            adding ? null : (
              <EmptyMemories
                onAdd={() => {
                  setAdding(true);
                  setEditingId(null);
                  setMessage(null);
                }}
              />
            )
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-border bg-[#f7fbf9] px-4 py-8 text-center text-sm text-muted">
              No memories match this search.
            </p>
          )
        ) : (
          <ul className="mt-5 space-y-2.5">
            {filtered.map((mem, index) => (
              <li key={mem.id} className="w-full">
                {editingId === mem.id ? (
                  <form
                    onSubmit={onSave}
                    className="w-full rounded-2xl border border-border bg-[#f7fbf9] p-4"
                  >
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                      disabled={busy}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
                        disabled={busy}
                      >
                        {MEMORY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        disabled={busy || !editContent.trim()}
                        className="!h-10 !rounded-xl"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <MemoryCard
                    mem={mem}
                    busy={busy}
                    highlighted={index === 0}
                    onEdit={() => startEdit(mem)}
                    onDelete={() => void onDelete(mem.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-[#f6faf8] px-4 py-3.5 sm:flex-nowrap sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
            <LightbulbIcon className="h-4 w-4" />
          </span>
          <p className="text-sm leading-snug text-fg">
            <span className="font-medium">Tip:</span> The more memories you
            save, the more personalized and accurate your AI becomes.
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
    </div>
  );
}

function EmptyMemories({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-[#f7fbf9] px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--tone-mint)] text-accent">
        <BrainIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-lg leading-tight text-fg">
        No memories yet
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-snug text-muted">
        Add a preference, a boundary, or a fact. You can also say one in Chat
        and it will show up here.
      </p>
      <Button type="button" className="mt-4 gap-1.5 !rounded-xl" onClick={onAdd}>
        <PlusIcon className="h-4 w-4" />
        Add a memory
      </Button>
    </div>
  );
}

function MemoryCard({
  mem,
  busy,
  highlighted,
  onEdit,
  onDelete,
}: {
  mem: MemoryItem;
  busy: boolean;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta(mem.memory_type);

  return (
    <article
      className={`flex w-full flex-col gap-3 rounded-2xl border px-3.5 py-3 transition lg:flex-row lg:items-start lg:gap-3.5 lg:px-4 lg:py-3.5 ${
        highlighted
          ? "border-[#d7ebe4] bg-[#f4faf7]"
          : "border-border bg-white hover:bg-[#f7fbf9]"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
          aria-hidden
        >
          {meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-fg">
            {mem.content}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}
            >
              {memoryTypeLabel(mem.memory_type)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-start lg:gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            className="!h-8 gap-1 !rounded-lg border border-border bg-white px-2 py-0 text-xs font-normal text-muted hover:text-fg"
            disabled={busy}
            onClick={onEdit}
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
            disabled={busy}
            onClick={onDelete}
            aria-label="Delete memory"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-[#f3f6f5] hover:text-fg"
            aria-label="More options"
          >
            <MoreIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted">{relativeSaved(mem.created_at)}</p>
      </div>
    </article>
  );
}

function memoryTypeLabel(type: string): string {
  switch (type) {
    case "preference":
      return "Preference";
    case "fact":
      return "Fact";
    case "boundary":
      return "Boundary";
    case "project":
      return "Project";
    case "other":
      return "Other";
    default:
      return type;
  }
}

function typeMeta(type: string): {
  icon: ReactNode;
  tone: string;
  pill: string;
} {
  switch (type) {
    case "preference":
      return {
        icon: <ChatIcon className="h-4 w-4" />,
        tone: "bg-[var(--tone-mint)] text-accent",
        pill: "bg-accent-soft text-accent",
      };
    case "boundary":
      return {
        icon: <BriefcaseIcon className="h-4 w-4" />,
        tone: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
        pill: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
      };
    case "project":
      return {
        icon: <CalendarIcon className="h-4 w-4" />,
        tone: "bg-[#fff7e6] text-[var(--tone-amber)]",
        pill: "bg-[#fff7e6] text-[var(--tone-amber)]",
      };
    default:
      return {
        icon: <BrainIcon className="h-4 w-4" />,
        tone: "bg-[var(--tone-sky)] text-[#2563eb]",
        pill: "bg-[var(--tone-sky)] text-[#2563eb]",
      };
  }
}

function relativeSaved(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Saved recently";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days <= 0) return "Saved today";
  if (days === 1) return "Saved 1 day ago";
  if (days < 7) return `Saved ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Saved 1 week ago";
  return `Saved ${weeks} weeks ago`;
}
