import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destinationForRole, type ProfileRole } from "@/lib/auth/permissions";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { safeNextPath } from "@/lib/auth/request-security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = safeNextPath(url.searchParams.get("next"), "/admin");
  if (!code) return NextResponse.redirect(new URL("/admin/login?error=invalid_link", url.origin));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid_link", url.origin));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login?error=invalid_link", url.origin));

  if (requestedNext === "/restablecer-contrasena") {
    (await cookies()).set("cf-recovery-flow", "active", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 10 * 60,
    });
    return NextResponse.redirect(new URL(requestedNext, url.origin));
  }

  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", url.origin));
  }
  let role = profile.role as ProfileRole;
  let businessId: string | null = null;
  if (role !== "platform_admin") {
    const { data: membership } = await supabase.from("business_members").select("business_id, role").eq("user_id", user.id).eq("active", true).order("created_at").limit(1).maybeSingle();
    if (membership) {
      role = membership.role as ProfileRole;
      businessId = membership.business_id;
    }
  }
  await recordSecurityEvent({ action: "auth.email_verified", outcome: "success", actorId: user.id, businessId });
  return NextResponse.redirect(new URL(destinationForRole(role), url.origin));
}
