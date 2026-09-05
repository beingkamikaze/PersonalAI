import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";

export default function KnowledgePage() {
  return (
    <ScreenIntro
      title="Knowledge"
      description="Documents list with processing status, upload, and delete."
    >
      <div className="rounded border border-dashed border-border bg-elevated px-4 py-10 text-center text-sm text-muted">
        No documents yet
      </div>
      <div className="mt-6">
        <Button type="button">Upload</Button>
      </div>
      <ScaffoldNote>
        Phase 2: S3/R2 upload + worker statuses (pending / processing / ready /
        failed).
      </ScaffoldNote>
    </ScreenIntro>
  );
}
