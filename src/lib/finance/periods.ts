import { endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfMonth, startOfWeek, startOfYear, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { todayInTimezone } from "@/lib/utils";
import type { FinancePeriod, PeriodRange } from "@/lib/finance/types";
import { financePeriods } from "@/lib/finance/types";

// Todas las fechas viajan como "YYYY-MM-DD". Se anclan al mediodía antes de
// convertirlas a Date para que ningún cambio de huso las mueva de día, que es la
// misma convención que usa el resto del proyecto.
const anchor = (date: string) => parseISO(`${date}T12:00:00`);
const iso = (date: Date) => format(date, "yyyy-MM-dd");

export function isFinancePeriod(value: unknown): value is FinancePeriod {
  return typeof value === "string" && (financePeriods as readonly string[]).includes(value);
}

/**
 * Convierte un preset en el rango de fechas que consultan las tarjetas, las
 * gráficas y la exportación. Es la única fuente del rango: si las tres piden lo
 * mismo, no pueden dar números distintos.
 *
 * Los periodos abarcan el calendario completo (el mes entero, no hasta hoy) para
 * que las reservas ya agendadas aparezcan como cuentas por cobrar.
 */
export function resolvePeriod(period: FinancePeriod, timezone = DEFAULT_SETTINGS.timezone): PeriodRange {
  const today = anchor(todayInTimezone(timezone || DEFAULT_SETTINGS.timezone));
  if (period === "today") return { period, from: iso(today), to: iso(today) };
  if (period === "week") return { period, from: iso(startOfWeek(today, { weekStartsOn: 1 })), to: iso(endOfWeek(today, { weekStartsOn: 1 })) };
  if (period === "previous_month") {
    const previous = subMonths(today, 1);
    return { period, from: iso(startOfMonth(previous)), to: iso(endOfMonth(previous)) };
  }
  if (period === "year") return { period, from: iso(startOfYear(today)), to: iso(endOfYear(today)) };
  return { period, from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) };
}

/** Etiqueta corta para el eje de las gráficas. */
export function formatBucket(bucket: string, granularity: "day" | "month") {
  return format(anchor(bucket), granularity === "month" ? "LLL yy" : "d MMM", { locale: es });
}

/** Variación relativa contra el periodo anterior. `null` cuando no hay base de comparación. */
export function variation(current: number, previous: number) {
  if (!previous) return current ? null : 0;
  return (current - previous) / previous;
}
