import { ChatMark } from "@/components/chat-mark";

export function ChatBuffering() {
  return (
    <div
      className="flex items-start gap-2.5"
      role="status"
      aria-live="polite"
      aria-label="Composing a reply"
    >
      <ChatMark buffering />
      <div className="inline-flex items-center gap-1 rounded-2xl bg-accent-soft px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot motion-reduce:animate-none" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot motion-reduce:animate-none [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot motion-reduce:animate-none [animation-delay:300ms]" />
      </div>
      <p className="sr-only">Composing a reply</p>
    </div>
  );
}
