import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth/session";
import { sanitizeText } from "@/lib/utils";
import { createDemoBlockedSlot } from "@/lib/demo-data";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

const schema = z.object({
  fieldId: z.string().uuid(),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Seleccione una hora de inicio válida"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Seleccione una hora de fin válida"),
  reason: z.string().trim().min(2, "Escriba el motivo del bloqueo").max(300, "El motivo es demasiado largo"),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("schedule:manage");
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos de bloqueo inválidos" }, { status: 400 });
  if (parsed.data.endTime <= parsed.data.startTime) return NextResponse.json({ error: "La hora de fin debe ser posterior a la de inicio" }, { status: 400 });
  if (auth.demo) {
    try {
      createDemoBlockedSlot({ fieldId: parsed.data.fieldId, date: parsed.data.date, startTime: parsed.data.startTime, endTime: parsed.data.endTime, reason: sanitizeText(parsed.data.reason) });
      return NextResponse.json({ ok: true, demo: true }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo bloquear" }, { status: 409 });
    }
  }
  const { fieldId, date, startTime, endTime, reason } = parsed.data;
  const { data: court } = await auth.supabase.from("fields").select("id").eq("id", fieldId).eq("business_id", auth.businessId).single();
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a tu negocio" }, { status: 403 });
  const { error } = await auth.supabase.rpc("create_blocked_slot", { p_field_id: fieldId, p_date: date, p_start_time: startTime, p_end_time: endTime, p_reason: sanitizeText(reason) });
  if (error) return NextResponse.json({ error: ["23P01", "P0001"].includes(error.code) ? "El periodo se superpone con una reserva o bloqueo" : "No se pudo bloquear" }, { status: ["23P01", "P0001"].includes(error.code) ? 409 : 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
