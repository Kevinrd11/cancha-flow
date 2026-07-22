import "server-only";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!hasSupabaseEnv()) return { demo: true as const, supabase: null, user: null, businessId: "00000000-0000-4000-8000-000000000010", role: "owner" as const };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active) return null;
  if (profile.role === "platform_admin") {
    return { demo: false as const, supabase, user, businessId: null, role: "platform_admin" as const };
  }
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["owner", "staff"])
    .limit(1)
    .single();
  if (!membership) return null;
  return { demo: false as const, supabase, user, businessId: membership.business_id, role: membership.role as "owner" | "staff" };
}
