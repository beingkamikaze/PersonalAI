"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
import { VisitorConversationModal } from "@/components/visitor-conversation-modal";
import { ChevronRightIcon } from "@/components/ui/icons";
import {
  ApiError,
  apiFetch,
  type AiProfile,
  type ConversationListItem,
} from "@/lib/api";

/**
 * Owner view of visitor (public) conversation threads — read-only list.
 */
export default function ConversationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ConversationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<{
    id: string;
    preview?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        const list = await apiFetch<ConversationListItem[]>(
          `/ai/${me.id}/conversations?channel=public`,
        );
        if (!cancelled) {
          setRows(list);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/sign-in?next=/app/conversations");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <ScreenIntro
      title="Visitor conversations"
      description="Read-only list of public threads for your AI."
    >
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted">
          No visitor threads yet. Share your public link to get conversations.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenThread({ id: c.id, preview: c.preview })
                }
                className="flex w-full items-center justify-between gap-3 py-4 text-left transition hover:bg-[var(--atmosphere-1)]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate text-sm text-fg">
                    {c.preview?.trim() || "Visitor started a chat"}
                  </p>
                  <p className="text-xs text-muted">
                    Updated {new Date(c.updated_at).toLocaleString()}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <VisitorConversationModal
        thread={openThread}
        onClose={() => setOpenThread(null)}
      />
    </ScreenIntro>
  );
}
