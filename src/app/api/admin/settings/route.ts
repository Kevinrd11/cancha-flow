import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth/session";
import { settingsSchema } from "@/lib/validation";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("business:configure");
  if (!auth) return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Configuración inválida" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ ok: true, demo: true });
  const data = parsed.data;
  // El nombre, el precio y el horario pertenecen a una cancha concreta. Se pide
  // por id filtrando también por negocio para que nadie configure una cancha
  // ajena; sin id se sigue configurando la primera, como cuando solo había una.
  const courtQuery = auth.supabase.from("fields").select("id").eq("business_id", auth.businessId);
  const { data: court } = data.fieldId
    ? await courtQuery.eq("id", data.fieldId).single()
    : await courtQuery.order("created_at").limit(1).single();
  if (!court) return NextResponse.json({ error: data.fieldId ? "La cancha no pertenece a su cuenta" : "No hay una cancha configurada" }, { status: data.fieldId ? 403 : 404 });
  const { error: businessError } = await auth.supabase.from("businesses").update({ name: data.businessName, description: data.description, location: data.location, email: data.email, currency: data.currency, timezone: data.timezone, whatsapp_phone: data.whatsappPhone }).eq("id", auth.businessId);
  const { error: fieldError } = await auth.supabase.from("fields").update({ name: data.fieldName, hourly_rate: data.hourlyRate }).eq("id", court.id).eq("business_id", auth.businessId);
  const { error: settingsError } = await auth.supabase.from("business_settings").update({ whatsapp_phone: data.whatsappPhone, sinpe_phone: data.sinpePhone, opening_time: data.openingTime, closing_time: data.closingTime, minimum_reservation_minutes: data.minimumMinutes, hold_minutes: data.holdMinutes, cancellation_policy: data.cancellationPolicy, non_working_days: data.nonWorkingDays }).eq("field_id", court.id).eq("business_id", auth.businessId);
  if (businessError || fieldError || settingsError) return NextResponse.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
