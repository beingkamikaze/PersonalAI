import { type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { AppChrome } from "@/components/app-chrome";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-surface flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <AppChrome>{children}</AppChrome>
    </div>
  );
}
