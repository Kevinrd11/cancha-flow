import "server-only";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PlatformBusiness = { id: string; name: string; slug: string; status: string; plan: string; users: number; courts: number };

const demoBusinesses: PlatformBusiness[] = [
  { id: "1", name: "Arena Central", slug: "arena-central", status: "trial", plan: "Pro", users: 3, courts: 3 },
  { id: "2", name: "Pádel Norte", slug: "padel-norte", status: "active", plan: "Inicial", users: 2, courts: 2 },
  { id: "3", name: "Complejo 90", slug: "complejo-90", status: "past_due", plan: "Escala", users: 8, courts: 11 },
];

export async function getPlatformBusinesses(): Promise<PlatformBusiness[]> {
  if (!hasSupabaseEnv()) return demoBusinesses;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "platform_admin") return [];
    const { data } = await supabase.from("businesses").select("id, name, slug, subscription_status, business_members(count), fields(count), subscriptions(plans(name))").order("created_at", { ascending: false });
    return (data ?? []).map((item) => {
      const members = item.business_members as unknown as Array<{ count?: number }>;
      const courts = item.fields as unknown as Array<{ count?: number }>;
      const subscriptions = item.subscriptions as unknown as Array<{ plans?: { name?: string } | Array<{ name?: string }> }>;
      const rawPlan = subscriptions?.[0]?.plans; const plan = (Array.isArray(rawPlan) ? rawPlan[0] : rawPlan)?.name;
      return { id: item.id, name: item.name, slug: item.slug, status: item.subscription_status, plan: plan ?? "Sin plan", users: members?.[0]?.count ?? 0, courts: courts?.[0]?.count ?? 0 };
    });
  } catch { return demoBusinesses; }
}
