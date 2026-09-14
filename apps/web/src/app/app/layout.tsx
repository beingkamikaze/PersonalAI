import { type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:h-dvh md:flex-row md:overflow-hidden">
      <AppNav />
      <div className="min-h-0 flex-1 px-6 py-8 md:overflow-y-auto md:px-10 md:py-10">
        {children}
      </div>
    </div>
  );
}
