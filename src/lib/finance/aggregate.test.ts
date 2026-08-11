import { describe, expect, it } from "vitest";
import { buildOverview } from "@/lib/finance/aggregate";
import type { FinanceTransaction, PeriodRange } from "@/lib/finance/types";

// Marzo de 2026: del domingo 1 al martes 31.
const march: PeriodRange = { period: "month", from: "2026-03-01", to: "2026-03-31" };

const tx = (overrides: Partial<FinanceTransaction> & { date: string }): FinanceTransaction => ({
  id: overrides.date + (overrides.description ?? ""),
  type: "income",
  source: "reservation",
  category: "court_reservation",
  description: "",
  amount: 0,
  amountPaid: 0,
  paymentStatus: "paid",
  ...overrides,
});

describe("buildOverview", () => {
  const transactions = [
    tx({ date: "2026-03-02", amount: 18000, amountPaid: 18000, paymentStatus: "paid", courtName: "Cancha 1", paymentMethod: "sinpe" }),
    tx({ date: "2026-03-02", amount: 18000, amountPaid: 6000, paymentStatus: "partial", courtName: "Cancha 1", paymentMethod: "cash" }),
    tx({ date: "2026-03-03", amount: 18000, amountPaid: 0, paymentStatus: "pending", courtName: "Cancha 1" }),
    tx({ date: "2026-03-04", amount: 18000, amountPaid: 0, paymentStatus: "cancelled", courtName: "Cancha 1" }),
    tx({ date: "2026-03-05", amount: 18000, amountPaid: 0, paymentStatus: "refunded", courtName: "Cancha 1" }),
    tx({ date: "2026-03-06", type: "expense", source: "manual", category: "utilities", amount: 20000, amountPaid: 20000, paymentStatus: "paid", paymentMethod: "transfer" }),
    // Fuera del periodo: alimenta la comparación, no los totales.
    tx({ date: "2026-02-10", amount: 10000, amountPaid: 10000, paymentStatus: "paid" }),
  ];
  const overview = buildOverview(transactions, march);

  it("solo cuenta como cobrado el dinero efectivamente recibido", () => {
    expect(overview.totals.collected).toBe(24000);
  });

  it("suma el saldo pendiente de lo pendiente y de lo parcial, sin mezclarlo con lo cobrado", () => {
    expect(overview.totals.pending).toBe(30000);
  });

  it("resta los gastos para la ganancia neta y nunca suma lo pendiente", () => {
    expect(overview.totals.expenses).toBe(20000);
    expect(overview.totals.net).toBe(4000);
  });

  it("informa los reembolsos aparte", () => {
    expect(overview.totals.refunded).toBe(18000);
  });

  it("cuenta las reservas pagadas por completo y promedia las que tuvieron algún cobro", () => {
    expect(overview.totals.paidReservations).toBe(1);
    expect(overview.totals.averageTicket).toBe(12000);
  });

  it("compara un mes calendario contra el mes anterior completo", () => {
    expect(overview.previousFrom).toBe("2026-02-01");
    expect(overview.previousTo).toBe("2026-02-28");
    expect(overview.previous.collected).toBe(10000);
  });

  it("compara un rango suelto contra la ventana anterior del mismo largo", () => {
    const week = buildOverview(transactions, { period: "week", from: "2026-03-09", to: "2026-03-15" });
    expect(week).toMatchObject({ previousFrom: "2026-03-02", previousTo: "2026-03-08" });
    expect(week.previous.collected).toBe(24000);
  });

  it("compara un año calendario contra el año anterior", () => {
    const year = buildOverview(transactions, { period: "year", from: "2026-01-01", to: "2026-12-31" });
    expect(year).toMatchObject({ previousFrom: "2025-01-01", previousTo: "2025-12-31" });
  });

  it("agrupa por día e incluye los días sin movimientos", () => {
    expect(overview.granularity).toBe("day");
    expect(overview.series).toHaveLength(31);
    expect(overview.series.find((point) => point.bucket === "2026-03-02")?.collected).toBe(24000);
    expect(overview.series.find((point) => point.bucket === "2026-03-10")?.collected).toBe(0);
  });

  it("promedia cada día de la semana entre las veces que cae en el periodo", () => {
    // El 2 de marzo de 2026 es lunes y marzo tiene cinco lunes.
    const monday = overview.byWeekday.find((item) => item.weekday === 1);
    expect(monday).toMatchObject({ collected: 24000, occurrences: 5, average: 4800 });
    expect(overview.byWeekday).toHaveLength(7);
  });

  it("separa los ingresos por cancha y por método de pago", () => {
    expect(overview.byCourt).toContainEqual({ name: "Cancha 1", collected: 24000, pending: 30000 });
    expect(overview.byMethod.find((item) => item.method === "sinpe")?.collected).toBe(18000);
  });

  it("cambia a meses cuando el periodo supera un trimestre", () => {
    const year = buildOverview(transactions, { period: "year", from: "2026-01-01", to: "2026-12-31" });
    expect(year.granularity).toBe("month");
    expect(year.series).toHaveLength(12);
    expect(year.series[2]).toMatchObject({ bucket: "2026-03-01", collected: 24000 });
  });

  it("devuelve ceros y las siete barras cuando no hay movimientos", () => {
    const empty = buildOverview([], march);
    expect(empty.totals).toMatchObject({ collected: 0, pending: 0, expenses: 0, net: 0, averageTicket: 0 });
    expect(empty.byWeekday).toHaveLength(7);
  });
});
