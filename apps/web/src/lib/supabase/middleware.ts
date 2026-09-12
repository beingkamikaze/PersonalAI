import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseEnv,
} from "@/lib/env";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const cookieAdapter: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value),
      );
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options),
      );
    },
  };

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: cookieAdapter,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/onboarding") || path.startsWith("/app");

  // After client signOut(), cookies are gone — next navigation here sends them to sign-in
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Recovery / change-password needs a session from the email link (or existing login)
  if (path === "/update-password" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password";
    return NextResponse.redirect(url);
  }

  // Signed-in users should not see auth entry forms (logout lands on /sign-in with no session).
  // Do NOT redirect away from /update-password — recovery lands there with a session.
  if (user && (path === "/sign-in" || path === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding/create";
    return NextResponse.redirect(url);
  }

  // Already signed in: skip “forgot” and go straight to set-new-password
  if (user && path === "/forgot-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/update-password";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
