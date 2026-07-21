import { NextResponse } from "next/server";
import { addMinutesToTime, currentTimeInCostaRica, sanitizeText, todayInCostaRica } from "@/lib/utils";
import { reservationSchema } from "@/lib/validation";
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  if (parsed.data.date < todayInCostaRica()) {
    return NextResponse.json({ error: "No puedes reservar un horario pasado" }, { status: 400 });
  }
  if (parsed.data.date === todayInCostaRica() && parsed.data.startTime <= currentTimeInCostaRica()) {
    return NextResponse.json({ error: "No puedes reservar un horario que ya pasó" }, { status: 400 });
  }

  const payload = {
    ...parsed.data,
    fullName: sanitizeText(parsed.data.fullName),
    phone: sanitizeText(parsed.data.phone),
    email: parsed.data.email?.trim().toLowerCase() || null,
    endTime: addMinutesToTime(parsed.data.startTime, parsed.data.durationMinutes),
  };

  if (!hasSupabaseEnv()) {
    const reservationCode = `LD-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    return NextResponse.json({
      reservationCode,
      publicToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      demo: true,
    }, { status: 201 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Falta configurar la clave privada del servidor" }, { status: 503 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("create_public_reservation", {
      p_field_id: payload.fieldId,
      p_reservation_date: payload.date,
      p_start_time: payload.startTime,
      p_end_time: payload.endTime,
      p_customer_name: payload.fullName,
      p_customer_phone: payload.phone,
      p_customer_email: payload.email,
    });
    if (error) {
      if (["23P01", "P0001"].includes(error.code)) {
        return NextResponse.json({ error: "Ese horario acaba de ocuparse. Elige otro disponible." }, { status: 409 });
      }
      throw error;
    }
    const created = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      reservationCode: created.reservation_code,
      publicToken: created.public_token,
      expiresAt: created.expires_at,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No pudimos crear la reserva. Intenta de nuevo." }, { status: 503 });
  }
}
