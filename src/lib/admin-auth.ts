import "server-only";
import { requireBusinessPermission } from "@/lib/auth/session";

export async function requireAdmin() {
  return requireBusinessPermission("reservations:manage");
}
