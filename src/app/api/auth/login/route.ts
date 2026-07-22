import { NextResponse } from "next/server";
import { destinationForRole, type ProfileRole } from "@/lib/auth/permissions";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { enforceAuthRateLimit, hasTrustedOrigin } from "@/lib/auth/request-security";
import { loginSchema } from "@/lib/auth/validation";
import { hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INVALID_CREDENTIALS = "Correo, contraseña o estado de la cuenta inválidos";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });

  if (isDemoMode()) return NextResponse.json({ redirectTo: "/admin", demo: true });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "La autenticación no está configurada" }, { status: 503 });

  let rateLimit;
  try {
    rateLimit = await enforceAuthRateLimit(request, "login", parsed.data.email);
  } catch {
    return NextResponse.json({ error: "El servicio de acceso no está disponible" }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    await recordSecurityEvent({ action: "auth.login", outcome: "blocked", requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json(
      { error: "Demasiados intentos. Espera antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user || !data.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    await recordSecurityEvent({ action: "auth.login", outcome: "failure", requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", data.user.id).single();
  if (!profile?.active) {
    await supabase.auth.signOut({ scope: "local" });
    await recordSecurityEvent({ action: "auth.login", outcome: "failure", actorId: data.user.id, requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const profileRole = profile.role as ProfileRole;
  let businessId: string | null = null;
  let effectiveRole = profileRole;
  if (profileRole === "owner" || profileRole === "staff") {
    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", data.user.id)
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!membership) {
      await supabase.auth.signOut({ scope: "local" });
      await recordSecurityEvent({ action: "auth.login", outcome: "failure", actorId: data.user.id, requestFingerprint: rateLimit.fingerprint });
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }
    businessId = membership.business_id;
    effectiveRole = membership.role as ProfileRole;
  }

  await recordSecurityEvent({
    action: "auth.login",
    outcome: "success",
    actorId: data.user.id,
    businessId,
    requestFingerprint: rateLimit.fingerprint,
  });
  return NextResponse.json({ redirectTo: destinationForRole(effectiveRole) });
}
