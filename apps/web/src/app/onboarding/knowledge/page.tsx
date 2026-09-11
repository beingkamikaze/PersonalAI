import { OnboardingProgress } from "@/components/onboarding-progress";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { ScreenIntro } from "@/components/screen-intro";

export default function OnboardingKnowledgePage() {
  return (
    <ScreenIntro
      title="Add knowledge"
      description="Resume / PDF / TXT, notes, and an optional URL. Prefer at least one source before publish."
    >
      <OnboardingProgress step={3} />
      <div className="mt-8">
        <KnowledgePanel continueHref="/onboarding/test" showSkip />
      </div>
    </ScreenIntro>
  );
}
