import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";
import { ScreenIntro } from "@/components/screen-intro";

const plans = [
  {
    name: "Free",
    price: "₹0",
    blurb:
      "One AI profile you create and teach yourself. Publish and share a link, with limited daily chats and knowledge sources while we soft-launch.",
  },
  {
    name: "Plus",
    price: "Soon",
    blurb:
      "Higher chat and document limits. Billing starts after the soft launch, once we know which limits matter.",
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
          description="Create an assistant around your own information. Start free. Paid plans raise the limits after the soft launch."
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
            <ButtonLink href="/sign-up">Create your AI</ButtonLink>
          </div>
          <p className="mt-6 text-xs text-muted">
            Free soft-launch limits: about 40 chats with your AI a day, about 8
            knowledge sources, and a limit on how often each visitor can chat.
          </p>
        </ScreenIntro>
      </main>
    </div>
  );
}
