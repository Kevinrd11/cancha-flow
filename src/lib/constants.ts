import type { BusinessSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessId: "00000000-0000-4000-8000-000000000010",
  businessName: "Arena Ciudad Quesada",
  businessSlug: "arena-ciudad-quesada",
  fieldId: "00000000-0000-4000-8000-000000000001",
  fieldName: "Arena Ciudad Quesada",
  sport: "Fútbol 5",
  description: "Cancha sintética techada para fútbol 5 en el centro de Ciudad Quesada.",
  location: "Barrio El Carmen, Ciudad Quesada, San Carlos",
  email: "reservas@canchaflow.cr",
  whatsappPhone: "50688881212",
  sinpePhone: "",
  currency: "CRC",
  timezone: "America/Costa_Rica",
  primaryColor: "#126B45",
  hourlyRate: 18000,
  openingTime: "08:00",
  closingTime: "23:00",
  minimumMinutes: 60,
  holdMinutes: 1440,
  cancellationPolicy:
    "Puedes reprogramar sin costo con al menos 24 horas de anticipación.",
  nonWorkingDays: [],
};

/**
 * La cancha se aparta de hora en hora (de 1 a 2, de 2 a 3, …): los horarios
 * siempre empiezan en punto y no existe la media hora.
 */
export const SLOT_INTERVAL_MINUTES = 60;

/** Duraciones que puede elegir el cliente: una o dos horas. */
export const RESERVATION_DURATION_OPTIONS = [60, 120] as const;

export const ACTIVE_RESERVATION_STATUSES = [
  "pending",
  "awaiting_payment",
  "awaiting_approval",
  "confirmed",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  awaiting_payment: "Esperando pago",
  awaiting_approval: "Por aprobar",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No se presentó",
  expired: "Vencida",
  unpaid: "Sin pagar",
  partial: "Pago parcial",
  approved: "Pagado",
  rejected: "Rechazado",
  refunded: "Reembolsado",
  trial: "Prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  suspended: "Suspendida",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-amber-100 text-amber-800",
  awaiting_approval: "bg-sky-100 text-sky-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  completed: "bg-slate-100 text-slate-700",
  no_show: "bg-violet-100 text-violet-800",
  expired: "bg-stone-100 text-stone-600",
  unpaid: "bg-stone-100 text-stone-600",
  partial: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  refunded: "bg-violet-100 text-violet-800",
  active: "bg-emerald-100 text-emerald-800",
  trial: "bg-sky-100 text-sky-800",
  past_due: "bg-amber-100 text-amber-800",
  suspended: "bg-rose-100 text-rose-800",
};
