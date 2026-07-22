import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { enforceAuthRateLimit, hasTrustedOrigin } from "@/lib/auth/request-security";
import { recoveryRequestSchema } from "@/lib/auth/validation";
import { getAppUrl, hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const GENERIC_MESSAGE = "Si la cuenta está pendiente, recibirás un nuevo correo de confirmación.";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  }

  const parsed = recoveryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Correo inválido" }, { status: 400 });
  }
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "La autenticación no está configurada" }, { status: 503 });
  }

  let rateLimit;
  try {
    rateLimit = await enforceAuthRateLimit(request, "recovery", parsed.data.email);
  } catch {
    return NextResponse.json({ error: "El servicio de confirmación no está disponible" }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    await recordSecurityEvent({ action: "auth.confirmation_resent", outcome: "blocked", requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
  });
  await recordSecurityEvent({
    action: "auth.confirmation_resent",
    outcome: error ? "failure" : "success",
    requestFingerprint: rateLimit.fingerprint,
  });

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
