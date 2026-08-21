import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  hasEnv: true,
  rateLimitAllowed: true,
  rateLimitThrows: false,
  resetError: null as null | Error,
  resetCalls: [] as Array<{ email: string; options: { redirectTo: string } }>,
  audit: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => state.trustedOrigin,
  enforceAuthRateLimit: async () => {
    if (state.rateLimitThrows) throw new Error("rate limit no disponible");
    return { allowed: state.rateLimitAllowed, retryAfter: 3600, fingerprint: "a".repeat(64) };
  },
}));
vi.mock("@/lib/auth/audit", () => ({
  recordSecurityEvent: async (event: Record<string, unknown>) => { state.audit.push(event); },
}));
vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseEnv: () => state.hasEnv,
  getAppUrl: () => "http://localhost:3000",
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      resetPasswordForEmail: async (email: string, options: { redirectTo: string }) => {
        state.resetCalls.push({ email, options });
        return { error: state.resetError };
      },
    },
  }),
}));

import { POST } from "@/app/api/auth/recovery/route";

function post(email = "owner@example.com") {
  return POST(new Request("http://localhost/api/auth/recovery", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ email }),
  }));
}

const GENERIC = /Si la cuenta existe/;

describe("POST /api/auth/recovery", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.hasEnv = true;
    state.rateLimitAllowed = true;
    state.rateLimitThrows = false;
    state.resetError = null;
    state.resetCalls = [];
    state.audit = [];
  });

  it("responde igual exista o no la cuenta, para no filtrar correos", async () => {
    const ok = await post();
    expect((await ok.json()).message).toMatch(GENERIC);

    state.resetError = new Error("user not found");
    const fallo = await post("no-existe@example.com");
    expect(fallo.status).toBe(200);
    expect((await fallo.json()).message).toMatch(GENERIC);
  });

  it("envía el enlace apuntando al callback de restablecimiento", async () => {
    await post();
    expect(state.resetCalls[0]?.options.redirectTo).toBe("http://localhost:3000/auth/callback?next=/restablecer-contrasena");
  });

  it("corta con 429 al agotar el límite, sin llegar a Supabase", async () => {
    state.rateLimitAllowed = false;
    const response = await post();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(state.resetCalls).toHaveLength(0);
    expect(state.audit[0]).toMatchObject({ action: "auth.recovery_requested", outcome: "blocked" });
  });

  it("responde 503 si el rate limiting no está disponible", async () => {
    state.rateLimitThrows = true;
    expect((await post()).status).toBe(503);
    expect(state.resetCalls).toHaveLength(0);
  });

  it("rechaza un origen no confiable y un correo inválido", async () => {
    state.trustedOrigin = false;
    expect((await post()).status).toBe(403);
    state.trustedOrigin = true;
    expect((await post("no-es-correo")).status).toBe(400);
  });

  it("responde 503 sin configuración de Supabase", async () => {
    state.hasEnv = false;
    expect((await post()).status).toBe(503);
  });

  it("registra el resultado real en la auditoría aunque la respuesta sea genérica", async () => {
    state.resetError = new Error("user not found");
    await post();
    expect(state.audit.at(-1)).toMatchObject({ action: "auth.recovery_requested", outcome: "failure" });
  });
});
