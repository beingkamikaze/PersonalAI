import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader({
  ctaHref = "/sign-up",
  ctaLabel = "Create My AI",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-10">
      <Link href="/" className="font-display text-xl tracking-tight text-fg">
        PersonaAI
      </Link>
      <nav className="flex items-center gap-5 text-sm text-muted">
        <Link href="/pricing" className="hover:text-fg">
          Pricing
        </Link>
        <Link href="/sign-in" className="hover:text-fg">
          Sign in
        </Link>
        <ButtonLink href={ctaHref} className="hidden sm:inline-flex">
          {ctaLabel}
        </ButtonLink>
      </nav>
    </header>
  );
}
