import "server-only";
import { demoCourts, type CourtListing, type CourtModality } from "@/lib/courts-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PLACEHOLDER_IMAGE = "/court-placeholder.svg";

function relation<T>(value: unknown): T | null {
  return (Array.isArray(value) ? value[0] : value) as T | null;
}

function modality(value: string | null): CourtModality {
  return value === "Fútbol 7" || value === "Fútbol 9" ? value : "Fútbol 5";
}

export async function getPublicCourtListings(): Promise<CourtListing[]> {
  if (!hasSupabaseEnv()) return demoCourts;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("fields")
      .select("id, business_id, name, slug, sport, description, location, hourly_rate, reservation_minutes, capacity, rules, amenities, image_url, businesses!inner(name, slug, phone, whatsapp_phone, location, active, subscription_status), business_settings(opening_time, closing_time)")
      .eq("active", true)
      .eq("businesses.active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const demoIds = new Set(demoCourts.map((court) => court.id));
    const persisted = (data ?? []).flatMap((item): CourtListing[] => {
      if (demoIds.has(item.id)) return [];
      const business = relation<{ name: string; slug: string; phone: string | null; whatsapp_phone: string | null; location: string; active: boolean; subscription_status: string }>(item.businesses);
      const settings = relation<{ opening_time: string; closing_time: string }>(item.business_settings);
      if (!business || ["canceled", "suspended"].includes(business.subscription_status)) return [];
      const location = item.location || business.location;
      const image = item.image_url || PLACEHOLDER_IMAGE;
      return [{
        id: item.id,
        businessId: item.business_id,
        slug: item.slug,
        name: item.name,
        sector: business.location,
        address: location,
        description: item.description ?? "Cancha disponible para reservas.",
        surface: "Por definir",
        modality: modality(item.sport),
        recommendedPlayers: item.capacity ?? 1,
        hourlyRate: Number(item.hourly_rate),
        reservationMinutes: item.reservation_minutes ?? 60,
        openingTime: settings?.opening_time?.slice(0, 5) ?? "08:00",
        closingTime: settings?.closing_time?.slice(0, 5) ?? "22:00",
        services: Array.isArray(item.amenities) ? item.amenities : [],
        rules: Array.isArray(item.rules) ? item.rules : [],
        images: [image],
        phone: business.phone ?? "",
        whatsappPhone: business.whatsapp_phone ?? "",
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`,
        featured: false,
        active: true,
        nextAvailable: "Ver disponibilidad",
        paymentInstructions: "La cancha confirmará la solicitud y coordinará el pago directamente.",
        publicPath: `/centro/${business.slug}?court=${item.id}`,
      }];
    });
    return [...demoCourts, ...persisted];
  } catch {
    return demoCourts;
  }
}
