import { NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { requireAdmin } from "@/lib/admin-auth";
import { settingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Configuración inválida" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ ok: true, demo: true });
  const data = parsed.data;
  const { error: fieldError } = await auth.supabase.from("fields").update({ name: data.fieldName, hourly_rate: data.hourlyRate }).eq("id", DEFAULT_SETTINGS.fieldId);
  const { error: settingsError } = await auth.supabase.from("business_settings").update({ whatsapp_phone: data.whatsappPhone, sinpe_phone: data.sinpePhone, opening_time: data.openingTime, closing_time: data.closingTime, minimum_reservation_minutes: data.minimumMinutes, hold_minutes: data.holdMinutes, cancellation_policy: data.cancellationPolicy, non_working_days: data.nonWorkingDays }).eq("field_id", DEFAULT_SETTINGS.fieldId);
  if (fieldError || settingsError) return NextResponse.json({ error: "No se pudo guardar la configuración" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
