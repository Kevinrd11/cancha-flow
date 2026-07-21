import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { addMinutesToTime, sanitizeText } from "@/lib/utils";
import { adminReservationSchema, reservationUpdateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = adminReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ reservationCode: `LD-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`, demo: true }, { status: 201 });

  const data = parsed.data;
  const { data: code, error } = await auth.supabase.rpc("create_admin_reservation", {
    p_field_id: data.fieldId,
    p_reservation_date: data.date,
    p_start_time: data.startTime,
    p_end_time: addMinutesToTime(data.startTime, data.durationMinutes),
    p_customer_name: sanitizeText(data.fullName),
    p_customer_phone: sanitizeText(data.phone),
    p_customer_email: data.email || null,
    p_source: data.source,
    p_status: data.status,
    p_notes: data.notes || null,
  });
  if (error) {
    const conflict = ["23P01", "P0001"].includes(error.code);
    return NextResponse.json({ error: conflict ? "El horario se superpone con una reserva o bloqueo" : "No se pudo guardar" }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ reservationCode: code }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = reservationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ ok: true, demo: true });

  const { id, status, paymentStatus, date, startTime, endTime, notes } = parsed.data;
  const changes: Record<string, string | null> = {};
  if (paymentStatus) {
    const { error: reviewError } = await auth.supabase.rpc("review_reservation_payment", { p_reservation_id: id, p_payment_status: paymentStatus, p_reservation_status: status ?? null });
    if (reviewError) return NextResponse.json({ error: "No se pudo revisar el pago" }, { status: 500 });
  } else if (status) changes.status = status;
  if (date || startTime || endTime) {
    const { data: current, error: readError } = await auth.supabase.from("reservations").select("reservation_date, start_time, end_time").eq("id", id).single();
    if (readError || !current) return NextResponse.json({ error: "Reserva inexistente" }, { status: 404 });
    const { error: scheduleError } = await auth.supabase.rpc("update_admin_reservation_schedule", {
      p_reservation_id: id,
      p_date: date ?? current.reservation_date,
      p_start_time: startTime ?? current.start_time,
      p_end_time: endTime ?? current.end_time,
      p_notes: notes === undefined ? null : sanitizeText(notes),
    });
    if (scheduleError) return NextResponse.json({ error: ["23P01", "P0001"].includes(scheduleError.code) ? "El nuevo horario se superpone con una reserva o bloqueo" : "No se pudo reprogramar" }, { status: ["23P01", "P0001"].includes(scheduleError.code) ? 409 : 500 });
  } else if (notes !== undefined) {
    changes.notes = sanitizeText(notes) || null;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ ok: true });
  const { error } = await auth.supabase.from("reservations").update(changes).eq("id", id);
  if (error) return NextResponse.json({ error: error.code === "23P01" ? "El nuevo horario se superpone con otra reserva" : "No se pudo actualizar" }, { status: error.code === "23P01" ? 409 : 500 });
  return NextResponse.json({ ok: true });
}
