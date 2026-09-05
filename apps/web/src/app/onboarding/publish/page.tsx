import { OnboardingProgress } from "@/components/onboarding-progress";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function OnboardingPublishPage() {
  return (
    <ScreenIntro
      title="Publish your public link"
      description="Pick a username, preview the page, then publish and copy the link."
    >
      <OnboardingProgress step={5} />
      <div className="mt-8 space-y-5">
        <div>
          <label htmlFor="username" className="text-sm font-medium text-fg">
            Username
          </label>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span>/u/</span>
            <input
              id="username"
              name="username"
              placeholder="mayank"
              className="w-full rounded border border-border bg-elevated px-3 py-2.5 text-fg focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="rounded border border-border bg-elevated p-5">
          <p className="font-display text-xl text-fg">Preview</p>
          <p className="mt-2 text-sm text-muted">
            Public page shell: avatar, headline, bio, suggested questions, chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/u/mayank">Publish &amp; open preview</ButtonLink>
          <ButtonLink href="/app" variant="secondary">
            Go to dashboard
          </ButtonLink>
        </div>
      </div>
      <ScaffoldNote>
        POST /ai/:id/publish sets visibility=published (Phase 4).
      </ScaffoldNote>
    </ScreenIntro>
  );
}
