import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signInError: null as null | Error,
  signInAttempts: 0,
  user: { id: "10000000-0000-4000-8000-000000000001", email_confirmed_at: "2026-01-01" } as Record<string, unknown> | null,
  profile: { role: "owner", active: true } as Record<string, unknown> | null,
  membership: { business_id: "20000000-0000-4000-8000-000000000001", role: "owner" } as Record<string, unknown> | null,
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => true,
  getRequestFingerprint: () => "a".repeat(64),
}));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabaseEnv: () => true, isDemoMode: () => false }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => {
    const profileChain = { select: () => profileChain, eq: () => profileChain, single: async () => ({ data: state.profile }) };
    const membershipChain = { select: () => membershipChain, eq: () => membershipChain, order: () => membershipChain, limit: () => membershipChain, maybeSingle: async () => ({ data: state.membership }) };
    return {
      auth: {
        signInWithPassword: async () => {
          state.signInAttempts += 1;
          return { data: { user: state.user }, error: state.signInError };
        },
        signOut: state.signOut,
      },
      from: (table: string) => table === "profiles" ? profileChain : membershipChain,
    };
  },
}));

import { POST } from "@/app/api/auth/login/route";

function request() {
  return new Request("http://localhost/api/auth/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "correcta" }) });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => { state.signInError = null; state.signInAttempts = 0; state.user = { id: "10000000-0000-4000-8000-000000000001", email_confirmed_at: "2026-01-01" }; state.profile = { role: "owner", active: true }; state.membership = { business_id: "20000000-0000-4000-8000-000000000001", role: "owner" }; state.signOut.mockClear(); });

  it("inicia sesión y redirige al rol correcto", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/admin" });
  });

  it("rechaza credenciales incorrectas sin detalles sensibles", async () => {
    state.signInError = new Error("invalid credentials"); state.user = null;
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect((await response.json()).error).not.toMatch(/exist|registered/i);
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("permite intentos repetidos sin bloquear el inicio de sesión", async () => {
    state.signInError = new Error("invalid credentials");
    state.user = null;
    const responses = await Promise.all(Array.from({ length: 10 }, () => POST(request())));
    expect(responses.every((response) => response.status === 401)).toBe(true);
    expect(state.signInAttempts).toBe(10);
  });

  it("explica a un propietario válido que su acceso aún no fue aprobado", async () => {
    state.profile = { role: "owner", active: false };
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/pendiente de aprobación/i);
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
