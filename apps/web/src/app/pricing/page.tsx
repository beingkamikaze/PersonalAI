import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { ScreenIntro } from "@/components/screen-intro";

const plans = [
  {
    name: "Free",
    price: "₹0",
    blurb:
      "One AI profile, publish + share, limited chats with your AI/day and knowledge sources. Enough to validate the loop.",
  },
  {
    name: "Plus",
    price: "Soon",
    blurb:
      "Higher chat and document limits, richer analytics. Billing (Razorpay/Stripe) after soft launch feedback.",
  },
] as const;

/** Soft-launch pricing — hypothesis only; free caps enforced in the API. */
export default function PricingPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Simple pricing"
          description="Start free while we soft-launch with professionals. Paid plans after we learn what limits matter."
        >
          <ul className="space-y-8">
            {plans.map((plan) => (
              <li key={plan.name} className="border-t border-border pt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-2xl text-fg">{plan.name}</h2>
                  <span className="text-sm font-medium text-muted">
                    {plan.price}
                  </span>
                </div>
                <p className="mt-2 text-muted">{plan.blurb}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ButtonLink href="/sign-up">Create My AI</ButtonLink>
          </div>
          <p className="mt-6 text-xs text-muted">
            Free soft-launch caps (API defaults): ~40 chats with your AI/day, ~8
            knowledge sources, public chat rate-limited per visitor.
          </p>
        </ScreenIntro>
      </main>
    </div>
  );
}
