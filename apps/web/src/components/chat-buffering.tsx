export function ChatBuffering() {
  return (
    <div role="status" aria-live="polite" aria-label="Composing a reply">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-accent-soft px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-chat-dot [animation-delay:300ms]" />
      </div>
      <p className="sr-only">Composing a reply</p>
    </div>
  );
}
