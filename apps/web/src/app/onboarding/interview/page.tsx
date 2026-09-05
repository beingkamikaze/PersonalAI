import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function OnboardingInterviewPage() {
  return (
    <ScreenIntro
      title="Professional interview"
      description="Chat-style, fixed ~8–12 questions. LLM only structures answers into personality + facts."
    >
      <OnboardingProgress step={2} />
      <div className="mt-8 space-y-4 rounded border border-border bg-elevated p-5">
        <p className="text-sm font-medium text-fg">
          What’s your full name, and what should people call you?
        </p>
        <textarea
          rows={3}
          placeholder="Your answer…"
          className="w-full rounded border border-border bg-white px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/onboarding/knowledge">Continue scaffold</ButtonLink>
          <ButtonLink href="/onboarding/create" variant="ghost">
            Back
          </ButtonLink>
        </div>
      </div>
      <ScaffoldNote>
        Phase 1: wire interview/start + interview/answer streaming extract.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
