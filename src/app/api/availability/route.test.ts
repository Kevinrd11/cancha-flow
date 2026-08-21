import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  hasEnv: true,
  slots: [] as Array<{ slot_time: string; slot_state: string }>,
  rpcError: null as null | Error,
}));

vi.mock("@/lib/supabase/env", () => ({ hasSupabaseEnv: () => state.hasEnv }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    rpc: async () => (state.rpcError ? { data: null, error: state.rpcError } : { data: state.slots, error: null }),
  }),
}));

import { GET } from "@/app/api/availability/route";

const FIELD_ID = "30000000-0000-4000-8000-000000000001";

function futureDate() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
  now.setDate(now.getDate() + 3);
  return now.toISOString().slice(0, 10);
}

function get(params: Record<string, string>) {
  const url = new URL("http://localhost/api/availability");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return GET(new Request(url));
}

describe("GET /api/availability", () => {
  beforeEach(() => {
    state.hasEnv = true;
    state.rpcError = null;
    state.slots = [];
  });

  it("rechaza una fecha inválida o un fieldId que no es uuid", async () => {
    expect((await get({ date: "no-es-fecha", fieldId: FIELD_ID })).status).toBe(400);
    expect((await get({ date: futureDate(), fieldId: "123" })).status).toBe(400);
  });

  it("rechaza una fecha pasada", async () => {
    expect((await get({ date: "2020-01-01", fieldId: FIELD_ID })).status).toBe(400);
  });

  it("descarta los slots que no caen en hora en punto", async () => {
    state.slots = [
      { slot_time: "10:00:00", slot_state: "available" },
      { slot_time: "10:30:00", slot_state: "available" },
      { slot_time: "11:00:00", slot_state: "reserved" },
    ];
    const response = await get({ date: futureDate(), fieldId: FIELD_ID });
    expect(response.status).toBe(200);
    const { slots } = await response.json();
    expect(slots.map((slot: { time: string }) => slot.time)).toEqual(["10:00", "11:00"]);
    expect(slots[1].state).toBe("reserved");
  });

  it("propaga el estado de cada slot tal como lo calcula la base de datos", async () => {
    state.slots = [
      { slot_time: "08:00:00", slot_state: "blocked" },
      { slot_time: "09:00:00", slot_state: "pending" },
    ];
    const { slots } = await (await get({ date: futureDate(), fieldId: FIELD_ID })).json();
    expect(slots.map((slot: { state: string }) => slot.state)).toEqual(["blocked", "pending"]);
  });

  it("responde 503 si la consulta falla, sin filtrar el detalle", async () => {
    state.rpcError = new Error("conexión rechazada");
    const response = await get({ date: futureDate(), fieldId: FIELD_ID });
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toMatch(/conexión rechazada/);
  });
});
