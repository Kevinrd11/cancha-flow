import { NextResponse } from "next/server";
import { onboardingSchema } from "@/lib/validation";
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/utils";

export async function POST(request: Request) {
  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const input = parsed.data;
  if (!hasSupabaseEnv()) return NextResponse.json({ publicUrl: `/canchas/${input.slug}`, demo: true }, { status: 201 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Falta configurar la clave privada del servidor" }, { status: 503 });

  const supabase = createAdminSupabaseClient();
  const { data: existing } = await supabase.from("businesses").select("id").eq("slug", input.slug).maybeSingle();
  if (existing) return NextResponse.json({ error: "Ese enlace público ya está en uso" }, { status: 409 });
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, user_metadata: { full_name: sanitizeText(input.ownerName) } });
  if (authError || !authData.user) return NextResponse.json({ error: authError?.message.includes("registered") ? "Ya existe una cuenta con ese correo" : "No pudimos crear el acceso" }, { status: 409 });

  const { error } = await supabase.rpc("complete_business_onboarding", {
    p_user_id: authData.user.id, p_owner_name: sanitizeText(input.ownerName), p_business_name: sanitizeText(input.businessName),
    p_slug: input.slug, p_phone: sanitizeText(input.phone), p_location: sanitizeText(input.location), p_description: sanitizeText(input.description),
    p_currency: input.currency, p_timezone: input.timezone, p_court_name: sanitizeText(input.courtName), p_sport: sanitizeText(input.sport),
    p_opening_time: input.openingTime, p_closing_time: input.closingTime, p_reservation_minutes: input.reservationMinutes,
    p_hourly_rate: input.hourlyRate, p_plan_code: input.plan, p_billing_interval: input.billingInterval,
  });
  if (error) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "No pudimos terminar la configuración" }, { status: 500 });
  }
  return NextResponse.json({ publicUrl: `/canchas/${input.slug}` }, { status: 201 });
}
