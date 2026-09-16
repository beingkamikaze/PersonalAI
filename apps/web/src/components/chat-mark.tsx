import { ChatBody } from "@/components/chat-body";
import { PresenceIcon, ProfileIcon } from "@/components/ui/icons";

const shell =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";

/** Visitor/owner mark — same size as the assistant hexagon. */
export function YouMark() {
  return (
    <span
      className={`${shell} bg-[var(--atmosphere-2)] text-fg`}
      aria-hidden
    >
      <ProfileIcon />
    </span>
  );
}

/** Assistant mark — teal hexagon, same weight as You. */
export function ChatMark({ buffering = false }: { buffering?: boolean }) {
  return (
    <span
      className={`${shell} bg-accent-soft text-accent ${
        buffering ? "animate-chat-mark motion-reduce:animate-none" : ""
      }`}
      aria-hidden
    >
      <PresenceIcon />
    </span>
  );
}

export function ChatRow({
  role,
  speaker,
  content,
}: {
  role: "user" | "assistant";
  speaker: string;
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className="flex items-start gap-2.5">
      {isUser ? <YouMark /> : <ChatMark />}
      <div
        className={
          isUser
            ? "min-w-0 rounded-2xl bg-[var(--atmosphere-1)] px-3.5 py-2.5 text-fg"
            : "min-w-0 rounded-2xl bg-accent-soft px-3.5 py-2.5 text-fg"
        }
      >
        <span className="sr-only">{speaker}: </span>
        <ChatBody content={content} />
      </div>
    </div>
  );
}
