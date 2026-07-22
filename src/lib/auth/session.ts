import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { hasPermission, type BusinessRole, type Permission, type ProfileRole } from "@/lib/auth/permissions";
import { hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SessionContext = {
  demo: false;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  user: User;
  profileRole: ProfileRole;
  businessId: string | null;
  businessRole: BusinessRole | null;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !user.email_confirmed_at) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active) return null;
  const profileRole = profile.role as ProfileRole;
  if (profileRole === "platform_admin") {
    return { demo: false, supabase, user, profileRole, businessId: null, businessRole: null };
  }

  const requestedBusinessId = (await cookies()).get("cf-business")?.value;
  let membershipQuery = supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("active", true);
  if (requestedBusinessId) membershipQuery = membershipQuery.eq("business_id", requestedBusinessId);
  const { data: memberships } = await membershipQuery.order("created_at").limit(1);
  const membership = memberships?.[0];
  if (!membership) return { demo: false, supabase, user, profileRole, businessId: null, businessRole: null };
  return {
    demo: false,
    supabase,
    user,
    profileRole,
    businessId: membership.business_id,
    businessRole: membership.role as BusinessRole,
  };
}

export async function requireBusinessPermission(permission: Permission) {
  if (isDemoMode()) {
    return {
      demo: true as const,
      supabase: null,
      user: null,
      businessId: "00000000-0000-4000-8000-000000000010",
      role: "owner" as const,
    };
  }
  const session = await getSessionContext();
  if (!session?.businessId || !session.businessRole || !hasPermission(session.businessRole, permission)) return null;
  return { ...session, role: session.businessRole };
}

export async function requirePlatformAdmin() {
  const session = await getSessionContext();
  return session?.profileRole === "platform_admin" && hasPermission(session.profileRole, "platform:manage") ? session : null;
}
