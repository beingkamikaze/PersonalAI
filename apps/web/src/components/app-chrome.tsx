"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppTopBar } from "@/components/app-top-bar";

/**
 * App main column: top search / bell / profile, then page content.
 * Dashboard (`/app`) locks to one viewport; other routes scroll.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/app";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-end px-4 pt-3 pb-0 md:px-6 md:pt-4">
        <AppTopBar />
      </header>
      <div
        className={
          isDashboard
            ? "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 md:overflow-hidden md:px-6 md:py-4"
            : "min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6"
        }
      >
        {children}
      </div>
    </div>
  );
}
