"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChatBuffering } from "@/components/chat-buffering";
import { UserAvatar } from "@/components/user-avatar";
import {
  ApiError,
  publicApiFetch,
  type ChatMessage,
  type ChatResult,
  type PublicProfile,
} from "@/lib/api";

function visitorId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "personaai_visitor_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Public AI page — no login required.
 * Loads GET /public/:username and chats via POST /public/:username/chat.
 */
export default function PublicAiPage() {
  const params = useParams<{ username: string }>();
  const username = String(params.username ?? "");

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await publicApiFetch<PublicProfile>(
          `/public/${encodeURIComponent(username)}`,
        );
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Public AI not found",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading || !profile) return;
    setLoading(true);
    setChatError(null);
    setInput("");

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await publicApiFetch<ChatResult>(
        `/public/${encodeURIComponent(profile.username)}/chat`,
        {
          method: "POST",
          body: JSON.stringify({
            message,
            conversation_id: conversationId,
            visitor_id: visitorId(),
          }),
        },
      );
      setConversationId(result.conversation_id);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimistic.id);
        return [...without, ...result.messages];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatError(err instanceof ApiError ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  if (loadError) {
    return (
      <div className="atmosphere min-h-screen">
        <main className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="font-display text-3xl text-fg">Not found</h1>
          <p className="mt-3 text-muted">{loadError}</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="atmosphere min-h-screen">
        <main className="mx-auto max-w-3xl px-6 py-20 text-sm text-muted">
          Loading…
        </main>
      </div>
    );
  }

  return (
    <div className="atmosphere min-h-screen">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12 md:px-10">
        <div className="flex items-start gap-4">
          <UserAvatar name={profile.name} src={profile.avatar_url} size="lg" />
          <div>
            <h1 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
              {profile.name}
            </h1>
            {profile.headline ? (
              <p className="mt-1 text-muted">{profile.headline}</p>
            ) : null}
            {profile.bio ? (
              <p className="mt-4 max-w-xl text-sm text-muted text-balance">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-4 max-w-xl text-sm text-muted text-balance">
                Visitors chat with this public AI when {profile.name} is busy.
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {profile.suggested_questions.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded border border-border bg-elevated px-3 py-2 text-left text-sm text-fg hover:border-accent/40"
              onClick={() => void send(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="mt-8 flex min-h-[280px] flex-1 flex-col rounded border border-border bg-elevated/80">
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
            {messages.length === 0 ? (
              <p className="text-muted">
                Ask about {profile.name}&apos;s work, skills, or how they like
                to collaborate.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  {m.role === "user" ? (
                    <span className="w-9 shrink-0 pt-2 text-xs font-medium text-muted">
                      You
                    </span>
                  ) : (
                    <UserAvatar name={profile.name} src={profile.avatar_url} />
                  )}
                  <p
                    className={
                      m.role === "user"
                        ? "min-w-0 pt-1.5 text-fg whitespace-pre-wrap"
                        : "min-w-0 rounded-2xl bg-accent-soft px-3.5 py-2.5 text-fg whitespace-pre-wrap"
                    }
                  >
                    <span className="sr-only">
                      {m.role === "user" ? "You" : profile.name}:{" "}
                    </span>
                    {m.content}
                  </p>
                </div>
              ))
            )}
            {loading ? (
              <div className="flex items-start gap-3">
                <UserAvatar name={profile.name} src={profile.avatar_url} />
                <ChatBuffering />
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${profile.name}'s AI…`}
              className="flex-1 rounded border border-border bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              Send
            </Button>
          </form>
        </div>
        {chatError ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {chatError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {profile.contact_email ? (
            <a
              href={`mailto:${profile.contact_email}`}
              className="text-accent hover:text-accent-hover"
            >
              Contact
            </a>
          ) : null}
          {profile.calendar_link ? (
            <a
              href={profile.calendar_link}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Book
            </a>
          ) : null}
        </div>
      </main>
    </div>
  );
}
