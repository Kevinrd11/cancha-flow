import { NextResponse } from "next/server";
import { recordSecurityEvent } from "@/lib/auth/audit";
import { enforceAuthRateLimit, hasTrustedOrigin } from "@/lib/auth/request-security";
import { onboardingSchema } from "@/lib/validation";
import { hasSupabaseAdminEnv, hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";
import { createAdminSupabaseClient, createIsolatedSupabaseClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/utils";

function isExistingEmailError(error: { code?: string; message?: string; status?: number } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "email_exists"
    || error.status === 422
    || message.includes("already been registered")
    || message.includes("already exists");
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const input = parsed.data;
  const publicUrl = `/centro/${input.slug}`;
  if (isDemoMode()) return NextResponse.json({ publicUrl, requiresEmailVerification: false, demo: true }, { status: 201 });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "La autenticación no está configurada" }, { status: 503 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Falta configurar la clave privada del servidor" }, { status: 503 });

  let rateLimit;
  try {
    rateLimit = await enforceAuthRateLimit(request, "register", input.email);
  } catch {
    return NextResponse.json({ error: "El servicio de registro no está disponible" }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    await recordSecurityEvent({ action: "auth.register", outcome: "blocked", requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json(
      { error: "Demasiados intentos de registro. Espere antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("businesses").select("id").eq("slug", input.slug).maybeSingle();
  if (existing) {
    const { data: ownerMembership } = await admin
      .from("business_members")
      .select("user_id")
      .eq("business_id", existing.id)
      .eq("role", "owner")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    const { data: ownerAuth } = ownerMembership?.user_id
      ? await admin.auth.admin.getUserById(ownerMembership.user_id)
      : { data: { user: null } };
    const existingOwner = ownerAuth.user;

    if (existingOwner?.email?.toLowerCase() === input.email) {
      if (existingOwner.email_confirmed_at) {
        return NextResponse.json({ error: "Esta cuenta ya está registrada. Inicie sesión para abrir su panel." }, { status: 409 });
      }

      const { error: activationError } = await admin.auth.admin.updateUserById(existingOwner.id, { email_confirm: true });
      if (activationError) {
        await recordSecurityEvent({
          action: "auth.register",
          outcome: "failure",
          actorId: existingOwner.id,
          businessId: existing.id,
          requestFingerprint: rateLimit.fingerprint,
        });
        return NextResponse.json({ error: "No pudimos activar la cuenta" }, { status: 500 });
      }

      await recordSecurityEvent({
        action: "auth.register",
        outcome: "success",
        actorId: existingOwner.id,
        businessId: existing.id,
        requestFingerprint: rateLimit.fingerprint,
      });
      return NextResponse.json({
        publicUrl,
        requiresEmailVerification: false,
        message: "La cuenta existente quedó activa. Ya puede iniciar sesión con su contraseña original.",
      }, { status: 201 });
    }

    return NextResponse.json({ error: "Ese enlace público ya está en uso. Pruebe otro nombre para el enlace." }, { status: 409 });
  }

  const onboardingParams = {
    p_user_id: "",
    p_owner_name: sanitizeText(input.ownerName), p_business_name: sanitizeText(input.businessName),
    p_slug: input.slug, p_phone: sanitizeText(input.phone), p_location: sanitizeText(input.location), p_description: sanitizeText(input.description),
    p_currency: input.currency, p_timezone: input.timezone, p_court_name: sanitizeText(input.courtName), p_sport: sanitizeText(input.sport),
    p_opening_time: input.openingTime, p_closing_time: input.closingTime, p_reservation_minutes: input.reservationMinutes,
    p_hourly_rate: input.hourlyRate, p_plan_code: input.plan, p_billing_interval: input.billingInterval,
  };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: sanitizeText(input.ownerName) },
  });
  if (authError || !authData.user) {
    if (!isExistingEmailError(authError)) {
      await recordSecurityEvent({ action: "auth.register", outcome: "failure", requestFingerprint: rateLimit.fingerprint });
      return NextResponse.json({ error: "No pudimos crear la cuenta" }, { status: 503 });
    }

    const verifier = createIsolatedSupabaseClient();
    const { data: existingAuth } = await verifier.auth.signInWithPassword({ email: input.email, password: input.password });
    const existingUser = existingAuth.user;
    if (existingUser?.email_confirmed_at) {
      const [{ data: profile }, { data: membership }] = await Promise.all([
        admin.from("profiles").select("role, active").eq("id", existingUser.id).maybeSingle(),
        admin.from("business_members").select("id").eq("user_id", existingUser.id).eq("active", true).limit(1).maybeSingle(),
      ]);
      if (!profile?.active || profile.role !== "customer" || membership) {
        return NextResponse.json({ error: "Esta cuenta ya administra un centro. Inicia sesión para abrir su panel." }, { status: 409 });
      }

      const { error: upgradeError } = await admin.rpc("complete_business_onboarding", { ...onboardingParams, p_user_id: existingUser.id });
      if (upgradeError) {
        await recordSecurityEvent({ action: "auth.register", outcome: "failure", actorId: existingUser.id, requestFingerprint: rateLimit.fingerprint });
        return NextResponse.json({ error: "No pudimos terminar la configuración" }, { status: 500 });
      }
      await recordSecurityEvent({ action: "auth.register", outcome: "success", actorId: existingUser.id, requestFingerprint: rateLimit.fingerprint });
      return NextResponse.json({ publicUrl, requiresEmailVerification: false }, { status: 201 });
    }

    await recordSecurityEvent({ action: "auth.register", outcome: "failure", requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json({ error: "Este correo ya está registrado. Inicie sesión o utilice otro correo." }, { status: 409 });
  }

  const { error } = await admin.rpc("complete_business_onboarding", { ...onboardingParams, p_user_id: authData.user.id });
  if (error) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await recordSecurityEvent({ action: "auth.register", outcome: "failure", actorId: authData.user.id, requestFingerprint: rateLimit.fingerprint });
    return NextResponse.json({ error: "No pudimos terminar la configuración" }, { status: 500 });
  }
  await recordSecurityEvent({ action: "auth.register", outcome: "success", actorId: authData.user.id, requestFingerprint: rateLimit.fingerprint });
  return NextResponse.json({ publicUrl, requiresEmailVerification: false }, { status: 201 });
}
