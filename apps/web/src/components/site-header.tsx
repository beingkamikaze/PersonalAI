import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader({
  ctaHref = "/sign-up",
  ctaLabel = "Create Your AI",
  compactLabel,
  contained = false,
  buttonClassName = "",
}: {
  ctaHref?: string;
  ctaLabel?: string;
  /** Shorter button label below the `sm` breakpoint, when `ctaLabel` will not fit. */
  compactLabel?: string;
  /** Align the bar to the marketing page width. */
  contained?: boolean;
  buttonClassName?: string;
}) {
  const shortLabel =
    compactLabel ?? (ctaLabel === "Create Your AI" ? "Create" : undefined);

  return (
    <header
      className={
        contained
          ? "mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-5 py-3.5 sm:px-8 sm:py-4"
          : "flex items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 md:px-10"
      }
    >
      <Link href="/" className="shrink-0 font-display text-xl tracking-tight text-fg">
        PersonaAI
      </Link>
      <nav className="flex min-w-0 items-center gap-3 text-sm text-muted sm:gap-6">
        <Link href="/pricing" className="hidden hover:text-fg sm:inline">
          Pricing
        </Link>
        <Link href="/sign-in" className="shrink-0 hover:text-fg">
          Sign in
        </Link>
        <ButtonLink href={ctaHref} className={`shrink-0 ${buttonClassName}`}>
          {shortLabel ? (
            <>
              <span className="header-cta-short">{shortLabel}</span>
              <span className="header-cta-long">{ctaLabel}</span>
            </>
          ) : (
            ctaLabel
          )}
        </ButtonLink>
      </nav>
    </header>
  );
}
