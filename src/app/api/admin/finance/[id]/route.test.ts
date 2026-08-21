import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  auth: null as null | Record<string, unknown>,
  existing: { id: "50000000-0000-4000-8000-000000000001", source: "manual" } as Record<string, unknown> | null,
  writeError: null as null | Error,
  updates: [] as Array<Record<string, unknown>>,
  deletes: 0,
}));

vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trustedOrigin }));
vi.mock("@/lib/admin-auth", () => ({ requireFinance: async () => state.auth }));
vi.mock("@/lib/demo-data", () => ({
  updateDemoFinanceTransaction: vi.fn(),
  deleteDemoFinanceTransaction: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/admin/finance/[id]/route";

const ID = "50000000-0000-4000-8000-000000000001";
const BUSINESS_ID = "20000000-0000-4000-8000-000000000001";

function supabase() {
  const selectChain = {
    select: () => selectChain,
    eq: () => selectChain,
    single: async () => ({ data: state.existing }),
  };
  return {
    from: () => ({
      select: selectChain.select,
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        const chain: Record<string, unknown> = {
          eq: () => chain,
          then: (resolve: (value: unknown) => void) => resolve({ error: state.writeError }),
        };
        return chain;
      },
      delete: () => {
        state.deletes += 1;
        const chain: Record<string, unknown> = {
          eq: () => chain,
          then: (resolve: (value: unknown) => void) => resolve({ error: state.writeError }),
        };
        return chain;
      },
    }),
  };
}

const movement = {
  type: "expense",
  category: "maintenance",
  description: "Corte de zacate",
  amount: 12000,
  paymentStatus: "paid",
  date: "2026-08-10",
};

const params = { params: Promise.resolve({ id: ID }) };

function patch(overrides: Record<string, unknown> = {}) {
  return PATCH(new Request(`http://localhost/api/admin/finance/${ID}`, {
    method: "PATCH",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ ...movement, ...overrides }),
  }), params);
}

function remove() {
  return DELETE(new Request(`http://localhost/api/admin/finance/${ID}`, {
    method: "DELETE",
    headers: { origin: "http://localhost" },
  }), params);
}

describe("/api/admin/finance/[id]", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.auth = { businessId: BUSINESS_ID, demo: false, supabase: supabase() };
    state.existing = { id: ID, source: "manual" };
    state.writeError = null;
    state.updates = [];
    state.deletes = 0;
  });

  it("actualiza un movimiento manual", async () => {
    expect((await patch()).status).toBe(200);
    expect(state.updates[0]?.transaction_date).toBe("2026-08-10");
  });

  it("no deja tocar un ingreso generado por una reserva", async () => {
    state.existing = { id: ID, source: "reservation" };
    const response = await patch();
    expect(response.status).toBe(403);
    expect(state.updates).toHaveLength(0);
    expect((await remove()).status).toBe(403);
    expect(state.deletes).toBe(0);
  });

  it("rechaza la categoría reservada para las reservas", async () => {
    const response = await patch({ category: "court_reservation" });
    expect(response.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it("deriva el monto cobrado del estado, sin confiar en el cliente", async () => {
    await patch({ paymentStatus: "pending", amountPaid: 9999 });
    expect(state.updates[0]?.amount_paid).toBe(0);

    state.updates = [];
    await patch({ paymentStatus: "partial", amountPaid: 5000 });
    expect(state.updates[0]?.amount_paid).toBe(5000);
  });

  it("rechaza un cobro parcial que iguala o supera el total", async () => {
    expect((await patch({ paymentStatus: "partial", amountPaid: 12000 })).status).toBe(400);
    expect((await patch({ paymentStatus: "partial" })).status).toBe(400);
  });

  it("rechaza un origen no confiable y una sesión sin finanzas", async () => {
    state.trustedOrigin = false;
    expect((await patch()).status).toBe(403);
    state.trustedOrigin = true;
    state.auth = null;
    expect((await patch()).status).toBe(401);
    expect((await remove()).status).toBe(401);
  });

  it("responde 404 si el movimiento no existe en el negocio", async () => {
    state.existing = null;
    expect((await patch()).status).toBe(404);
    expect((await remove()).status).toBe(404);
  });

  it("elimina un movimiento manual", async () => {
    expect((await remove()).status).toBe(200);
    expect(state.deletes).toBe(1);
  });

  it("responde 500 si falla la escritura", async () => {
    state.writeError = new Error("fallo");
    expect((await patch()).status).toBe(500);
    expect((await remove()).status).toBe(500);
  });
});
