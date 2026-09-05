import { SiteHeader } from "@/components/site-header";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";
import { ButtonLink } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader ctaHref="/sign-up" ctaLabel="Sign up" />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Sign in"
          description="Auth will use Clerk or Supabase (Google + email). Hosted UI is fine for MVP."
        >
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/onboarding/create">Continue (scaffold)</ButtonLink>
            <ButtonLink href="/sign-up" variant="secondary">
              Create account
            </ButtonLink>
          </div>
          <ScaffoldNote>
            Replace this page with Clerk/Supabase embedded or hosted auth in
            Phase 0.
          </ScaffoldNote>
        </ScreenIntro>
      </main>
    </div>
  );
}
