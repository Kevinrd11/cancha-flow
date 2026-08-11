import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { addMinutesToTime, sanitizeText } from "@/lib/utils";
import { adminReservationSchema, reservationUpdateSchema } from "@/lib/validation";
import { createDemoReservation, getDemoReservation, updateDemoReservation } from "@/lib/demo-data";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import type { requireAdmin as RequireAdmin } from "@/lib/admin-auth";

const CONFLICT_CODES = ["23P01", "P0001"];
const isConflict = (code?: string) => Boolean(code && CONFLICT_CODES.includes(code));

type AdminSupabase = Extract<NonNullable<Awaited<ReturnType<typeof RequireAdmin>>>, { demo: false }>["supabase"];

/** `null` cuando la reserva no existe o pertenece a otro negocio. */
async function readReservationTotal(supabase: AdminSupabase, id: string, businessId: string | null) {
  const { data, error } = await supabase.from("reservations").select("total").eq("id", id).eq("business_id", businessId).single();
  return error || !data ? null : Number(data.total);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = adminReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (auth.demo) {
    try {
      const reservation = createDemoReservation({
        fieldId: parsed.data.fieldId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: addMinutesToTime(parsed.data.startTime, parsed.data.durationMinutes),
        fullName: sanitizeText(parsed.data.fullName),
        phone: sanitizeText(parsed.data.phone),
        email: parsed.data.email,
        source: parsed.data.source,
        status: parsed.data.status,
        notes: parsed.data.notes,
      });
      return NextResponse.json({ reservationCode: reservation.reservationCode, demo: true }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar" }, { status: 409 });
    }
  }

  const data = parsed.data;
  const { data: court } = await auth.supabase
    .from("fields")
    .select("id")
    .eq("id", data.fieldId)
    .eq("business_id", auth.businessId)
    .eq("active", true)
    .single();
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a tu negocio" }, { status: 403 });
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
    const conflict = isConflict(error.code);
    return NextResponse.json({ error: conflict ? "El horario se superpone con una reserva o bloqueo" : "No se pudo guardar" }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json({ reservationCode: code }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = reservationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const { id, status, paymentStatus, date, startTime, endTime, notes, amountPaid, paymentMethod } = parsed.data;

  // El cobro se registra aquí, no en Finanzas: el total sale de la base de datos
  // y el estado del pago se deduce de cuánto se recibió, así que el cliente no
  // puede inventarse ni el monto ni el estado. El trigger de la base propaga el
  // cambio al libro financiero.
  let resolvedPaymentStatus = paymentStatus;
  if (amountPaid !== undefined) {
    const total = auth.demo
      ? getDemoReservation(id)?.total ?? null
      : await readReservationTotal(auth.supabase, id, auth.businessId);
    if (total === null) return NextResponse.json({ error: "Reserva inexistente" }, { status: 404 });
    if (amountPaid > total) return NextResponse.json({ error: "El monto cobrado no puede superar el total de la reserva" }, { status: 400 });
    if (!resolvedPaymentStatus) resolvedPaymentStatus = amountPaid >= total && total > 0 ? "approved" : amountPaid > 0 ? "partial" : "unpaid";
  }

  if (auth.demo) {
    try {
      updateDemoReservation(id, { status, paymentStatus: resolvedPaymentStatus, date, startTime, endTime, notes, amountPaid, paymentMethod });
      return NextResponse.json({ ok: true, demo: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 404 });
    }
  }

  const changes: Record<string, string | number | null> = {};
  if (paymentMethod !== undefined) changes.payment_method = paymentMethod;
  if (amountPaid !== undefined) {
    changes.amount_paid = amountPaid;
    changes.paid_at = amountPaid > 0 ? new Date().toISOString() : null;
  }

  if (resolvedPaymentStatus) {
    const { error: reviewError } = await auth.supabase.rpc("review_reservation_payment", { p_reservation_id: id, p_payment_status: resolvedPaymentStatus, p_reservation_status: status ?? null });
    if (reviewError) return NextResponse.json({ error: "No se pudo revisar el pago" }, { status: 500 });
  } else if (status) changes.status = status;
  if (date || startTime || endTime) {
    const { data: current, error: readError } = await auth.supabase.from("reservations").select("reservation_date, start_time, end_time").eq("id", id).eq("business_id", auth.businessId).single();
    if (readError || !current) return NextResponse.json({ error: "Reserva inexistente" }, { status: 404 });
    const { error: scheduleError } = await auth.supabase.rpc("update_admin_reservation_schedule", {
      p_reservation_id: id,
      p_date: date ?? current.reservation_date,
      p_start_time: startTime ?? current.start_time,
      p_end_time: endTime ?? current.end_time,
      p_notes: notes === undefined ? null : sanitizeText(notes),
    });
    if (scheduleError) return NextResponse.json({ error: isConflict(scheduleError.code) ? "El nuevo horario se superpone con una reserva o bloqueo" : "No se pudo reprogramar" }, { status: isConflict(scheduleError.code) ? 409 : 500 });
  } else if (notes !== undefined) {
    changes.notes = sanitizeText(notes) || null;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ ok: true });
  const { error } = await auth.supabase.from("reservations").update(changes).eq("id", id).eq("business_id", auth.businessId);
  if (error) return NextResponse.json({ error: isConflict(error.code) ? "El nuevo horario se superpone con otra reserva" : "No se pudo actualizar" }, { status: isConflict(error.code) ? 409 : 500 });
  return NextResponse.json({ ok: true });
}
