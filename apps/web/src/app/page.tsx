import { SiteHeader } from "@/components/site-header";
import { LandingHero } from "@/components/landing-hero";
import { isUiPreview } from "@/lib/env";

/**
 * Marketing landing. Auth and pricing routes stay on the shared header.
 */
export default function LandingPage() {
  const createHref = isUiPreview() ? "/onboarding/create" : "/sign-up";

  return (
    <div className="landing flex min-h-screen flex-col overflow-x-hidden">
      <SiteHeader
        contained
        ctaHref={createHref}
        ctaLabel="Create Your AI →"
        compactLabel="Create"
        buttonClassName="!rounded-full"
      />
      <LandingHero />
    </div>
  );
}
