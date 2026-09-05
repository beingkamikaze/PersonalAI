import { type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <AppNav />
      <div className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</div>
    </div>
  );
}
