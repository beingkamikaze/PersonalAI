"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { AppTopBar } from "@/components/app-top-bar";
import { MobilePlanChip } from "@/components/plan-usage";

/**
 * App main column. Document scrolls; sidebar stays sticky on md+.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 bg-bg">
      <header className="flex items-center gap-2 border-b border-border bg-white px-4 py-2 md:justify-end md:gap-3 md:border-0 md:bg-transparent md:px-6 md:pb-1 md:pt-3">
        <Link
          href="/app"
          className="shrink-0 font-display text-lg tracking-tight text-accent md:hidden"
        >
          PersonaAI
        </Link>
        <MobilePlanChip className="min-w-0 flex-1 md:hidden" />
        <AppTopBar />
      </header>
      <div className="px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-1 md:px-6 md:pb-20">
        {children}
      </div>
    </div>
  );
}
