import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth/session";
import { sanitizeText } from "@/lib/utils";
import { createDemoBlockedSlot, deleteDemoBlockedSlot } from "@/lib/demo-data";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

const schema = z.object({
  fieldId: z.string().uuid(),
  date: z.iso.date(),
  // Los bloqueos siguen la misma regla que las reservas: horas en punto.
  startTime: z.string().regex(/^([01]\d|2[0-3]):00$/, "La hora de inicio debe ser en punto"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):00$/, "La hora de fin debe ser en punto"),
  reason: z.string().trim().min(2, "Escriba el motivo del bloqueo").max(300, "El motivo es demasiado largo"),
});

const deleteSchema = z.object({ id: z.string().uuid("Seleccione un bloqueo válido") });

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("schedule:manage");
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos de bloqueo inválidos" }, { status: 400 });
  if (parsed.data.endTime <= parsed.data.startTime) return NextResponse.json({ error: "La hora de fin debe ser posterior a la de inicio" }, { status: 400 });
  const { fieldId, date, startTime, endTime } = parsed.data;
  const reason = sanitizeText(parsed.data.reason);
  if (auth.demo) {
    try {
      const created = createDemoBlockedSlot({ fieldId, date, startTime, endTime, reason });
      return NextResponse.json({ blockedSlot: created, demo: true }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo bloquear" }, { status: 409 });
    }
  }
  const { data: court } = await auth.supabase.from("fields").select("id, name").eq("id", fieldId).eq("business_id", auth.businessId).single();
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a tu negocio" }, { status: 403 });
  const { data: id, error } = await auth.supabase.rpc("create_blocked_slot", { p_field_id: fieldId, p_date: date, p_start_time: startTime, p_end_time: endTime, p_reason: reason });
  if (error) return NextResponse.json({ error: ["23P01", "P0001"].includes(error.code) ? "El periodo se superpone con una reserva o bloqueo" : "No se pudo bloquear" }, { status: ["23P01", "P0001"].includes(error.code) ? 409 : 500 });
  return NextResponse.json({ blockedSlot: { id, fieldId, date, startTime, endTime, reason, courtName: court.name } }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("schedule:manage");
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (auth.demo) {
    if (!deleteDemoBlockedSlot(parsed.data.id)) return NextResponse.json({ error: "El bloqueo ya no existe" }, { status: 404 });
    return NextResponse.json({ ok: true, demo: true });
  }
  // La política blocked_tenant_all ya limita el borrado al negocio del usuario;
  // el filtro por business_id lo hace explícito y distingue el 404 del 403.
  const { data, error } = await auth.supabase
    .from("blocked_slots")
    .delete()
    .eq("id", parsed.data.id)
    .eq("business_id", auth.businessId)
    .select("id");
  if (error) return NextResponse.json({ error: "No se pudo quitar el bloqueo" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "El bloqueo ya no existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
