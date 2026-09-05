import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function OnboardingTestPage() {
  return (
    <ScreenIntro
      title="Test your AI"
      description="Private owner chat. Done when you get a first useful answer."
    >
      <OnboardingProgress step={4} />
      <div className="mt-8 flex min-h-[320px] flex-col rounded border border-border bg-elevated">
        <div className="flex-1 space-y-3 p-5 text-sm text-muted">
          <p className="text-fg">You: What do I do professionally?</p>
          <p>Your AI will answer here once chat streaming is wired (Phase 1+).</p>
        </div>
        <div className="border-t border-border p-3">
          <input
            placeholder="Ask your AI…"
            className="w-full rounded border border-border bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/onboarding/publish">Looks good — publish</ButtonLink>
        <ButtonLink href="/onboarding/knowledge" variant="ghost">
          Back
        </ButtonLink>
      </div>
      <ScaffoldNote>
        Owner chat uses POST /ai/:id/chat — never call the LLM from the browser.
      </ScaffoldNote>
    </ScreenIntro>
  );
}
