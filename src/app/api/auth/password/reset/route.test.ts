import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ marker: "active" as string | undefined, user: { id: "10000000-0000-4000-8000-000000000001" } as Record<string, unknown> | null, updateError: null as null | Error, updateUser: vi.fn(), signOut: vi.fn(), deleteCookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.marker ? { value: state.marker } : undefined, delete: state.deleteCookie }) }));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => true }));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }), updateUser: state.updateUser, signOut: state.signOut } }) }));

import { POST } from "@/app/api/auth/password/reset/route";
const validBody = { password: "CanchaSegura#2026", confirmPassword: "CanchaSegura#2026" };
function request() { return new Request("http://localhost/api/auth/password/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validBody) }); }

describe("POST /api/auth/password/reset", () => {
  beforeEach(() => { state.marker = "active"; state.user = { id: "10000000-0000-4000-8000-000000000001" }; state.updateError = null; state.updateUser.mockReset().mockResolvedValue({ error: state.updateError }); state.signOut.mockReset().mockResolvedValue({ error: null }); state.deleteCookie.mockReset(); });
  it("acepta un flujo válido, consume el marcador y revoca todas las sesiones", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(state.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(state.deleteCookie).toHaveBeenCalledWith("cf-recovery-flow");
  });
  it.each([undefined, "used", "expired"])("rechaza token inválido, reutilizado o vencido (%s)", async (marker) => {
    state.marker = marker;
    expect((await POST(request())).status).toBe(401);
  });
  it("rechaza una sesión alterada o revocada", async () => {
    state.user = null;
    expect((await POST(request())).status).toBe(401);
  });
});
