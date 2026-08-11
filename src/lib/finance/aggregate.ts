import { addDays, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, endOfMonth, endOfYear, format, getISODay, isSameDay, parseISO, startOfMonth, startOfYear, subMonths, subYears } from "date-fns";
import type { FinanceOverview, FinanceTransaction, PeriodRange } from "@/lib/finance/types";

// Espejo en TypeScript de public.get_finance_overview. En producción manda la
// base de datos: esta versión existe para el modo demo (que no tiene Supabase) y
// para poder probar las fórmulas sin levantar Postgres.
//
//   cobrado       = Σ amountPaid              (ingresos pagados o parciales)
//   pendiente     = Σ (amount - amountPaid)   (ingresos pendientes o parciales)
//   gastos        = Σ amountPaid              (gastos pagados o parciales)
//   ganancia neta = cobrado - gastos          (lo pendiente nunca entra aquí)

const anchor = (date: string) => parseISO(`${date}T12:00:00`);
const iso = (date: Date) => format(date, "yyyy-MM-dd");
const round = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => round(values.reduce((total, value) => total + value, 0));

const collectedOf = (items: FinanceTransaction[], type: "income" | "expense") =>
  sum(items.filter((item) => item.type === type && ["paid", "partial"].includes(item.paymentStatus)).map((item) => item.amountPaid));

const pendingOf = (items: FinanceTransaction[]) =>
  sum(items.filter((item) => item.type === "income" && ["pending", "partial"].includes(item.paymentStatus)).map((item) => item.amount - item.amountPaid));

function totalsOf(items: FinanceTransaction[]) {
  const collected = collectedOf(items, "income");
  const expenses = collectedOf(items, "expense");
  const reservations = items.filter((item) => item.source === "reservation");
  const billed = reservations.filter((item) => ["paid", "partial"].includes(item.paymentStatus));
  return {
    collected,
    pending: pendingOf(items),
    expenses,
    net: round(collected - expenses),
    refunded: sum(items.filter((item) => item.type === "income" && item.paymentStatus === "refunded").map((item) => item.amount)),
    paidReservations: reservations.filter((item) => item.paymentStatus === "paid").length,
    averageTicket: billed.length ? round(sum(billed.map((item) => item.amountPaid)) / billed.length) : 0,
  };
}

function bucketsBetween(from: string, to: string, granularity: "day" | "month") {
  const interval = { start: anchor(from), end: anchor(to) };
  if (anchor(to) < anchor(from)) return [];
  const dates = granularity === "month" ? eachMonthOfInterval({ start: startOfMonth(anchor(from)), end: anchor(to) }) : eachDayOfInterval(interval);
  return dates.map(iso);
}

const bucketOf = (date: string, granularity: "day" | "month") => (granularity === "month" ? `${date.slice(0, 7)}-01` : date);

/**
 * Un mes calendario se compara con el mes anterior y un año con el año anterior;
 * cualquier otro rango, con la ventana inmediatamente anterior del mismo largo.
 * Sin esto, "este mes" (31 días) se compararía contra el 29 de enero.
 */
export function previousRange(from: string, to: string) {
  const start = anchor(from);
  const end = anchor(to);
  if (isSameDay(start, startOfMonth(start)) && isSameDay(end, endOfMonth(start))) {
    const previous = subMonths(start, 1);
    return { from: iso(startOfMonth(previous)), to: iso(endOfMonth(previous)) };
  }
  if (isSameDay(start, startOfYear(start)) && isSameDay(end, endOfYear(start))) {
    const previous = subYears(start, 1);
    return { from: iso(startOfYear(previous)), to: iso(endOfYear(previous)) };
  }
  const span = differenceInCalendarDays(end, start) + 1;
  return { from: iso(addDays(start, -span)), to: iso(addDays(start, -1)) };
}

export function buildOverview(transactions: FinanceTransaction[], range: PeriodRange): FinanceOverview {
  const span = differenceInCalendarDays(anchor(range.to), anchor(range.from)) + 1;
  const { from: previousFrom, to: previousTo } = previousRange(range.from, range.to);
  const granularity: "day" | "month" = span > 92 ? "month" : "day";

  const inRange = (from: string, to: string) => transactions.filter((item) => item.date >= from && item.date <= to);
  const current = inRange(range.from, range.to);
  const previous = inRange(previousFrom, previousTo);

  const series = bucketsBetween(range.from, range.to, granularity).map((bucket) => {
    const items = current.filter((item) => bucketOf(item.date, granularity) === bucket);
    return { bucket, collected: collectedOf(items, "income"), expenses: collectedOf(items, "expense") };
  });
  const previousSeries = bucketsBetween(previousFrom, previousTo, granularity).map((bucket) => ({
    bucket,
    collected: collectedOf(previous.filter((item) => bucketOf(item.date, granularity) === bucket), "income"),
  }));

  // El promedio divide entre las veces que ese día cae en el periodo, no entre
  // los días que tuvieron movimientos.
  const calendar = bucketsBetween(range.from, range.to, "day").map((date) => getISODay(anchor(date)));
  const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const collected = collectedOf(current.filter((item) => getISODay(anchor(item.date)) === weekday), "income");
    const occurrences = calendar.filter((day) => day === weekday).length;
    return { weekday, collected, average: occurrences ? round(collected / occurrences) : 0, occurrences };
  });

  const income = current.filter((item) => item.type === "income");
  const byCourt = groupBy(income, (item) => item.courtName ?? "Movimientos manuales").map(([name, items]) => ({
    name,
    collected: collectedOf(items, "income"),
    pending: pendingOf(items),
  })).sort((a, b) => b.collected - a.collected);

  const byMethod = groupBy(income, (item) => item.paymentMethod ?? "other").map(([method, items]) => ({
    method,
    collected: collectedOf(items, "income"),
  })).sort((a, b) => b.collected - a.collected);

  const previousTotals = totalsOf(previous);
  return {
    from: range.from,
    to: range.to,
    previousFrom,
    previousTo,
    granularity,
    totals: totalsOf(current),
    previous: {
      collected: previousTotals.collected,
      pending: previousTotals.pending,
      expenses: previousTotals.expenses,
      net: previousTotals.net,
      paidReservations: previousTotals.paidReservations,
    },
    series,
    previousSeries,
    byWeekday,
    byCourt,
    byMethod,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const value = key(item);
    groups.set(value, [...(groups.get(value) ?? []), item]);
  });
  return [...groups.entries()];
}

export const emptyOverview = (range: PeriodRange): FinanceOverview => buildOverview([], range);
