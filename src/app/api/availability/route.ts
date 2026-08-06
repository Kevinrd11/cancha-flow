import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoAvailability } from "@/lib/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TimeSlot } from "@/lib/types";
import { currentTimeInCostaRica, todayInCostaRica } from "@/lib/utils";

export const dynamic = "force-dynamic";

const querySchema = z.object({ date: z.iso.date(), fieldId: z.string().uuid() });

// La cancha se aparta de hora en hora. Si una configuración vieja todavía
// generara medias horas, no deben llegar a ofrecerse al cliente.
function onlyHourlySlots(slots: TimeSlot[]) {
  return slots.filter((slot) => slot.time.endsWith(":00"));
}

function removePastSlots(date: string, slots: TimeSlot[]) {
  if (date !== todayInCostaRica()) return slots;
  const currentMinutes = Number(currentTimeInCostaRica().replace(":", ""));
  return slots.filter((slot) => Number(slot.time.replace(":", "")) > currentMinutes);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ date: url.searchParams.get("date"), fieldId: url.searchParams.get("fieldId") });
  if (!parsed.success || parsed.data.date < todayInCostaRica()) {
    return NextResponse.json({ error: "La fecha no es válida" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ slots: onlyHourlySlots(removePastSlots(parsed.data.date, getDemoAvailability(parsed.data.date, parsed.data.fieldId))), demo: true });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_public_availability", {
      p_field_id: parsed.data.fieldId,
      p_date: parsed.data.date,
    });
    if (error) throw error;
    const slots: TimeSlot[] = (data ?? []).map((item: { slot_time: string; slot_state: TimeSlot["state"] }) => ({
      time: item.slot_time.slice(0, 5),
      label: new Intl.DateTimeFormat("es-CR", { hour: "numeric", minute: "2-digit", hour12: true }).format(
        new Date(`2026-01-01T${item.slot_time}`),
      ),
      state: item.slot_state,
    }));
    return NextResponse.json({ slots: onlyHourlySlots(removePastSlots(parsed.data.date, slots)) });
  } catch {
    return NextResponse.json({ error: "No pudimos consultar los horarios" }, { status: 503 });
  }
}
