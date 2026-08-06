import "server-only";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type PublicSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type PublicFieldSettings = {
  openingTime: string;
  closingTime: string;
  slotIntervalMinutes: number;
  minimumMinutes: number;
  whatsappPhone: string;
};

type PublicFieldSettingsRow = {
  field_id: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number;
  minimum_reservation_minutes: number;
  whatsapp_phone: string | null;
};

/**
 * business_settings no es legible por `anon` desde el endurecimiento de RLS, así
 * que la ficha pública lee el horario por la función security definer
 * get_public_field_settings, que solo devuelve las columnas publicables.
 */
export async function getPublicFieldSettings(
  supabase: PublicSupabaseClient,
  fieldIds: string[],
): Promise<Map<string, PublicFieldSettings>> {
  if (fieldIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_public_field_settings", { p_field_ids: fieldIds });
  // El horario es un dato accesorio de la ficha: si la función todavía no está
  // aplicada en la base de datos, la página cae al horario por defecto en vez de
  // quedarse sin catálogo. Perder la lista completa sería mucho peor.
  if (error) return new Map();
  return new Map(
    ((data ?? []) as PublicFieldSettingsRow[]).map((row) => [
      row.field_id,
      {
        openingTime: row.opening_time.slice(0, 5),
        closingTime: row.closing_time.slice(0, 5),
        slotIntervalMinutes: row.slot_interval_minutes,
        minimumMinutes: row.minimum_reservation_minutes,
        whatsappPhone: row.whatsapp_phone ?? "",
      },
    ]),
  );
}
