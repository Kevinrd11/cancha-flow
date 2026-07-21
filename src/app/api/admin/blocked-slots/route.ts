import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeText } from "@/lib/utils";

const schema = z.object({
  fieldId: z.string().uuid(),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().trim().min(2).max(300),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.endTime <= parsed.data.startTime) return NextResponse.json({ error: "Datos de bloqueo inválidos" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ ok: true, demo: true }, { status: 201 });
  const { fieldId, date, startTime, endTime, reason } = parsed.data;
  const { error } = await auth.supabase.rpc("create_blocked_slot", { p_field_id: fieldId, p_date: date, p_start_time: startTime, p_end_time: endTime, p_reason: sanitizeText(reason) });
  if (error) return NextResponse.json({ error: ["23P01", "P0001"].includes(error.code) ? "El periodo se superpone con una reserva o bloqueo" : "No se pudo bloquear" }, { status: ["23P01", "P0001"].includes(error.code) ? 409 : 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
