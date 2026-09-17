"use client";

import { type ReactNode } from "react";
import { AppTopBar } from "@/components/app-top-bar";

/**
 * App main column. Document scrolls (works in Cursor Simple Browser).
 */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 bg-bg">
      <header className="flex items-center justify-end px-4 pt-3 pb-2 md:px-6 md:pt-4">
        <AppTopBar />
      </header>
      <div className="px-4 pb-16 pt-2 md:px-6 md:pb-20">{children}</div>
    </div>
  );
}
