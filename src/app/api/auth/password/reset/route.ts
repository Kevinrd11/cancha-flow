import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const cookieStore = await cookies();
  if (cookieStore.get("cf-recovery-flow")?.value !== "active") {
    return NextResponse.json({ error: "El enlace de recuperación es inválido o venció" }, { status: 401 });
  }
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "El enlace de recuperación es inválido o venció" }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: "No pudimos actualizar la contraseña. Solicita un enlace nuevo." }, { status: 400 });
  const { error: revokeError } = await supabase.auth.signOut({ scope: "global" });
  cookieStore.delete("cf-recovery-flow");
  if (revokeError) {
    await recordSecurityEvent({ action: "auth.password_reset", outcome: "failure", actorId: user.id, metadata: { phase: "session_revocation" } });
    return NextResponse.json({ error: "La contraseña cambió, pero no pudimos confirmar el cierre de todas las sesiones. Contacte soporte." }, { status: 503 });
  }
  await recordSecurityEvent({ action: "auth.password_reset", outcome: "success", actorId: user.id });
  return NextResponse.json({ message: "Contraseña actualizada. Inicia sesión nuevamente." });
}
