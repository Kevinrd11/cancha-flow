import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { getSessionContext } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/auth/validation";
import { createAdminSupabaseClient, createIsolatedSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const session = await getSessionContext();
  if (!session?.user.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "El cambio de contraseña no está configurado" }, { status: 503 });

  const verifier = createIsolatedSupabaseClient();
  const { error: verificationError } = await verifier.auth.signInWithPassword({
    email: session.user.email,
    password: parsed.data.currentPassword,
  });
  if (verificationError) {
    await recordSecurityEvent({ action: "auth.password_change", outcome: "failure", actorId: session.user.id, businessId: session.businessId });
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }

  const { data: current } = await session.supabase.auth.getSession();
  if (!current.session?.access_token) return NextResponse.json({ error: "La sesión venció. Inicie sesión de nuevo." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(session.user.id, { password: parsed.data.password });
  if (updateError) return NextResponse.json({ error: "No pudimos actualizar la contraseña" }, { status: 503 });
  const { error: revokeError } = await admin.auth.admin.signOut(current.session.access_token, "global");
  await session.supabase.auth.signOut({ scope: "local" });
  if (revokeError) {
    await recordSecurityEvent({ action: "auth.password_change", outcome: "failure", actorId: session.user.id, businessId: session.businessId, metadata: { phase: "session_revocation" } });
    return NextResponse.json({ error: "La contraseña cambió, pero no pudimos confirmar el cierre de todas las sesiones. Contacte soporte." }, { status: 503 });
  }
  await recordSecurityEvent({ action: "auth.password_change", outcome: "success", actorId: session.user.id, businessId: session.businessId });
  return NextResponse.json({ message: "Contraseña actualizada. Todas las sesiones anteriores se cerraron." });
}
