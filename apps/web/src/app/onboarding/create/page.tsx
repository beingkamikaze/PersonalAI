import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function OnboardingCreatePage() {
  return (
    <ScreenIntro
      title="Create your AI profile"
      description="Name, display name, headline, and avatar. Done when a draft profile exists."
    >
      <OnboardingProgress step={1} />
      <form className="mt-8 space-y-5">
        <Field label="Full name" name="name" placeholder="Mayank Sharma" />
        <Field
          label="Display name"
          name="displayName"
          placeholder="Mayank"
        />
        <Field
          label="Headline"
          name="headline"
          placeholder="Software engineer building personal AI products"
        />
        <div>
          <label className="text-sm font-medium text-fg">Avatar</label>
          <div className="mt-2 rounded border border-dashed border-border bg-elevated px-4 py-8 text-center text-sm text-muted">
            Upload placeholder — wire to object storage in Phase 0/2
          </div>
        </div>
        <ButtonLink href="/onboarding/interview">Continue</ButtonLink>
      </form>
      <ScaffoldNote>
        POST /ai via FastAPI after auth JWT is wired.
      </ScaffoldNote>
    </ScreenIntro>
  );
}

function Field({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        className="mt-2 w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
    </div>
  );
}
