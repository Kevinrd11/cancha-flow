import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { requireBusinessPermission } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/env";
import type { BusinessCourtOption, BusinessSettings, Court } from "@/lib/types";

/**
 * Configuración del negocio y de una de sus canchas. Sin `fieldId` devuelve la
 * primera, que es el comportamiento histórico de cuando solo había una.
 */
export async function getBusinessSettings(fieldId?: string): Promise<BusinessSettings> {
  if (isDemoMode()) return DEFAULT_SETTINGS;
  const auth = await requireBusinessPermission("business:read");
  if (!auth) throw new Error("No se pudo identificar el negocio de la sesión");
  if (auth.demo) return DEFAULT_SETTINGS;
  const { data: business } = await auth.supabase
    .from("businesses")
    .select("id, name, slug, description, email, location, currency, timezone, primary_color, whatsapp_phone")
    .eq("id", auth.businessId)
    .single();
  const courtQuery = auth.supabase
    .from("fields")
    .select("id, name, sport, hourly_rate")
    .eq("business_id", auth.businessId);
  const { data: court } = fieldId
    ? await courtQuery.eq("id", fieldId).single()
    : await courtQuery.order("created_at").limit(1).single();
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

/**
 * Moneda y zona horaria del negocio. Existe aparte de getBusinessSettings
 * porque las rutas de finanzas solo necesitan esto y no las tres consultas
 * completas de configuración.
 */
export async function getBusinessLocale(): Promise<{ currency: string; timezone: string }> {
  const fallback = { currency: DEFAULT_SETTINGS.currency, timezone: DEFAULT_SETTINGS.timezone };
  if (isDemoMode()) return fallback;
  try {
    const auth = await requireBusinessPermission("business:read");
    if (!auth) return fallback;
    if (auth.demo) return fallback;
    const { data } = await auth.supabase.from("businesses").select("currency, timezone").eq("id", auth.businessId).single();
    return { currency: data?.currency ?? fallback.currency, timezone: data?.timezone ?? fallback.timezone };
  } catch {
    return fallback;
  }
}

/**
 * Todas las canchas del negocio con lo que necesitan los selectores del panel:
 * además del nombre, el precio y el horario, porque el calendario y el resumen
 * arman totales y disponibilidad por cancha sin volver a consultar. La ficha
 * completa la sigue dando getAdminCourt.
 */
export async function getBusinessCourts(): Promise<BusinessCourtOption[]> {
  if (isDemoMode()) return [demoCourtOption()];
  const auth = await requireBusinessPermission("business:read");
  if (!auth) throw new Error("No se pudo identificar el negocio de la sesión");
  if (auth.demo) return [demoCourtOption()];
  const [{ data: courts }, { data: settings }] = await Promise.all([
    auth.supabase
      .from("fields")
      .select("id, name, slug, active, hourly_rate")
      .eq("business_id", auth.businessId)
      .order("created_at"),
    auth.supabase
      .from("business_settings")
      .select("field_id, opening_time, closing_time, minimum_reservation_minutes")
      .eq("business_id", auth.businessId),
  ]);
  const scheduleByField = new Map((settings ?? []).map((row) => [row.field_id, row]));
  return (courts ?? []).map((court) => {
    // Una cancha recién creada siempre trae su fila de business_settings (el RPC
    // create_business_court inserta las dos juntas); el respaldo cubre datos
    // heredados de antes de esa función.
    const schedule = scheduleByField.get(court.id);
    return {
      id: court.id,
      name: court.name,
      slug: court.slug,
      active: court.active,
      hourlyRate: Number(court.hourly_rate),
      openingTime: (schedule?.opening_time ?? DEFAULT_SETTINGS.openingTime).slice(0, 5),
      closingTime: (schedule?.closing_time ?? DEFAULT_SETTINGS.closingTime).slice(0, 5),
      minimumMinutes: schedule?.minimum_reservation_minutes ?? DEFAULT_SETTINGS.minimumMinutes,
    };
  });
}

function demoCourtOption(): BusinessCourtOption {
  return {
    id: DEFAULT_SETTINGS.fieldId,
    name: DEFAULT_SETTINGS.fieldName,
    slug: "principal",
    active: true,
    hourlyRate: DEFAULT_SETTINGS.hourlyRate,
    openingTime: DEFAULT_SETTINGS.openingTime,
    closingTime: DEFAULT_SETTINGS.closingTime,
    minimumMinutes: DEFAULT_SETTINGS.minimumMinutes,
  };
}

/** Ficha de una cancha del negocio. Sin `fieldId` devuelve la primera. */
export async function getAdminCourt(fieldId?: string): Promise<Court> {
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
  const courtQuery = auth.supabase
    .from("fields")
    .select("id, business_id, name, slug, sport, description, hourly_rate, reservation_minutes, capacity, active, rules, amenities, image_url")
    .eq("business_id", auth.businessId);
  const { data: court, error } = fieldId
    ? await courtQuery.eq("id", fieldId).single()
    : await courtQuery.order("created_at").limit(1).single();
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
