import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
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
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const isPlatform = request.nextUrl.pathname.startsWith("/plataforma");
  if (!user && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
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
      .select("business_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .in("role", ["owner", "staff"])
      .limit(1)
      .maybeSingle();
    const canManageBusiness = isPlatformAdmin || (["admin", "owner", "staff"].includes(profile?.role ?? "") && Boolean(membership));
    if ((!profile || !canManageBusiness || !profile.active || (isPlatform && !isPlatformAdmin)) && !isLogin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
    if (isLogin && profile?.active && canManageBusiness) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      return NextResponse.redirect(adminUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/plataforma/:path*"],
};
