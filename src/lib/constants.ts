import type { BusinessSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: BusinessSettings = {
  fieldId: "00000000-0000-4000-8000-000000000001",
  fieldName: "La Doce",
  location: "San Rafael, Alajuela · 200 m norte de la iglesia",
  whatsappPhone: "50688881212",
  sinpePhone: "8888-1212",
  hourlyRate: 18000,
  openingTime: "08:00",
  closingTime: "23:00",
  minimumMinutes: 60,
  holdMinutes: 20,
  cancellationPolicy:
    "Puedes reprogramar sin costo con al menos 24 horas de anticipación.",
  nonWorkingDays: [],
};

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
  approved: "Pagado",
  rejected: "Rechazado",
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
};
