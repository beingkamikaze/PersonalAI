import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth helpers (Supabase session cookies).
 *
 * Auth mutations stay in the browser — FastAPI has no login/logout/reset endpoints.
 * After sign-out, middleware treats `/app/*` and `/onboarding/*` as unauthenticated.
 */

export type SessionUser = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/** Fired when AI profile display fields change so chrome (sidebar chip) can refresh. */
export const ACCOUNT_CHANGED_EVENT = "personaai:account-changed";

export function notifyAccountChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
  }
}

/** Signed-in identity from Supabase (email + OAuth metadata). Not the AI profile. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const meta = data.user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  return {
    email: data.user.email ?? null,
    name,
    avatarUrl,
  };
}

export async function signOut(): Promise<{ error: string | null }> {
  console.info("[auth] sign-out requested");
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[auth] sign-out failed", error.message);
    return { error: error.message };
  }
  console.info("[auth] sign-out succeeded — session cookies cleared");
  return { error: null };
}

/**
 * Sends Supabase's password-recovery email.
 * `redirectTo` must be allowlisted in Supabase Auth → URL configuration.
 * Typical: `{origin}/auth/callback?next=/update-password`
 */
export async function requestPasswordReset(
  email: string,
  redirectTo: string,
): Promise<{ error: string | null }> {
  console.info("[auth] password-reset email requested");
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) {
    console.error("[auth] password-reset email failed", error.message);
    return { error: error.message };
  }
  console.info("[auth] password-reset email sent (or noop if unknown address)");
  return { error: null };
}

/**
 * Sets a new password for the current recovery (or signed-in) session.
 * Call only after `/auth/callback` exchanged the recovery code into cookies.
 */
export async function updatePassword(
  password: string,
): Promise<{ error: string | null }> {
  console.info("[auth] password update requested");
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[auth] password update failed", error.message);
    return { error: error.message };
  }
  console.info("[auth] password update succeeded");
  return { error: null };
}
