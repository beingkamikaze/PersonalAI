"use client";

import { type ReactNode } from "react";
import { AppTopBar } from "@/components/app-top-bar";

/**
 * App main column. Document scrolls; sidebar stays sticky on md+.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 bg-bg">
      <header className="flex items-center justify-end px-4 pt-2 pb-1 md:px-6 md:pt-3">
        <AppTopBar />
      </header>
      <div className="px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-1 md:px-6 md:pb-20">
        {children}
      </div>
    </div>
  );
}
