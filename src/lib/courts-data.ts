import type { BusinessSettings } from "@/lib/types";

export type CourtSurface = "Sintética" | "Natural" | "Por definir";
export type CourtModality = "Fútbol 5" | "Fútbol 7" | "Fútbol 9";

export type CourtListing = {
  id: string;
  businessId: string;
  slug: string;
  name: string;
  sector: string;
  address: string;
  description: string;
  surface: CourtSurface;
  modality: CourtModality;
  recommendedPlayers: number;
  hourlyRate: number;
  reservationMinutes: number;
  openingTime: string;
  closingTime: string;
  services: string[];
  rules: string[];
  images: string[];
  phone: string;
  whatsappPhone: string;
  mapUrl: string;
  featured: boolean;
  active: boolean;
  nextAvailable: string;
  paymentInstructions: string;
  publicPath?: string;
};

// Catálogo de demostración para desarrollo local sin credenciales de Supabase.
// Sus ids no existen en la base de datos, así que nunca debe publicarse junto a
// las canchas reales: la consulta de disponibilidad devolvería cero horarios.
export const demoCourts: CourtListing[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    businessId: "00000000-0000-4000-8000-000000000010",
    slug: "arena-ciudad-quesada",
    name: "Arena Ciudad Quesada",
    sector: "Centro de Ciudad Quesada",
    address: "Barrio El Carmen, Ciudad Quesada, San Carlos",
    description: "Cancha sintética techada, cómoda para mejengas de fútbol 5 y partidos después del trabajo.",
    surface: "Sintética",
    modality: "Fútbol 5",
    recommendedPlayers: 12,
    hourlyRate: 18000,
    reservationMinutes: 60,
    openingTime: "08:00",
    closingTime: "23:00",
    services: ["Parqueo", "Duchas", "Vestidores", "Iluminación", "Balones", "Petos"],
    rules: ["Usar calzado para cancha sintética", "Llegar 10 minutos antes", "No ingresar bebidas alcohólicas al terreno de juego"],
    images: [
      "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/1378425/pexels-photo-1378425.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ],
    phone: "2460-1842",
    whatsappPhone: "50688881212",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Ciudad+Quesada+San+Carlos+Costa+Rica",
    featured: true,
    active: true,
    nextAvailable: "Hoy · 6:00 p. m.",
    paymentInstructions: "La cancha confirmará la solicitud por WhatsApp. El pago se coordina directamente con el propietario.",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    businessId: "00000000-0000-4000-8000-000000000020",
    slug: "la-cantera-san-roque",
    name: "La Cantera San Roque",
    sector: "San Roque",
    address: "200 m norte de la plaza de San Roque, San Carlos",
    description: "Espacio abierto con césped sintético e iluminación, ideal para grupos grandes y fútbol 7.",
    surface: "Sintética",
    modality: "Fútbol 7",
    recommendedPlayers: 16,
    hourlyRate: 24000,
    reservationMinutes: 60,
    openingTime: "09:00",
    closingTime: "22:00",
    services: ["Parqueo", "Iluminación", "Soda", "Gradería", "Petos"],
    rules: ["No fumar dentro de la cancha", "Respetar el horario reservado", "Los menores deben ingresar acompañados"],
    images: [
      "https://images.pexels.com/photos/3158350/pexels-photo-3158350.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/3459630/pexels-photo-3459630.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/3131406/pexels-photo-3131406.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ],
    phone: "2475-2019",
    whatsappPhone: "50687014432",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=San+Roque+San+Carlos+Costa+Rica",
    featured: true,
    active: true,
    nextAvailable: "Hoy · 7:00 p. m.",
    paymentInstructions: "La solicitud queda pendiente hasta que el propietario la confirme por teléfono o WhatsApp.",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    businessId: "00000000-0000-4000-8000-000000000030",
    slug: "futbol-center-florencia",
    name: "Fútbol Center Florencia",
    sector: "Florencia",
    address: "Costado este del parque de Florencia, San Carlos",
    description: "Cancha compacta de fútbol 5 con buena iluminación, vestidores y una soda para quedarse después del partido.",
    surface: "Sintética",
    modality: "Fútbol 5",
    recommendedPlayers: 10,
    hourlyRate: 16000,
    reservationMinutes: 60,
    openingTime: "10:00",
    closingTime: "22:00",
    services: ["Vestidores", "Iluminación", "Soda", "Balones"],
    rules: ["Utilizar tenis o tacos de suela corta", "No se permite vidrio", "Entregar la cancha al finalizar la hora"],
    images: [
      "https://images.pexels.com/photos/1378425/pexels-photo-1378425.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ],
    phone: "2472-6180",
    whatsappPhone: "50684201177",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Florencia+San+Carlos+Costa+Rica",
    featured: false,
    active: true,
    nextAvailable: "Mañana · 5:00 p. m.",
    paymentInstructions: "Puede pagar en efectivo al llegar. El propietario confirmará la solicitud antes del partido.",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    businessId: "00000000-0000-4000-8000-000000000040",
    slug: "el-potrero-la-palmera",
    name: "El Potrero La Palmera",
    sector: "La Palmera",
    address: "Ruta a La Palmera, 500 m oeste de la escuela",
    description: "Cancha de césped natural para fútbol 9, rodeada de verde y pensada para partidos de fin de semana.",
    surface: "Natural",
    modality: "Fútbol 9",
    recommendedPlayers: 20,
    hourlyRate: 28000,
    reservationMinutes: 60,
    openingTime: "08:00",
    closingTime: "20:00",
    services: ["Parqueo", "Duchas", "Gradería", "Balones"],
    rules: ["Confirmar el estado de la cancha en días de lluvia", "No dejar residuos", "Se permiten tacos de fútbol"],
    images: [
      "https://images.pexels.com/photos/3459630/pexels-photo-3459630.jpeg?auto=compress&cs=tinysrgb&w=1600",
      "https://images.pexels.com/photos/3131406/pexels-photo-3131406.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ],
    phone: "2465-7711",
    whatsappPhone: "50661129090",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=La+Palmera+San+Carlos+Costa+Rica",
    featured: false,
    active: true,
    nextAvailable: "Sábado · 2:00 p. m.",
    paymentInstructions: "La reserva se confirma por WhatsApp. En temporada lluviosa se revisa el estado del terreno el mismo día.",
  },
];

export function getCourtBySlug(slug: string) {
  return demoCourts.find((court) => court.slug === slug && court.active) ?? null;
}

export function getCourtById(id: string) {
  return demoCourts.find((court) => court.id === id && court.active) ?? null;
}

export function courtToSettings(court: CourtListing): BusinessSettings {
  return {
    businessId: court.businessId,
    businessName: court.name,
    businessSlug: court.slug,
    fieldId: court.id,
    fieldName: court.name,
    sport: court.modality,
    description: court.description,
    location: court.address,
    email: "reservas@canchaflow.cr",
    whatsappPhone: court.whatsappPhone,
    sinpePhone: "",
    currency: "CRC",
    timezone: "America/Costa_Rica",
    primaryColor: "#126b45",
    hourlyRate: court.hourlyRate,
    openingTime: court.openingTime,
    closingTime: court.closingTime,
    minimumMinutes: court.reservationMinutes,
    holdMinutes: 20,
    cancellationPolicy: "Puede cancelar o reprogramar contactando directamente a la cancha con al menos 24 horas de anticipación.",
    nonWorkingDays: [],
  };
}
