import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { getSessionContext } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const session = await getSessionContext();
  if (session) {
    await session.supabase.auth.signOut({ scope: "local" });
    await recordSecurityEvent({
      action: "auth.logout",
      outcome: "success",
      actorId: session.user.id,
      businessId: session.businessId,
    });
  }
  return NextResponse.json({ ok: true });
}
