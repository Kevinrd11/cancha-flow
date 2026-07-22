import "server-only";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";

export type PlatformBusiness = { id: string; name: string; slug: string; status: string; plan: string; users: number; courts: number };

const demoBusinesses: PlatformBusiness[] = [
  { id: "1", name: "Arena Central", slug: "arena-central", status: "trial", plan: "Pro", users: 3, courts: 3 },
  { id: "2", name: "Pádel Norte", slug: "padel-norte", status: "active", plan: "Inicial", users: 2, courts: 2 },
  { id: "3", name: "Complejo 90", slug: "complejo-90", status: "past_due", plan: "Escala", users: 8, courts: 11 },
];

export async function getPlatformBusinesses(): Promise<PlatformBusiness[]> {
  if (isDemoMode()) return demoBusinesses;
  if (!hasSupabaseEnv()) return [];
  try {
    const auth = await requirePlatformAdmin();
    if (!auth) return [];
    const { data } = await auth.supabase.from("businesses").select("id, name, slug, subscription_status, business_members(count), fields(count), subscriptions(plans(name))").order("created_at", { ascending: false });
    return (data ?? []).map((item) => {
      const members = item.business_members as unknown as Array<{ count?: number }>;
      const courts = item.fields as unknown as Array<{ count?: number }>;
      const subscriptions = item.subscriptions as unknown as Array<{ plans?: { name?: string } | Array<{ name?: string }> }>;
      const rawPlan = subscriptions?.[0]?.plans; const plan = (Array.isArray(rawPlan) ? rawPlan[0] : rawPlan)?.name;
      return { id: item.id, name: item.name, slug: item.slug, status: item.subscription_status, plan: plan ?? "Sin plan", users: members?.[0]?.count ?? 0, courts: courts?.[0]?.count ?? 0 };
    });
  } catch { return []; }
}
