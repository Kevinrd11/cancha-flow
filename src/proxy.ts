import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/auth/cookies";
import { getSupabasePublishableKey, getSupabaseUrl, isDemoMode } from "@/lib/supabase/env";

function redirectWithCookies(url: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const isLogin = request.nextUrl.pathname === "/admin/login";
  if (!url || !key) {
    if (isDemoMode() || isLogin) return NextResponse.next({ request });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("error", "configuration");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isPlatform = request.nextUrl.pathname.startsWith("/plataforma");
  if ((!user || !user.email_confirmed_at) && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return redirectWithCookies(loginUrl, response);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();
    const isPlatformAdmin = profile?.role === "platform_admin";
    const { data: membership } = isPlatformAdmin ? { data: null } : await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", user.id)
      .eq("active", true)
      .in("role", ["owner", "staff"])
      .limit(1)
      .maybeSingle();
    const canManageBusiness = Boolean(membership && ["owner", "staff"].includes(membership.role));
    const ownerOnlyPath = ["/admin/configuracion", "/admin/canchas", "/admin/finanzas"].some((path) => request.nextUrl.pathname.startsWith(path));
    if ((!profile || !profile.active || (isPlatform && !isPlatformAdmin) || (!isPlatform && !isLogin && (!canManageBusiness || isPlatformAdmin))) && !isLogin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = isPlatformAdmin ? "/plataforma" : "/admin/login";
      if (!isPlatformAdmin) loginUrl.searchParams.set("error", "unauthorized");
      return redirectWithCookies(loginUrl, response);
    }
    if (ownerOnlyPath && membership?.role !== "owner") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.searchParams.set("error", "insufficient_role");
      return redirectWithCookies(adminUrl, response);
    }
    if (isLogin && profile?.active && (canManageBusiness || isPlatformAdmin)) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = isPlatformAdmin ? "/plataforma" : "/admin";
      return redirectWithCookies(adminUrl, response);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/plataforma/:path*"],
};
