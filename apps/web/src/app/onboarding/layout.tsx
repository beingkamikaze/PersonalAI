import Link from "next/link";
import { type ReactNode } from "react";
import { AccountChip } from "@/components/account-chip";
import { SignOutButton } from "@/components/sign-out-button";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 md:px-10">
        <Link href="/" className="font-display text-lg text-fg">
          PersonaAI
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <AccountChip href="/app/profile" compact />
          <Link href="/app" className="hidden text-sm text-muted hover:text-fg sm:inline">
            Skip to app
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="px-6 py-10 md:px-10 md:py-14">{children}</main>
    </div>
  );
}
