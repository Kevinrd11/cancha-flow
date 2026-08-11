import "server-only";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type PlatformBusiness = {
  id: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
  subscriptionStatus: string;
  plan: string;
  users: number;
  courts: number;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  createdAt: string;
  reviewedAt: string | null;
};

const now = new Date();
const demoBusinesses: PlatformBusiness[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Fútbol Cinco San Pedro",
    slug: "futbol-cinco-san-pedro",
    approvalStatus: "pending",
    subscriptionStatus: "trial",
    plan: "Pro",
    users: 1,
    courts: 2,
    ownerName: "Daniel Vargas",
    email: "daniel@futbolcinco.cr",
    phone: "8888-2201",
    location: "San Pedro, Montes de Oca",
    createdAt: new Date(now.getTime() - 22 * 60 * 1000).toISOString(),
    reviewedAt: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Arena Central",
    slug: "arena-central",
    approvalStatus: "approved",
    subscriptionStatus: "trial",
    plan: "Pro",
    users: 3,
    courts: 3,
    ownerName: "Mariana Rodríguez",
    email: "mariana@arenacentral.cr",
    phone: "2222-4400",
    location: "San José, Costa Rica",
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Complejo 90",
    slug: "complejo-90",
    approvalStatus: "rejected",
    subscriptionStatus: "suspended",
    plan: "Escala",
    users: 1,
    courts: 1,
    ownerName: "Andrés Solano",
    email: "andres@complejo90.cr",
    phone: "8700-9010",
    location: "Heredia, Costa Rica",
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

type RawMembership = { user_id?: string; role?: string; active?: boolean };
type RawCount = { count?: number };
type RawSubscription = { plans?: { name?: string } | Array<{ name?: string }> };
type PlatformAdminAuth = NonNullable<Awaited<ReturnType<typeof requirePlatformAdmin>>>;

export async function getPlatformBusinesses(auth: PlatformAdminAuth): Promise<PlatformBusiness[]> {
  if (isDemoMode()) return demoBusinesses;
  if (!hasSupabaseEnv()) return [];

  const { data, error } = await auth.supabase
    .from("businesses")
    .select("id, name, slug, email, phone, location, approval_status, subscription_status, created_at, reviewed_at, business_members(user_id, role, active), fields(count), subscriptions(plans(name))")
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las solicitudes de acceso", { cause: error });
  if (!data) return [];

  const ownerIds = data.flatMap((item) => {
    const members = item.business_members as unknown as RawMembership[];
    const ownerId = members.find((member) => member.role === "owner")?.user_id;
    return ownerId ? [ownerId] : [];
  });
  const { data: profiles, error: profilesError } = ownerIds.length
    ? await auth.supabase.from("profiles").select("id, full_name").in("id", ownerIds)
    : { data: [] as Array<{ id: string; full_name: string }>, error: null };
  if (profilesError) throw new Error("No se pudieron cargar los propietarios de las solicitudes", { cause: profilesError });
  const ownerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return data.map((item) => {
    const members = item.business_members as unknown as RawMembership[];
    const fields = item.fields as unknown as RawCount[];
    const subscriptions = item.subscriptions as unknown as RawSubscription[];
    const ownerId = members.find((member) => member.role === "owner")?.user_id;
    const rawPlan = subscriptions?.[0]?.plans;
    const plan = (Array.isArray(rawPlan) ? rawPlan[0] : rawPlan)?.name;
    const approvalStatus = ["pending", "approved", "rejected"].includes(item.approval_status)
      ? item.approval_status as ApprovalStatus
      : "pending";

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      approvalStatus,
      subscriptionStatus: item.subscription_status,
      plan: plan ?? "Sin plan",
      users: members.length,
      courts: fields?.[0]?.count ?? 0,
      ownerName: ownerId ? ownerNames.get(ownerId) ?? "Propietario" : "Propietario",
      email: item.email ?? "",
      phone: item.phone ?? "",
      location: item.location,
      createdAt: item.created_at,
      reviewedAt: item.reviewed_at,
    };
  });
}
