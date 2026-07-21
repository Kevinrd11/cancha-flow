import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/types";

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (!hasSupabaseEnv()) return DEFAULT_SETTINGS;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("field_id, whatsapp_phone, sinpe_phone, opening_time, closing_time, minimum_reservation_minutes, hold_minutes, cancellation_policy, non_working_days, fields(name, location, hourly_rate)")
      .eq("field_id", DEFAULT_SETTINGS.fieldId)
      .single();
    if (error) throw error;
    const rawField = data.fields as unknown;
    const field = (Array.isArray(rawField) ? rawField[0] : rawField) as { name?: string; location?: string; hourly_rate?: number } | null;
    return {
      fieldId: data.field_id,
      fieldName: field?.name ?? DEFAULT_SETTINGS.fieldName,
      location: field?.location ?? DEFAULT_SETTINGS.location,
      whatsappPhone: data.whatsapp_phone,
      sinpePhone: data.sinpe_phone,
      hourlyRate: Number(field?.hourly_rate ?? DEFAULT_SETTINGS.hourlyRate),
      openingTime: data.opening_time.slice(0, 5),
      closingTime: data.closing_time.slice(0, 5),
      minimumMinutes: data.minimum_reservation_minutes,
      holdMinutes: data.hold_minutes,
      cancellationPolicy: data.cancellation_policy,
      nonWorkingDays: Array.isArray(data.non_working_days) ? data.non_working_days : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
