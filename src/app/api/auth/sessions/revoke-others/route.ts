import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { getSessionContext } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { error } = await session.supabase.auth.signOut({ scope: "others" });
  if (error) return NextResponse.json({ error: "No pudimos cerrar las otras sesiones" }, { status: 503 });
  await recordSecurityEvent({ action: "auth.sessions_revoke_others", outcome: "success", actorId: session.user.id, businessId: session.businessId });
  return NextResponse.json({ message: "Las otras sesiones fueron cerradas." });
}
