import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { getDemoAvailability } from "@/lib/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TimeSlot } from "@/lib/types";
import { currentTimeInCostaRica, todayInCostaRica } from "@/lib/utils";

export const dynamic = "force-dynamic";

const querySchema = z.object({ date: z.iso.date() });

function removePastSlots(date: string, slots: TimeSlot[]) {
  if (date !== todayInCostaRica()) return slots;
  const currentMinutes = Number(currentTimeInCostaRica().replace(":", ""));
  return slots.filter((slot) => Number(slot.time.replace(":", "")) > currentMinutes);
}

export async function GET(request: Request) {
  const parsed = querySchema.safeParse({ date: new URL(request.url).searchParams.get("date") });
  if (!parsed.success || parsed.data.date < todayInCostaRica()) {
    return NextResponse.json({ error: "La fecha no es válida" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ slots: removePastSlots(parsed.data.date, getDemoAvailability(parsed.data.date)), demo: true });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_public_availability", {
      p_field_id: DEFAULT_SETTINGS.fieldId,
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
    return NextResponse.json({ slots: removePastSlots(parsed.data.date, slots) });
  } catch {
    return NextResponse.json({ error: "No pudimos consultar los horarios" }, { status: 503 });
  }
}
