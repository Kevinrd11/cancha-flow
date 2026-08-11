import "server-only";
import { requireBusinessPermission } from "@/lib/auth/session";

export async function requireAdmin() {
  return requireBusinessPermission("reservations:manage");
}

/** La información financiera es exclusiva del propietario del negocio. */
export async function requireFinance() {
  return requireBusinessPermission("business:financials");
}
