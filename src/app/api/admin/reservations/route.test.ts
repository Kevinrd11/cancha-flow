import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: null as null | Record<string, unknown>,
  total: 18000 as number | null,
  updated: null as Record<string, unknown> | null,
  review: null as Record<string, unknown> | null,
}));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => true }));
vi.mock("@/lib/auth/session", () => ({ requireBusinessPermission: async () => state.auth }));

import { PATCH } from "@/app/api/admin/reservations/route";

const ID = "30000000-0000-4000-8000-000000000001";
function request(value: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/reservations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: ID, ...value }) });
}

describe("PATCH /api/admin/reservations — registro de cobro", () => {
  beforeEach(() => {
    state.total = 18000;
    state.updated = null;
    state.review = null;
    const chain = {
      from: () => chain,
      select: () => chain,
      eq: () => chain,
      update: (value: Record<string, unknown>) => { state.updated = value; return chain; },
      single: async () => ({ data: state.total === null ? null : { total: state.total }, error: null }),
      rpc: async (_name: string, args: Record<string, unknown>) => { state.review = args; return { error: null }; },
    };
    state.auth = { demo: false, businessId: "20000000-0000-4000-8000-000000000001", supabase: chain };
  });

  it("marca la reserva como pagada cuando el cobro cubre el total", async () => {
    const response = await PATCH(request({ amountPaid: 18000, paymentMethod: "sinpe" }));
    expect(response.status).toBe(200);
    expect(state.updated).toMatchObject({ amount_paid: 18000, payment_method: "sinpe" });
    expect(state.updated?.paid_at).toBeTypeOf("string");
    expect(state.review).toMatchObject({ p_payment_status: "approved" });
  });

  it("distingue el cobro parcial", async () => {
    await PATCH(request({ amountPaid: 9000 }));
    expect(state.review).toMatchObject({ p_payment_status: "partial" });
    expect(state.updated).toMatchObject({ amount_paid: 9000 });
  });

  it("vuelve a dejarla sin pagar y borra la fecha de pago cuando se cobra cero", async () => {
    await PATCH(request({ amountPaid: 0 }));
    expect(state.review).toMatchObject({ p_payment_status: "unpaid" });
    expect(state.updated).toMatchObject({ amount_paid: 0, paid_at: null });
  });

  it("no acepta un cobro mayor que el total que calculó la base de datos", async () => {
    const response = await PATCH(request({ amountPaid: 90000 }));
    expect(response.status).toBe(400);
    expect(state.updated).toBeNull();
  });

  it("responde 404 cuando la reserva no pertenece al negocio de la sesión", async () => {
    state.total = null;
    expect((await PATCH(request({ amountPaid: 9000 }))).status).toBe(404);
  });

  it("rechaza un monto negativo", async () => {
    expect((await PATCH(request({ amountPaid: -1 }))).status).toBe(400);
  });

  it("respeta el estado de pago cuando se envía explícitamente", async () => {
    await PATCH(request({ amountPaid: 18000, paymentStatus: "refunded" }));
    expect(state.review).toMatchObject({ p_payment_status: "refunded" });
  });

  it("aplica el mismo límite en modo demo que contra Supabase", async () => {
    // La reserva demo "Daniela Vargas" cuesta 18 000.
    state.auth = { demo: true, businessId: "00000000-0000-4000-8000-000000000010", supabase: null };
    const overpaid = new Request("http://localhost/api/admin/reservations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "14cf42bf-6234-48f7-a35c-7ca16ed1edc1", amountPaid: 99999 }),
    });
    expect((await PATCH(overpaid)).status).toBe(400);
  });
});
