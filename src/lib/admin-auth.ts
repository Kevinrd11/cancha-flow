import "server-only";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!hasSupabaseEnv()) return { demo: true as const, supabase: null, user: null };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active || profile.role !== "admin") return null;
  return { demo: false as const, supabase, user };
}
