"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScreenIntro } from "@/components/screen-intro";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<AiProfile>("/ai/me");
        const list = await apiFetch<ConversationListItem[]>(
          `/ai/${me.id}/conversations`,
        );
        if (!cancelled) {
          setRows(list.filter((c) => c.channel === "public"));
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
            <li key={c.id} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-fg">Public thread</p>
                <p className="text-xs text-muted">
                  Updated {new Date(c.updated_at).toLocaleString()}
                </p>
              </div>
              <Link
                href={`/app/chat`}
                className="text-sm text-accent hover:text-accent-hover"
                title="Owner Chat is for talking to your AI; this list is visitor threads"
              >
                {c.id.slice(0, 8)}…
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </ScreenIntro>
  );
}
