import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function OnboardingKnowledgePage() {
  return (
    <ScreenIntro
      title="Add knowledge"
      description="Resume / PDF / TXT, notes, and an optional URL. Prefer at least one source before publish."
    >
      <OnboardingProgress step={3} />
      <div className="mt-8 space-y-6">
        <div className="rounded border border-dashed border-border bg-elevated px-4 py-10 text-center text-sm text-muted">
          Drop resume or docs here (Phase 2 upload + ingest)
        </div>
        <div>
          <label htmlFor="notes" className="text-sm font-medium text-fg">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            placeholder="Things people should know about your work…"
            className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/onboarding/test">Continue</ButtonLink>
          <ButtonLink href="/onboarding/test" variant="secondary">
            Skip with warning
          </ButtonLink>
        </div>
      </div>
      <ScaffoldNote>
        Processing states live on /app/knowledge after Phase 2.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
