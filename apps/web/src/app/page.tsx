import { SiteHeader } from "@/components/site-header";
import { LandingHero } from "@/components/landing-hero";

/**
 * Marketing landing — brand-first hero with chat preview.
 * Soft-launch copy (Phase 5). Keep one composition in the first viewport.
 */
export default function LandingPage() {
  return (
    <div className="atmosphere flex min-h-screen flex-col">
      <SiteHeader />
      <LandingHero />
    </div>
  );
}
