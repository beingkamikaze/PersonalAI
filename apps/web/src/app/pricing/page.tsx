import { SiteHeader } from "@/components/site-header";
import { ScaffoldNote, ScreenIntro } from "@/components/screen-intro";

const plans = [
  {
    name: "Free",
    price: "₹0",
    blurb: "One AI profile, limited chats — enough to publish and share.",
  },
  {
    name: "Plus",
    price: "TBD",
    blurb: "Higher limits, more documents, richer analytics. Hypothesis only.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader />
      <main className="px-6 py-16 md:px-10">
        <ScreenIntro
          title="Simple pricing"
          description="Static hypothesis for MVP. Payments come after the core loop works."
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
          <ScaffoldNote>
            Wire Razorpay/Stripe in Phase 5/6 — not required for Phase 0.
          </ScaffoldNote>
        </ScreenIntro>
      </main>
    </div>
  );
}
