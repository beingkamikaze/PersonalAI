import Link from "next/link";
import { isUiPreview } from "@/lib/env";

export function PreviewBanner() {
  if (!isUiPreview()) return null;

  return (
    <div className="border-b border-border bg-accent-soft px-6 py-2 text-center text-xs text-fg md:px-10">
      UI preview is on — login is skipped. Open{" "}
      <Link href="/preview" className="font-medium text-accent hover:text-accent-hover">
        all screens
      </Link>
      , then turn off <code>NEXT_PUBLIC_UI_PREVIEW</code> when you need real auth.
    </div>
  );
}
