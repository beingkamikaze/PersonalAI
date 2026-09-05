import Link from "next/link";
import { type ReactNode } from "react";

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
        <Link href="/app" className="text-sm text-muted hover:text-fg">
          Skip to app
        </Link>
      </header>
      <main className="px-6 py-10 md:px-10 md:py-14">{children}</main>
    </div>
  );
}
