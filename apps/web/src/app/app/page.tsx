import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <ScreenIntro
      title="Dashboard"
      description="Status, completeness, visits, and quick actions to Share or Test."
    >
      <dl className="grid gap-6 sm:grid-cols-3">
        <Stat label="Status" value="Draft" />
        <Stat label="Completeness" value="—" />
        <Stat label="Visits" value="0" />
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/app/chat">Test</ButtonLink>
        <ButtonLink href="/onboarding/publish" variant="secondary">
          Share
        </ButtonLink>
      </div>
      <ScaffoldNote>
        Wire GET /ai/:id/analytics/summary after Phase 4.
      </ScaffoldNote>
    </ScreenIntro>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-fg">{value}</dd>
    </div>
  );
}
