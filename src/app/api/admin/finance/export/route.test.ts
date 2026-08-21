import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: { businessId: "20000000-0000-4000-8000-000000000001" } as Record<string, unknown> | null,
  overview: {
    totals: {
      collected: 54000, pending: 18000, expenses: 12000, net: 42000,
      refunded: 0, paidReservations: 3, averageTicket: 18000,
    },
  },
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/admin-auth", () => ({ requireFinance: async () => state.auth }));
vi.mock("@/lib/business-data", () => ({ getBusinessLocale: async () => ({ timezone: "America/Costa_Rica" }) }));
vi.mock("@/lib/finance-data", () => ({
  getFinanceOverview: async () => state.overview,
  getFinanceExportRows: async () => state.rows,
}));

import { GET } from "@/app/api/admin/finance/export/route";

function get(search = "?period=month") {
  const url = new URL(`http://localhost/api/admin/finance/export${search}`);
  // El handler usa NextRequest.nextUrl.searchParams.
  return GET({ nextUrl: url } as never);
}

describe("GET /api/admin/finance/export", () => {
  beforeEach(() => {
    state.auth = { businessId: "20000000-0000-4000-8000-000000000001" };
    state.rows = [];
  });

  it("responde 401 sin permiso de finanzas", async () => {
    state.auth = null;
    expect((await get()).status).toBe(401);
  });

  it("entrega un CSV descargable y sin caché", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/csv/);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="finanzas-.*\.csv"$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("incluye el resumen antes de los movimientos", async () => {
    const body = await (await get()).text();
    expect(body).toMatch(/Resumen financiero/);
    expect(body.indexOf("Resumen financiero")).toBeLessThan(body.indexOf("Movimientos"));
    expect(body).toMatch(/Ingresos cobrados/);
  });

  it("calcula el pendiente de un cobro parcial como total menos cobrado", async () => {
    state.rows = [{
      date: "2026-08-10", type: "income", category: "court_reservation",
      description: "Reserva CF-ABCD1234", amount: 18000, amountPaid: 8000,
      paymentStatus: "partial", paymentMethod: "cash", source: "reservation",
      reservationCode: "CF-ABCD1234", courtName: "Cancha principal", customerName: "Ana Rojas",
    }];
    const line = (await (await get()).text()).split("\n").find((row) => row.includes("CF-ABCD1234"));
    expect(line).toBeDefined();
    expect(line).toMatch(/18000,8000,10000/);
  });

  it("no reporta pendiente en un gasto ya pagado", async () => {
    state.rows = [{
      date: "2026-08-10", type: "expense", category: "maintenance",
      description: "Corte de zacate", amount: 12000, amountPaid: 12000,
      paymentStatus: "paid", paymentMethod: "cash", source: "manual",
      reservationCode: null, courtName: null, customerName: null,
    }];
    const line = (await (await get()).text()).split("\n").find((row) => row.includes("Corte de zacate"));
    expect(line).toMatch(/12000,12000,0/);
  });
});
