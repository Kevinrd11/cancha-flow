import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { requireBusinessPermission } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/env";
import type { BusinessSettings, Court } from "@/lib/types";

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (isDemoMode()) return DEFAULT_SETTINGS;
  const auth = await requireBusinessPermission("business:read");
  if (!auth) throw new Error("No se pudo identificar el negocio de la sesión");
  if (auth.demo) return DEFAULT_SETTINGS;
  const { data: business } = await auth.supabase
    .from("businesses")
    .select("id, name, slug, description, email, location, currency, timezone, primary_color, whatsapp_phone")
    .eq("id", auth.businessId)
    .single();
  const { data: court } = await auth.supabase
    .from("fields")
    .select("id, name, sport, hourly_rate")
    .eq("business_id", auth.businessId)
    .order("created_at")
    .limit(1)
    .single();
  if (!business || !court) throw new Error("El negocio no tiene una cancha configurada");
  const { data: settings } = await auth.supabase
    .from("business_settings")
    .select("whatsapp_phone, sinpe_phone, opening_time, closing_time, minimum_reservation_minutes, hold_minutes, cancellation_policy, non_working_days")
    .eq("business_id", auth.businessId)
    .eq("field_id", court.id)
    .single();
  if (!settings) throw new Error("La cancha no tiene horarios configurados");
  return {
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    fieldId: court.id,
    fieldName: court.name,
    sport: court.sport,
    description: business.description ?? "",
    location: business.location,
    email: business.email ?? "",
    whatsappPhone: business.whatsapp_phone || settings.whatsapp_phone,
    sinpePhone: settings.sinpe_phone,
    currency: business.currency,
    timezone: business.timezone,
    primaryColor: business.primary_color,
    hourlyRate: Number(court.hourly_rate),
    openingTime: settings.opening_time.slice(0, 5),
    closingTime: settings.closing_time.slice(0, 5),
    minimumMinutes: settings.minimum_reservation_minutes,
    holdMinutes: settings.hold_minutes,
    cancellationPolicy: settings.cancellation_policy,
    nonWorkingDays: Array.isArray(settings.non_working_days) ? settings.non_working_days : [],
  };
}

export async function getAdminCourt(): Promise<Court> {
  if (isDemoMode()) {
    return {
      id: DEFAULT_SETTINGS.fieldId,
      businessId: DEFAULT_SETTINGS.businessId,
      name: DEFAULT_SETTINGS.fieldName,
      slug: "principal",
      sport: DEFAULT_SETTINGS.sport,
      description: DEFAULT_SETTINGS.description,
      hourlyRate: DEFAULT_SETTINGS.hourlyRate,
      reservationMinutes: DEFAULT_SETTINGS.minimumMinutes,
      capacity: 10,
      active: true,
      rules: [],
      amenities: [],
    };
  }

  const auth = await requireBusinessPermission("business:read");
  if (!auth || auth.demo) throw new Error("No se pudo identificar el negocio de la sesión");
  const { data: court, error } = await auth.supabase
    .from("fields")
    .select("id, business_id, name, slug, sport, description, hourly_rate, reservation_minutes, capacity, active, rules, amenities, image_url")
    .eq("business_id", auth.businessId)
    .order("created_at")
    .limit(1)
    .single();
  if (error || !court) throw new Error("El negocio no tiene una cancha configurada");
  return {
    id: court.id,
    businessId: court.business_id,
    name: court.name,
    slug: court.slug,
    sport: court.sport,
    description: court.description ?? "",
    hourlyRate: Number(court.hourly_rate),
    reservationMinutes: court.reservation_minutes,
    capacity: court.capacity ?? 1,
    active: court.active,
    rules: Array.isArray(court.rules) ? court.rules : [],
    amenities: Array.isArray(court.amenities) ? court.amenities : [],
    imageUrl: court.image_url ?? undefined,
  };
}
