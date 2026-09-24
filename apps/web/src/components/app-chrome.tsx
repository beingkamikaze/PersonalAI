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
    <div className="min-w-0 flex-1">
      <header className="flex items-center gap-2 px-4 py-3 md:gap-4 md:px-8 md:pt-3 md:pb-2">
        <Link
          href="/app"
          className="shrink-0 font-display text-lg tracking-tight text-accent md:hidden"
        >
          PersonaAI
        </Link>
        <MobilePlanChip className="min-w-0 flex-1 md:hidden" />
        <AppTopBar />
      </header>
      <div className="px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-0 md:px-8 md:pb-8">
        {children}
      </div>
    </div>
  );
}
