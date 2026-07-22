import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  allowed: true,
  resend: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => true,
  enforceAuthRateLimit: async () => ({ allowed: state.allowed, retryAfter: 60, fingerprint: "fingerprint" }),
}));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({
  getAppUrl: () => "https://cancha-flow.vercel.app",
  hasSupabaseEnv: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { resend: state.resend } }),
}));

import { POST } from "@/app/api/auth/resend-confirmation/route";

function request(email = "propietario@example.com") {
  return new Request("https://cancha-flow.vercel.app/api/auth/resend-confirmation", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://cancha-flow.vercel.app" },
    body: JSON.stringify({ email }),
  });
}

describe("POST /api/auth/resend-confirmation", () => {
  beforeEach(() => {
    state.allowed = true;
    state.resend.mockReset().mockResolvedValue({ error: null });
  });

  it("reenvía la confirmación al callback estable de producción", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(state.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "propietario@example.com",
      options: { emailRedirectTo: "https://cancha-flow.vercel.app/auth/callback" },
    });
  });

  it("no muestra éxito cuando el proveedor rechaza el correo", async () => {
    state.resend.mockResolvedValueOnce({ error: { message: "Email address not authorized" } });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "No pudimos enviar el correo de confirmación. Intente de nuevo más tarde o contacte soporte.",
    });
  });

  it("limita los reenvíos repetidos", async () => {
    state.allowed = false;

    expect((await POST(request())).status).toBe(429);
    expect(state.resend).not.toHaveBeenCalled();
  });
});
