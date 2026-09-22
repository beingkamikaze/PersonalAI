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
  type AiProfile,
  type MemoryItem,
} from "@/lib/api";
import { isUiPreview, PREVIEW_MEMORY_ITEMS } from "@/lib/ui-preview";

const MEMORY_TYPES = [
  "preference",
  "fact",
  "boundary",
  "project",
  "other",
] as const;

/**
 * Owner memories manager — mockup layout with equal-width cards.
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      {/* Compact hero: info chips fill blank under copy, beside robot */}
      <header className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
            Memories
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-fg md:text-[2rem]">
            Your saved memories
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted text-balance">
            Facts saved from conversations with your AI. Edit or delete anything
            that looks wrong before visitors hear them.
          </p>

          <div className="mt-3 grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:items-stretch">
            <FeatureChip
              tone="mint"
              icon={<BrainIcon className="h-3.5 w-3.5" />}
              title="Personalized"
              subtitle="Knows you better"
            />
            <FeatureChip
              tone="purple"
              icon={<LockIcon className="h-3.5 w-3.5" />}
              title="Private"
              subtitle="Only you see these"
            />
            <FeatureChip
              tone="amber"
              icon={<ShieldIcon className="h-3.5 w-3.5" />}
              title="In your control"
              subtitle="Edit anytime"
            />
          </div>
        </div>

        <div className="relative hidden w-[140px] shrink-0 self-stretch lg:block lg:w-[180px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle_at_center,rgba(180,220,230,0.45)_0%,rgba(180,220,230,0.18)_42%,transparent_68%)]"
          />
          <Image
            src="/dashboard/memory-companion-3d.png"
            alt=""
            width={320}
            height={320}
            className="relative h-auto w-full select-none"
            priority
          />
          <p className="pointer-events-none absolute top-2 left-0 z-10 max-w-[7rem] font-display text-[11px] italic leading-snug text-accent">
            A more you, a better AI.
          </p>
        </div>
      </header>

      {/* List panel sits higher — chips no longer take a full row */}
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)] md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full rounded-xl border border-border bg-[var(--atmosphere-1)]/30 py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              aria-label="Search memories"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {MEMORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="gap-1.5 rounded-xl"
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

        {adding ? (
          <form
            onSubmit={onAdd}
            className="mt-4 rounded-xl border border-border bg-[var(--atmosphere-1)]/30 p-4"
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
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                disabled={busy}
              >
                {MEMORY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={busy || !newContent.trim()} className="rounded-xl">
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

        {/* Step 4: stacked equal-width memory rows */}
        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-[var(--atmosphere-1)]/40 px-4 py-10 text-center text-sm text-muted">
            No memories yet. Open Chat and state a preference — it will appear
            here shortly.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((mem) => (
              <li key={mem.id} className="w-full">
                {editingId === mem.id ? (
                  <form
                    onSubmit={onSave}
                    className="w-full rounded-xl border border-border bg-[var(--atmosphere-1)]/30 p-4"
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
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
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
                        className="rounded-xl"
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
                    onEdit={() => startEdit(mem)}
                    onDelete={() => void onDelete(mem.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Step 5: tip banner — same full width as list */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/15 bg-accent-soft/70 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
            <LightbulbIcon className="h-4 w-4" />
          </span>
          <p className="text-sm text-fg text-balance">
            <span className="font-medium">Tip:</span> The more memories you save,
            the more personalized and accurate your AI becomes.
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

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}

function FeatureChip({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: "mint" | "purple" | "amber";
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const tones = {
    mint: "bg-[var(--tone-mint)] text-accent",
    purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
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

function MemoryCard({
  mem,
  busy,
  onEdit,
  onDelete,
}: {
  mem: MemoryItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta(mem.memory_type);

  return (
    <article className="flex w-full items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-[0_6px_18px_-14px_rgba(15,31,28,0.28)]">
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
        aria-hidden
      >
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-fg">{mem.content}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}
          >
            {mem.memory_type}
          </span>
          <span className="rounded-full bg-[var(--atmosphere-1)] px-2 py-0.5 text-[11px] text-muted">
            importance {mem.importance.toFixed(2)}
          </span>
          <span className="rounded-full bg-[var(--atmosphere-1)] px-2 py-0.5 text-[11px] text-muted">
            confidence {mem.confidence.toFixed(2)}
          </span>
          <span className="rounded-full bg-[var(--atmosphere-1)] px-2 py-0.5 text-[11px] text-muted">
            {mem.source}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            className="h-8 gap-1 rounded-lg px-2.5 py-0 text-xs"
            disabled={busy}
            onClick={onEdit}
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
            disabled={busy}
            onClick={onDelete}
            aria-label="Delete memory"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg"
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
