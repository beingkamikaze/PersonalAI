"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { ChatBuffering } from "@/components/chat-buffering";
import { ChatRow } from "@/components/chat-mark";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChartIcon,
  GlobeIcon,
  MicIcon,
  PaperclipIcon,
  RefreshIcon,
  SendIcon,
  SlidersIcon,
  TargetIcon,
} from "@/components/ui/icons";
import {
  ApiError,
  apiFetch,
  type ChatMessage,
  type ChatResult,
} from "@/lib/api";
import { isUiPreview } from "@/lib/ui-preview";

type Props = {
  profileId: string;
  assistantName?: string;
  suggestions?: string[];
  /** App mockup chrome for /app/chat */
  variant?: "app" | "simple";
};

const SUGGESTION_ICONS = [
  { icon: <BriefcaseIcon className="h-3.5 w-3.5" />, tone: "mint" },
  { icon: <ChartIcon className="h-3.5 w-3.5" />, tone: "green" },
  { icon: <TargetIcon className="h-3.5 w-3.5" />, tone: "purple" },
  { icon: <CalendarIcon className="h-3.5 w-3.5" />, tone: "red" },
] as const;

/**
 * Owner chat UI — preview answers and state preferences.
 * Calls FastAPI POST /ai/{id}/chat — the browser never talks to OpenAI.
 */
export function OwnerChat({
  profileId,
  assistantName = "Assistant",
  suggestions = [],
  variant = "simple",
}: Props) {
  const isApp = variant === "app";
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState(suggestions);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPool(suggestions);
  }, [suggestions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setLoading(true);
    setError(null);
    setInput("");

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    if (isUiPreview() && profileId === "preview-profile") {
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          optimistic,
          {
            id: `preview-a-${Date.now()}`,
            role: "assistant",
            content:
              "Preview mode: this is a sample reply. Connect the API and sign in for real answers from your knowledge and personality.",
            created_at: new Date().toISOString(),
          },
        ]);
        setLoading(false);
      }, 600);
      return;
    }

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
        const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id);
        return [...withoutOptimistic, ...result.messages];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      if (isUiPreview()) {
        setMessages((prev) => [
          ...prev,
          optimistic,
          {
            id: `preview-a-${Date.now()}`,
            role: "assistant",
            content:
              "API is offline — showing a preview reply. Start the API for live chat.",
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setError(err instanceof ApiError ? err.message : "Chat failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function shuffleSuggestions() {
    setPool((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  if (!isApp) {
    return (
      <div className="flex min-h-[360px] flex-col rounded border border-border bg-elevated">
        <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted">
              Ask a question to preview answers, or state a preference to save
              as a memory. Replies use interview personality, facts, and
              uploaded knowledge when ready.
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
          <p
            className="border-t border-border px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const shown = pool.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Composer card */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-white shadow-[0_10px_30px_-18px_rgba(15,31,28,0.28)]"
      >
        {messages.length > 0 || loading ? (
          <div className="max-h-[280px] space-y-3 overflow-y-auto border-b border-border px-5 py-4 text-sm">
            {messages.map((m) => (
              <ChatRow
                key={m.id}
                role={m.role === "user" ? "user" : "assistant"}
                speaker={m.role === "user" ? "You" : assistantName}
                content={m.content}
              />
            ))}
            {loading ? <ChatBuffering /> : null}
            <div ref={bottomRef} />
          </div>
        ) : null}

        <div className="px-4 pt-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={3}
            placeholder="Ask a question to preview answers, or state a preference to save as a memory. Replies use interview personality, facts, and uploaded knowledge when ready."
            disabled={loading}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-fg placeholder:text-muted focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex flex-wrap items-center gap-1">
            <ToolChip icon={<PaperclipIcon className="h-3.5 w-3.5" />} label="Attach" />
            <ToolChip icon={<GlobeIcon className="h-3.5 w-3.5" />} label="Search" />
            <ToolChip
              icon={<SlidersIcon className="h-3.5 w-3.5" />}
              label="Use knowledge"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg"
              aria-label="Voice input"
            >
              <MicIcon className="h-4 w-4" />
            </button>
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 gap-1.5 rounded-xl px-3 py-0"
            >
              <SendIcon className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>

        {error ? (
          <p className="border-t border-border px-4 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {/* Try asking — equal-width cards in one row */}
      {shown.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-fg">Try asking</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {shown.map((q, i) => {
              const meta = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
              return (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => void send(q)}
                  className="flex min-h-[4.25rem] w-full flex-col items-start gap-2 rounded-xl border border-border bg-white p-3 text-left shadow-[0_8px_24px_-18px_rgba(15,31,28,0.28)] transition hover:border-accent/40 disabled:opacity-50"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass(meta.tone)}`}
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <span className="line-clamp-2 text-xs font-medium leading-snug text-fg">
                    {q}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={shuffleSuggestions}
              className="flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-white p-3 text-center text-xs font-medium text-muted transition hover:border-accent/40 hover:text-fg"
            >
              <RefreshIcon className="h-4 w-4" />
              More examples
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-[var(--atmosphere-1)] hover:text-fg"
    >
      {icon}
      {label}
    </button>
  );
}

function toneClass(tone: string): string {
  switch (tone) {
    case "mint":
      return "bg-[var(--tone-mint)] text-accent";
    case "green":
      return "bg-[#e8f5e9] text-[#2e7d32]";
    case "purple":
      return "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]";
    case "red":
      return "bg-[#fde8e8] text-[#c62828]";
    default:
      return "bg-[var(--atmosphere-1)] text-muted";
  }
}
