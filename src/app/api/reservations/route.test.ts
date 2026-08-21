import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  hasEnv: true,
  hasAdminEnv: true,
  rateLimitAllowed: true,
  rateLimitThrows: false,
  rpcError: null as null | { code: string },
  rpcThrows: false,
  rpcCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => state.trustedOrigin,
  enforceAuthRateLimit: async () => {
    if (state.rateLimitThrows) throw new Error("rate limit no disponible");
    return { allowed: state.rateLimitAllowed, retryAfter: 3600, fingerprint: "a".repeat(64) };
  },
}));
vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: () => state.hasEnv,
  hasSupabaseAdminEnv: () => state.hasAdminEnv,
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminSupabaseClient: () => ({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push(args);
      if (state.rpcThrows) throw new Error("caída de red");
      if (state.rpcError) return { data: null, error: state.rpcError };
      return { data: [{ reservation_code: "CF-ABCD1234" }], error: null };
    },
  }),
}));

import { POST } from "@/app/api/reservations/route";

// Mañana en zona de Costa Rica: evita que el test se rompa al correr de noche.
function tomorrow() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
  now.setDate(now.getDate() + 1);
  return now.toISOString().slice(0, 10);
}

function request(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      fieldId: "30000000-0000-4000-8000-000000000001",
      date: tomorrow(),
      startTime: "10:00",
      durationMinutes: 60,
      fullName: "Ana Rojas",
      phone: "8888-1212",
      ...overrides,
    }),
  });
}

describe("POST /api/reservations", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.hasEnv = true;
    state.hasAdminEnv = true;
    state.rateLimitAllowed = true;
    state.rateLimitThrows = false;
    state.rpcError = null;
    state.rpcThrows = false;
    state.rpcCalls = [];
  });

  it("crea la solicitud y devuelve el código", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ reservationCode: "CF-ABCD1234", status: "pending" });
  });

  it("calcula la hora de fin en el servidor, no la acepta del cliente", async () => {
    await POST(request({ durationMinutes: 120 }));
    expect(state.rpcCalls[0]?.p_start_time).toBe("10:00");
    expect(state.rpcCalls[0]?.p_end_time).toBe("12:00");
  });

  it("rechaza un origen no confiable", async () => {
    state.trustedOrigin = false;
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rechaza un cuerpo que no es JSON", async () => {
    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: "no es json",
    }));
    expect(response.status).toBe(400);
  });

  it("rechaza medias horas y duraciones fuera de 1 o 2 horas", async () => {
    expect((await POST(request({ startTime: "10:30" }))).status).toBe(400);
    expect((await POST(request({ durationMinutes: 90 }))).status).toBe(400);
  });

  it("rechaza una fecha pasada", async () => {
    const response = await POST(request({ date: "2020-01-01" }));
    expect(response.status).toBe(400);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("traduce el choque de horarios a 409", async () => {
    state.rpcError = { code: "23P01" };
    const response = await POST(request());
    expect(response.status).toBe(409);

    state.rpcError = { code: "P0001" };
    expect((await POST(request())).status).toBe(409);
  });

  it("responde 503 si falta la clave privada del servidor", async () => {
    state.hasAdminEnv = false;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("responde 503 ante un fallo inesperado, sin filtrar el detalle", async () => {
    state.rpcThrows = true;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toMatch(/caída de red/);
  });

  it("corta con 429 cuando se agota el límite por IP", async () => {
    state.rateLimitAllowed = false;
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("responde 503 si el rate limiting no está disponible", async () => {
    state.rateLimitThrows = true;
    expect((await POST(request())).status).toBe(503);
    expect(state.rpcCalls).toHaveLength(0);
  });
});
