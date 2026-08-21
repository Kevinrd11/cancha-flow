import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  auth: null as null | Record<string, unknown>,
  court: { id: "30000000-0000-4000-8000-000000000001", name: "Cancha principal" } as Record<string, unknown> | null,
  rpcError: null as null | { code: string },
  deleted: [{ id: "40000000-0000-4000-8000-000000000001" }] as Array<{ id: string }>,
  requestedPermission: "" as string,
}));

vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trustedOrigin }));
vi.mock("@/lib/auth/session", () => ({
  requireBusinessPermission: async (permission: string) => {
    state.requestedPermission = permission;
    return state.auth;
  },
}));
vi.mock("@/lib/demo-data", () => ({ createDemoBlockedSlot: vi.fn(), deleteDemoBlockedSlot: vi.fn() }));

import { DELETE, POST } from "@/app/api/admin/blocked-slots/route";

const BUSINESS_ID = "20000000-0000-4000-8000-000000000001";
const FIELD_ID = "30000000-0000-4000-8000-000000000001";

function supabase() {
  const fieldChain = {
    select: () => fieldChain,
    eq: () => fieldChain,
    single: async () => ({ data: state.court }),
  };
  const deleteChain = {
    delete: () => deleteChain,
    eq: () => deleteChain,
    select: async () => ({ data: state.deleted, error: null }),
  };
  return {
    from: (table: string) => (table === "fields" ? fieldChain : deleteChain),
    rpc: async () => (state.rpcError
      ? { data: null, error: state.rpcError }
      : { data: "40000000-0000-4000-8000-000000000001", error: null }),
  };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    fieldId: FIELD_ID,
    date: "2026-09-01",
    startTime: "16:00",
    endTime: "17:00",
    reason: "Mantenimiento",
    ...overrides,
  };
}

function post(overrides: Record<string, unknown> = {}) {
  return POST(new Request("http://localhost/api/admin/blocked-slots", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(body(overrides)),
  }));
}

describe("/api/admin/blocked-slots", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.auth = { businessId: BUSINESS_ID, demo: false, supabase: supabase() };
    state.court = { id: FIELD_ID, name: "Cancha principal" };
    state.rpcError = null;
    state.deleted = [{ id: "40000000-0000-4000-8000-000000000001" }];
    state.requestedPermission = "";
  });

  it("exige el permiso de agenda", async () => {
    await post();
    expect(state.requestedPermission).toBe("schedule:manage");
  });

  it("crea el bloqueo", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    expect((await response.json()).blockedSlot.courtName).toBe("Cancha principal");
  });

  it("rechaza un origen no confiable", async () => {
    state.trustedOrigin = false;
    expect((await post()).status).toBe(403);
  });

  it("responde 401 sin sesión con permiso", async () => {
    state.auth = null;
    expect((await post()).status).toBe(401);
  });

  it("rechaza bloquear una cancha de otro negocio", async () => {
    state.court = null;
    const response = await post();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/no pertenece/i);
  });

  it("rechaza horas que no son en punto y rangos invertidos", async () => {
    expect((await post({ startTime: "16:30" })).status).toBe(400);
    expect((await post({ endTime: "15:00" })).status).toBe(400);
  });

  it("traduce el solape a 409", async () => {
    state.rpcError = { code: "23P01" };
    const response = await post();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/superpone/i);
  });

  it("borra un bloqueo propio y responde 404 si ya no existe", async () => {
    const remove = () => DELETE(new Request("http://localhost/api/admin/blocked-slots", {
      method: "DELETE",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ id: "40000000-0000-4000-8000-000000000001" }),
    }));
    expect((await remove()).status).toBe(200);
    state.deleted = [];
    expect((await remove()).status).toBe(404);
  });
});
