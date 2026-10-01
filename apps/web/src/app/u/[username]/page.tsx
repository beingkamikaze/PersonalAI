"use client";

import {
  FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatBody } from "@/components/chat-body";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ProfileIcon } from "@/components/ui/icons";
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

const cardShell =
  "rounded-[24px] border border-[#e5eeea] bg-white/[0.94] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_26px_60px_-38px_rgba(16,48,40,0.48),0_10px_24px_-18px_rgba(16,48,40,0.22)] sm:rounded-[28px]";

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
  const [reloadKey, setReloadKey] = useState(0);
  const [threadMax, setThreadMax] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setLoadError(null);
    setMessages([]);
    setConversationId(null);
    setInput("");
    setChatError(null);
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
  }, [username, reloadKey]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !profile) return;

    const measure = () => {
      const styles = getComputedStyle(stage);
      const padY =
        parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const available = stage.clientHeight - padY;
      const head = headRef.current?.offsetHeight ?? 0;
      const chips = chipsRef.current?.offsetHeight ?? 0;
      const form = formRef.current?.offsetHeight ?? 0;
      const chatting = messages.length > 0 || loading;
      const gaps = (chips > 0 ? 28 : 0) + 20 + (chatting ? 16 : 0);
      const cardPad = window.innerWidth >= 768 ? 80 : 56;
      const next = Math.max(
        140,
        available - head - chips - form - gaps - cardPad,
      );
      setThreadMax((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    if (headRef.current) observer.observe(headRef.current);
    if (chipsRef.current) observer.observe(chipsRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [profile, messages.length, loading, chatError]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduce ? "auto" : "smooth",
    });
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
      setInput(message);
      setChatError(err instanceof ApiError ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <PublicShell stageRef={stageRef}>
      {loadError ? (
        <section className={`${cardShell} px-6 py-12 text-center sm:px-10`}>
          <h1 className="font-display text-3xl tracking-tight text-fg">
            This page is unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {loadError}
          </p>
          <Button
            type="button"
            className="mt-6 rounded-full px-5"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </Button>
        </section>
      ) : !profile ? (
        <ProfileSkeleton />
      ) : (
        <section className={`${cardShell} px-4 py-5 sm:px-7 sm:py-7 md:px-9 md:py-8`}>
          <header ref={headRef} className="flex items-start gap-4 sm:gap-5">
            <UserAvatar
              name={profile.name}
              src={profile.avatar_url}
              size="xl"
              className="ring-1 ring-[#dfe8e4]"
            />
            <div className="min-w-0 pt-1 sm:pt-2">
              <h1 className="font-display text-[2rem] leading-none tracking-tight text-fg sm:text-[2.65rem]">
                {profile.name}
              </h1>
              {profile.headline ? (
                <p className="mt-2 text-sm text-muted sm:text-[15px]">
                  {profile.headline}
                </p>
              ) : null}
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
                {profile.bio ||
                  `Visitors chat with this public AI when ${profile.name} is busy.`}
              </p>
              {profile.contact_email || profile.calendar_link ? (
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
                </p>
              ) : null}
            </div>
          </header>

          {profile.suggested_questions.length > 0 ? (
            <div ref={chipsRef} className="mt-6 flex flex-wrap gap-2 sm:mt-7 sm:gap-2.5">
              {profile.suggested_questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="cursor-pointer rounded-full border border-[#e3ebe7] bg-white px-3.5 py-2 text-left text-[13px] text-fg shadow-[0_1px_1px_rgba(16,40,32,0.03),0_6px_16px_-12px_rgba(16,40,32,0.35)] transition hover:-translate-y-px hover:border-accent/30 hover:shadow-[0_8px_18px_-12px_rgba(16,40,32,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none sm:px-4 sm:text-sm"
                  onClick={() => void send(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 rounded-[20px] border border-[#e6eeea] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_36px_-26px_rgba(16,48,40,0.45)] sm:mt-6 sm:rounded-[22px] sm:p-4 md:p-5">
            {messages.length > 0 || loading ? (
              <div
                ref={scrollerRef}
                className="app-scroll space-y-4 overflow-y-auto overscroll-contain pr-1"
                style={threadMax ? { maxHeight: threadMax } : undefined}
              >
                {messages.map((m) =>
                  m.role === "user" ? (
                    <VisitorTurn key={m.id} content={m.content} />
                  ) : (
                    <AssistantTurn
                      key={m.id}
                      name={profile.name}
                      content={m.content}
                    />
                  ),
                )}
                {loading ? <AssistantPending /> : null}
              </div>
            ) : null}

            {chatError ? (
              <p
                className={`rounded-2xl bg-[#f8f3f0] px-3.5 py-2.5 text-sm text-[#7a4034] ${
                  messages.length > 0 || loading ? "mt-3" : ""
                }`}
                role="alert"
              >
                {chatError} You can edit the message and send it again.
              </p>
            ) : null}

            <form
              ref={formRef}
              onSubmit={onSubmit}
              className={`flex items-center gap-2 rounded-full border border-[#e3ebe7] bg-[#fbfdfc] py-1.5 pl-4 pr-1.5 shadow-[0_1px_2px_rgba(16,40,32,0.04)] ${
                messages.length > 0 || loading || chatError ? "mt-3 sm:mt-4" : ""
              }`}
            >
              <label className="sr-only" htmlFor="public-chat-input">
                Message {profile.name}&apos;s AI
              </label>
              <input
                id="public-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask anything about ${profile.name}'s work...`}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-[#8aa099] focus:outline-none disabled:opacity-60"
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_16px_-8px_rgba(12,107,86,0.85)] transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:hover:translate-y-0 motion-safe:hover:-translate-y-px motion-reduce:transform-none"
              >
                <ArrowUpIcon className="h-[18px] w-[18px]" />
              </button>
            </form>
          </div>
        </section>
      )}
    </PublicShell>
  );
}

function PublicShell({
  children,
  stageRef,
}: {
  children: ReactNode;
  stageRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="public-visit relative h-dvh overflow-hidden">
      <PublicRings />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5 md:px-12 lg:px-16">
          <Link
            href="/"
            className="shrink-0 font-display text-[1.35rem] tracking-tight text-fg sm:text-[1.5rem]"
          >
            PersonaAI
          </Link>
          <Link
            href="/"
            className="shrink-0 text-[13px] font-medium text-accent transition hover:text-accent-hover sm:text-sm"
          >
            <span className="sm:hidden">Learn more</span>
            <span className="hidden sm:inline">Learn more about PersonaAI</span>
            <span aria-hidden> →</span>
          </Link>
        </header>
        <main className="flex min-h-0 flex-1 flex-col px-3 sm:px-6 md:px-10">
          <div
            ref={stageRef}
            className="mx-auto flex min-h-0 w-full max-w-[960px] flex-1 flex-col justify-center py-3 sm:py-5"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function PublicRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        className="absolute -left-[46%] top-[-6%] h-[640px] w-[640px] text-[#c5ddd4] sm:-left-[22%] sm:top-[-2%] sm:h-[860px] sm:w-[860px]"
        viewBox="0 0 800 800"
        fill="none"
      >
        <circle
          cx="400"
          cy="400"
          r="292"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.7"
        />
        <circle
          cx="400"
          cy="400"
          r="236"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.5"
        />
      </svg>
      <svg
        className="absolute -bottom-[42%] -right-[48%] h-[620px] w-[620px] text-[#c5ddd4] sm:-bottom-[34%] sm:-right-[20%] sm:h-[900px] sm:w-[900px]"
        viewBox="0 0 800 800"
        fill="none"
      >
        <circle
          cx="400"
          cy="400"
          r="308"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.65"
        />
        <circle
          cx="400"
          cy="400"
          r="246"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.42"
        />
      </svg>
    </div>
  );
}

function VisitorTurn({ content }: { content: string }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div className="max-w-[min(32rem,82%)] rounded-[18px] bg-[#e5f4ee] px-3.5 py-2 text-sm leading-relaxed text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        <span className="sr-only">You: </span>
        <ChatBody content={content} className="text-sm leading-relaxed" />
      </div>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3ebe7] bg-white text-muted shadow-[0_4px_10px_-8px_rgba(16,40,32,0.5)] sm:h-9 sm:w-9"
        aria-hidden
      >
        <ProfileIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

function AssistantTurn({ name, content }: { name: string; content: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <SparkleMark />
      <div className="min-w-0 flex-1 rounded-[18px] bg-gradient-to-b from-[#f4faf7] to-[#e7f4ef] px-3.5 py-3 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-5 sm:py-4">
        <span className="sr-only">{name}: </span>
        <ChatBody
          content={content}
          className="text-[15px] leading-[1.7]"
        />
      </div>
    </div>
  );
}

const raisedMark =
  "bg-[#e5f4ee] shadow-[inset_1px_1px_0_rgba(255,255,255,0.92),inset_-1px_-1.5px_1px_rgba(14,58,46,0.1),0_1px_1px_rgba(16,40,32,0.05),0_6px_12px_-8px_rgba(16,48,40,0.32)] transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),inset_-1px_-1.5px_1px_rgba(14,58,46,0.12),0_2px_3px_rgba(16,40,32,0.06),0_10px_16px_-8px_rgba(16,48,40,0.36)]";

const raisedPill =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(16,52,42,0.07),0_1px_1px_rgba(16,40,32,0.04),0_6px_14px_-9px_rgba(16,48,40,0.3)] transition-[transform,box-shadow] duration-300 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(16,52,42,0.08),0_2px_3px_rgba(16,40,32,0.05),0_12px_18px_-10px_rgba(16,48,40,0.34)]";

function AssistantPending() {
  return (
    <div
      className="flex items-start gap-2.5"
      role="status"
      aria-live="polite"
      aria-label="Composing a reply"
    >
      <span className="inline-flex animate-status-float motion-reduce:animate-none">
        <SparkleMark raised />
      </span>
      <span className="inline-flex animate-status-float-pill motion-reduce:animate-none">
        <span
          className={`inline-flex items-center gap-1.5 rounded-[18px] bg-gradient-to-b from-[#f4faf7] to-[#e7f4ef] px-4 py-3.5 ${raisedPill}`}
        >
          <StatusDot />
          <StatusDot className="[animation-delay:150ms]" />
          <StatusDot className="[animation-delay:300ms]" />
        </span>
      </span>
    </div>
  );
}

function StatusDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full bg-accent shadow-[inset_0_1px_1px_rgba(4,28,22,0.5)] animate-chat-dot motion-reduce:animate-none ${className}`}
    />
  );
}

function SparkleMark({ raised = false }: { raised?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-accent sm:h-9 sm:w-9 ${
        raised ? raisedMark : "bg-[#e5f4ee]"
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        <path d="M5 3v4" />
        <path d="M3 5h4" />
      </svg>
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <section className={`${cardShell} px-4 py-5 sm:px-7 sm:py-7 md:px-9 md:py-8`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading profile</span>
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-accent-soft motion-reduce:animate-none sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1 space-y-3 pt-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-accent-soft motion-reduce:animate-none" />
          <div className="h-4 w-56 max-w-full animate-pulse rounded bg-[#e7f1ed] motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-[#e7f1ed] motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {["w-36", "w-44", "w-40", "w-52", "w-48"].map((width) => (
          <div
            key={width}
            className={`h-9 ${width} max-w-full animate-pulse rounded-full bg-white shadow-[0_1px_1px_rgba(16,40,32,0.04)] ring-1 ring-[#e3ebe7] motion-reduce:animate-none`}
          />
        ))}
      </div>
      <div className="mt-5 h-[4.5rem] animate-pulse rounded-[20px] bg-[#f6faf8] ring-1 ring-[#e6eeea] motion-reduce:animate-none sm:mt-6" />
    </section>
  );
}
