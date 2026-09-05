import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";

export default function MemoriesPage() {
  return (
    <ScreenIntro
      title="Memories"
      description="View, edit, and delete episodic facts extracted from owner chats."
    >
      <ul className="divide-y divide-border border-t border-border">
        <li className="py-4 text-sm text-muted">No memories yet</li>
      </ul>
      <ScaffoldNote>
        Phase 3: GET/PATCH/DELETE memories. Public visitor chats do not write
        memories in MVP.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
