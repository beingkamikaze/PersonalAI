import { type ReactNode } from "react";

/** Inputs sitting on the page wash. */
export const fieldClass =
  "w-full rounded border border-border bg-elevated px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

/** Inputs sitting on an elevated panel (chat, interview card). */
export const nestedFieldClass =
  "w-full rounded border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-danger" role="alert">
      {children}
    </p>
  );
}
