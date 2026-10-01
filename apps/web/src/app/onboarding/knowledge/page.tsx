import { OnboardingProgress } from "@/components/onboarding-progress";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { ScreenIntro } from "@/components/screen-intro";

export default function OnboardingKnowledgePage() {
  return (
    <ScreenIntro
      title="Add knowledge"
      description="Add documents, notes, or a link. This is reference material your AI can answer from. Short facts, preferences, and boundaries belong in Memory."
    >
      <OnboardingProgress step={3} />
      <div className="mt-8">
        <KnowledgePanel continueHref="/onboarding/test" showSkip />
      </div>
    </ScreenIntro>
  );
}
