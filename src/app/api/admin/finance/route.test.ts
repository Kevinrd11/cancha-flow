import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: null as null | Record<string, unknown>,
  inserted: null as Record<string, unknown> | null,
  trusted: true,
}));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trusted }));
vi.mock("@/lib/auth/session", () => ({ requireBusinessPermission: async (permission: string) => (permission === "business:financials" ? state.auth : null) }));

import { POST } from "@/app/api/admin/finance/route";

const BUSINESS = "20000000-0000-4000-8000-000000000001";
const body = { type: "expense", category: "utilities", description: "Recibo de luz", amount: 42000, paymentMethod: "transfer", paymentStatus: "paid", date: "2026-03-05" };

function request(value: Record<string, unknown> = body) {
  return new Request("http://localhost/api/admin/finance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
}

describe("POST /api/admin/finance", () => {
  beforeEach(() => {
    state.inserted = null;
    state.trusted = true;
    const chain = {
      insert: (value: Record<string, unknown>) => { state.inserted = value; return chain; },
      select: () => chain,
      single: async () => ({ data: { id: "generated" }, error: null }),
    };
    state.auth = { demo: false, businessId: BUSINESS, user: { id: "user-1" }, supabase: { from: () => chain } };
  });

  it("rechaza al usuario sin el permiso financiero", async () => {
    state.auth = null;
    expect((await POST(request())).status).toBe(401);
  });

  it("rechaza la solicitud de un origen no confiable", async () => {
    state.trusted = false;
    expect((await POST(request())).status).toBe(403);
  });

  it("toma el negocio de la sesión e ignora el que venga en el cuerpo", async () => {
    const response = await POST(request({ ...body, businessId: "00000000-0000-4000-8000-000000000999" }));
    // El schema es .strict(): un campo de más es un rechazo, no un dato que se cuela.
    expect(response.status).toBe(400);
    expect(state.inserted).toBeNull();

    await POST(request());
    expect(state.inserted).toMatchObject({ business_id: BUSINESS, source: "manual", created_by: "user-1" });
  });

  it("no deja registrar a mano un ingreso de reserva", async () => {
    const response = await POST(request({ ...body, type: "income", category: "court_reservation" }));
    expect(response.status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it("rechaza montos que no sean mayores que cero", async () => {
    expect((await POST(request({ ...body, amount: 0 }))).status).toBe(400);
    expect((await POST(request({ ...body, amount: -100 }))).status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it("rechaza una fecha mal formada", async () => {
    expect((await POST(request({ ...body, date: "05/03/2026" }))).status).toBe(400);
  });

  it("deriva el monto cobrado del estado en lugar de aceptarlo del cliente", async () => {
    await POST(request({ ...body, paymentStatus: "paid", amountPaid: 1 }));
    expect(state.inserted).toMatchObject({ amount_paid: 42000 });

    await POST(request({ ...body, paymentStatus: "pending", amountPaid: 42000 }));
    expect(state.inserted).toMatchObject({ amount_paid: 0, payment_status: "pending" });
  });

  it("exige el monto ya cobrado cuando el movimiento es parcial y lo mantiene por debajo del total", async () => {
    expect((await POST(request({ ...body, paymentStatus: "partial" }))).status).toBe(400);
    expect((await POST(request({ ...body, paymentStatus: "partial", amountPaid: 42000 }))).status).toBe(400);

    const response = await POST(request({ ...body, paymentStatus: "partial", amountPaid: 20000 }));
    expect(response.status).toBe(201);
    expect(state.inserted).toMatchObject({ amount_paid: 20000, payment_status: "partial" });
  });

  it("limpia el texto que envía el cliente", async () => {
    await POST(request({ ...body, description: "  Recibo <script>  de   luz " }));
    expect(state.inserted).toMatchObject({ description: "Recibo script de luz" });
  });
});
