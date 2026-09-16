"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth";

/**
 * Clears the Supabase session and sends the user to `/sign-in`.
 * Safe to mount in app shell and onboarding chrome — does not touch API state.
 */
export function SignOutButton({
  className = "",
  variant = "ghost",
  fullWidth = false,
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setError(signOutError);
      setLoading(false);
      return;
    }
    // replace + refresh so middleware sees cleared cookies (no back to protected pages)
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className={className}>
      {fullWidth ? (
        <button
          type="button"
          disabled={loading}
          data-unsaved-leave="true"
          onClick={() => void onSignOut()}
          className="inline-flex w-full items-center justify-start gap-2 rounded px-3 py-2 text-left text-sm text-muted transition hover:bg-white/70 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/20 disabled:opacity-50"
          aria-label="Sign out"
        >
          <SignOutIcon className="shrink-0" />
          {loading ? "Signing out…" : "Sign out"}
        </button>
      ) : (
        <Button
          type="button"
          variant={variant}
          disabled={loading}
          data-unsaved-leave="true"
          onClick={() => void onSignOut()}
          className="w-full justify-start gap-2 font-normal md:w-auto"
          aria-label="Sign out"
        >
          <SignOutIcon className="shrink-0" />
          {loading ? "Signing out…" : "Sign out"}
        </Button>
      )}
      {error ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
