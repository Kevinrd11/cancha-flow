import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSessionContext } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Panel administrativo", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // El menú refleja el rol: el personal operativo no ve las secciones de dueño.
  const role = isDemoMode() ? "owner" : (await getSessionContext())?.businessRole ?? "staff";
  return <AdminShell role={role}>{children}</AdminShell>;
}
