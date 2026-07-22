import "server-only";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Business, Court } from "@/lib/types";

export const demoBusiness: Business = {
  id: DEFAULT_SETTINGS.businessId,
  name: DEFAULT_SETTINGS.businessName,
  slug: DEFAULT_SETTINGS.businessSlug,
  description: DEFAULT_SETTINGS.description,
  phone: "2222-4400",
  whatsappPhone: DEFAULT_SETTINGS.whatsappPhone,
  email: DEFAULT_SETTINGS.email,
  location: DEFAULT_SETTINGS.location,
  currency: DEFAULT_SETTINGS.currency,
  timezone: DEFAULT_SETTINGS.timezone,
  primaryColor: DEFAULT_SETTINGS.primaryColor,
  subscriptionStatus: "trial",
  planName: "Pro",
};

export const demoCourts: Court[] = [
  {
    id: DEFAULT_SETTINGS.fieldId,
    businessId: DEFAULT_SETTINGS.businessId,
    name: "Cancha Norte",
    slug: "cancha-norte",
    sport: "Fútbol 5",
    description: "Césped sintético, iluminación LED y espacio techado para equipos.",
    hourlyRate: 18000,
    reservationMinutes: 60,
    capacity: 12,
    active: true,
    rules: ["Utilizar calzado apropiado", "Llegar 10 minutos antes", "Respetar el horario reservado"],
    amenities: ["Iluminación LED", "Parqueo", "Camerinos"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    businessId: DEFAULT_SETTINGS.businessId,
    name: "Cancha Pádel 1",
    slug: "padel-1",
    sport: "Pádel",
    description: "Cancha panorámica con iluminación y alquiler opcional de palas.",
    hourlyRate: 22000,
    reservationMinutes: 90,
    capacity: 4,
    active: true,
    rules: ["No ingresar alimentos", "Usar calzado deportivo"],
    amenities: ["Iluminación", "Alquiler de equipo", "Duchas"],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    businessId: DEFAULT_SETTINGS.businessId,
    name: "Cancha Sur",
    slug: "cancha-sur",
    sport: "Fútbol 7",
    description: "Cancha amplia para partidos, ligas y entrenamientos privados.",
    hourlyRate: 28000,
    reservationMinutes: 60,
    capacity: 16,
    active: false,
    rules: ["Utilizar calzado apropiado", "No fumar dentro de la cancha"],
    amenities: ["Gradería", "Parqueo", "Marcador"],
  },
];

export async function getBusinessBySlug(slug: string): Promise<{ business: Business; courts: Court[] } | null> {
  if (!hasSupabaseEnv()) {
    return slug === demoBusiness.slug ? { business: demoBusiness, courts: demoCourts.filter((court) => court.active) } : null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, name, slug, description, phone, whatsapp_phone, email, location, currency, timezone, logo_url, primary_color, subscription_status")
      .eq("slug", slug)
      .eq("active", true)
      .single();
    if (error || !business) return null;
    const { data: courts } = await supabase
      .from("fields")
      .select("id, business_id, name, slug, sport, description, hourly_rate, reservation_minutes, capacity, active, rules, amenities, image_url")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("name");
    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description ?? "",
        phone: business.phone ?? "",
        whatsappPhone: business.whatsapp_phone ?? "",
        email: business.email ?? "",
        location: business.location,
        currency: business.currency,
        timezone: business.timezone,
        logoUrl: business.logo_url ?? undefined,
        primaryColor: business.primary_color,
        subscriptionStatus: business.subscription_status,
        planName: "Pro",
      },
      courts: (courts ?? []).map((court) => ({
        id: court.id,
        businessId: court.business_id,
        name: court.name,
        slug: court.slug,
        sport: court.sport ?? "Deporte",
        description: court.description ?? "",
        hourlyRate: Number(court.hourly_rate),
        reservationMinutes: court.reservation_minutes ?? 60,
        capacity: court.capacity ?? 1,
        active: court.active,
        rules: Array.isArray(court.rules) ? court.rules : [],
        amenities: Array.isArray(court.amenities) ? court.amenities : [],
        imageUrl: court.image_url ?? undefined,
      })),
    };
  } catch {
    return null;
  }
}
