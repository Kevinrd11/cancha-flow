import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { getBusinessBySlug } from "@/lib/platform-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/types";

export async function getBusinessSettings(slug = DEFAULT_SETTINGS.businessSlug): Promise<BusinessSettings> {
  if (!hasSupabaseEnv()) return DEFAULT_SETTINGS;
  try {
    const result = await getBusinessBySlug(slug);
    const court = result?.courts[0];
    if (!result || !court) return DEFAULT_SETTINGS;
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("field_id, whatsapp_phone, sinpe_phone, opening_time, closing_time, minimum_reservation_minutes, hold_minutes, cancellation_policy, non_working_days")
      .eq("business_id", result.business.id)
      .eq("field_id", court.id)
      .single();
    if (error || !data) throw error;
    return {
      businessId: result.business.id,
      businessName: result.business.name,
      businessSlug: result.business.slug,
      fieldId: court.id,
      fieldName: court.name,
      sport: court.sport,
      description: result.business.description,
      location: result.business.location,
      email: result.business.email,
      whatsappPhone: result.business.whatsappPhone || data.whatsapp_phone,
      sinpePhone: data.sinpe_phone,
      currency: result.business.currency,
      timezone: result.business.timezone,
      primaryColor: result.business.primaryColor,
      hourlyRate: court.hourlyRate,
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
