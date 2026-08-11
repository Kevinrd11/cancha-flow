import type { PaymentMethod } from "@/lib/types";
import type { FinancePeriod, FinanceStatus, FinanceType } from "@/lib/finance/types";

export const FINANCE_PAGE_SIZE = 25;

export const PERIOD_LABELS: Record<FinancePeriod, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  previous_month: "Mes anterior",
  year: "Este año",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  sinpe: "SINPE Móvil",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export const FINANCE_TYPE_LABELS: Record<FinanceType, string> = { income: "Ingreso", expense: "Gasto" };

export const FINANCE_STATUS_LABELS: Record<FinanceStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  partial: "Parcial",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

export const FINANCE_STATUS_STYLES: Record<FinanceStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-sky-100 text-sky-800",
  refunded: "bg-violet-100 text-violet-800",
  cancelled: "bg-stone-100 text-stone-600",
};

/** La categoría de los ingresos automáticos. La base de datos escribe este mismo valor. */
export const RESERVATION_CATEGORY = "court_reservation";

export const INCOME_CATEGORIES = [
  { value: RESERVATION_CATEGORY, label: "Reserva de cancha" },
  { value: "product_sale", label: "Venta de productos" },
  { value: "equipment_rental", label: "Alquiler de equipo" },
  { value: "other_income", label: "Otro ingreso" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "maintenance", label: "Mantenimiento" },
  { value: "utilities", label: "Servicios (agua, luz, internet)" },
  { value: "payroll", label: "Salarios" },
  { value: "supplies", label: "Insumos" },
  { value: "rent", label: "Alquiler" },
  { value: "marketing", label: "Publicidad" },
  { value: "other_expense", label: "Otro gasto" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(({ value, label }) => [value, label]),
);

export function categoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value;
}

export function methodLabel(value?: string | null) {
  return value ? (PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value) : "Sin registrar";
}

/** 1 = lunes … 7 = domingo, igual que `extract(isodow …)` en Postgres. */
export const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
