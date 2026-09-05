import { SiteHeader } from "@/components/site-header";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-in" ctaLabel="Sign in" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Create your account"
          description="After auth, you start the linear onboarding wizard to build your AI."
        >
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/onboarding/create">Continue (scaffold)</ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary">
              I already have an account
            </ButtonLink>
          </div>
          <ScaffoldNote>
            Phase 0 done criteria: signed-in user can create a draft AI profile.
          </ScaffoldNote>
        </ScreenIntro>
      </main>
    </div>
  );
}
