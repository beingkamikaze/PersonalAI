import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";

export default function AppChatPage() {
  return (
    <ScreenIntro
      title="Private chat"
      description="Owner testing surface. Same chat pipeline as public, without publish gate."
    >
      <div className="flex min-h-[360px] flex-col rounded border border-border bg-elevated">
        <div className="flex-1 p-5 text-sm text-muted">
          Conversation placeholder
        </div>
        <div className="border-t border-border p-3">
          <input
            placeholder="Message your AI…"
            className="w-full rounded border border-border bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>
      <ScaffoldNote>
        Stream tokens from FastAPI (SSE or chunked). Persist messages server-side.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
