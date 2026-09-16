"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatBuffering } from "@/components/chat-buffering";
import { ChatRow } from "@/components/chat-mark";
import { ApiError, apiFetch, type ChatMessage, type ChatResult } from "@/lib/api";

type Props = {
  profileId: string;
  assistantName?: string;
  /** Optional suggested questions shown above the composer */
  suggestions?: string[];
};

/**
 * Owner private chat UI.
 * Calls FastAPI POST /ai/{id}/chat — the browser never talks to OpenAI.
 */
export function OwnerChat({
  profileId,
  assistantName = "Assistant",
  suggestions = [],
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setLoading(true);
    setError(null);
    setInput("");

    // Optimistic user bubble
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await apiFetch<ChatResult>(`/ai/${profileId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      });
      setConversationId(result.conversation_id);
      setMessages((prev) => {
        // Drop optimistic bubble; append server user + assistant messages
        const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id);
        return [...withoutOptimistic, ...result.messages];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(err instanceof ApiError ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex min-h-[360px] flex-col rounded border border-border bg-elevated">
      <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted">
            Ask something about this professional — answers use interview
            personality, facts, and uploaded knowledge when ready.
          </p>
        ) : (
          messages.map((m) => (
            <ChatRow
              key={m.id}
              role={m.role === "user" ? "user" : "assistant"}
              speaker={m.role === "user" ? "You" : assistantName}
              content={m.content}
            />
          ))
        )}
        {loading ? <ChatBuffering /> : null}
        <div ref={bottomRef} />
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void send(q)}
              className="rounded border border-border bg-white px-2.5 py-1.5 text-left text-xs text-fg hover:border-accent/40 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          disabled={loading}
          className="flex-1 rounded border border-border bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>

      {error ? (
        <p className="border-t border-border px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
