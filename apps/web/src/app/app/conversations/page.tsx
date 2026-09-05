import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";

export default function ConversationsPage() {
  return (
    <ScreenIntro
      title="Visitor conversations"
      description="Read-only list of public threads for the owner in MVP."
    >
      <ul className="divide-y divide-border border-t border-border">
        <li className="py-4 text-sm text-muted">No visitor threads yet</li>
      </ul>
      <ScaffoldNote>
        Phase 4: list conversations from GET /ai/:id/conversations.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
