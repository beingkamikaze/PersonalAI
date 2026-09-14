import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-confirm / password-recovery code exchange.
 * Password reset emails use `?next=/update-password` so the user can set a new password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/app";
  // Only allow same-origin relative paths (open-redirect guard)
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.info("[auth] callback: session exchanged, redirecting to", next);
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth] callback: code exchange failed", error.message);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
