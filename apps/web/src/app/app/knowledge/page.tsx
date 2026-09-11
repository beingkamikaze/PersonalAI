import { KnowledgePanel } from "@/components/knowledge-panel";
import { ScreenIntro } from "@/components/screen-intro";

export default function KnowledgePage() {
  return (
    <ScreenIntro
      title="Knowledge"
      description="Upload documents, add notes or a URL, and track processing status."
    >
      <KnowledgePanel continueHref="/app/chat" />
    </ScreenIntro>
  );
}
