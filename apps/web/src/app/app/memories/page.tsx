"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type MemoryItem,
} from "@/lib/api";

const MEMORY_TYPES = [
  "preference",
  "fact",
  "boundary",
  "project",
  "other",
] as const;

/**
 * Owner memories manager — list / edit / delete.
 * Memories are extracted in the background after owner chat turns.
 */
export default function MemoriesPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<string>("fact");
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
          router.replace("/sign-in?next=/app/memories");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, router]);

  function startEdit(mem: MemoryItem) {
    setEditingId(mem.id);
    setEditContent(mem.content);
    setEditType(mem.memory_type);
    setMessage(null);
    setError(null);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !profileId || busy) return;
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
    if (!profileId || busy) return;
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

  return (
    <ScreenIntro
      title="Memories"
      description="Episodic facts from your private chats. Edit or delete anything that looks wrong."
    >
      {memories.length === 0 ? (
        <p className="mt-2 rounded border border-dashed border-border bg-elevated px-4 py-8 text-center text-sm text-muted">
          No memories yet. Chat in /app/chat and state a preference (e.g. “I
          prefer async updates over meetings”) — it will appear here after
          extract.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {memories.map((mem) => (
            <li key={mem.id} className="py-4">
              {editingId === mem.id ? (
                <form onSubmit={onSave} className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                    disabled={busy}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="rounded border border-border bg-elevated px-2 py-2 text-sm"
                      disabled={busy}
                    >
                      {MEMORY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" disabled={busy || !editContent.trim()}>
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-fg">{mem.content}</p>
                    <p className="mt-1 text-xs text-muted">
                      {mem.memory_type} · importance {mem.importance.toFixed(2)} ·
                      confidence {mem.confidence.toFixed(2)} · {mem.source}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => startEdit(mem)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onDelete(mem.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
      <p className="mt-6 text-xs text-muted">
        Public visitor chats do not write memories in the MVP.
      </p>
    </ScreenIntro>
  );
}
