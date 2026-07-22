import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateUserById: vi.fn().mockResolvedValue({ error: null }), adminSignOut: vi.fn().mockResolvedValue({ error: null }), localSignOut: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => true }));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabaseAdminEnv: () => true }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: async () => ({ user: { id: "10000000-0000-4000-8000-000000000001", email: "owner@example.com" }, businessId: "20000000-0000-4000-8000-000000000001", supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "opaque-access-token" } } }), signOut: mocks.localSignOut } } }) }));
vi.mock("@/lib/supabase/server", () => ({ createIsolatedSupabaseClient: () => ({ auth: { signInWithPassword: async () => ({ error: null }) } }), createAdminSupabaseClient: () => ({ auth: { admin: { updateUserById: mocks.updateUserById, signOut: mocks.adminSignOut } } }) }));

import { POST } from "@/app/api/auth/password/change/route";

describe("POST /api/auth/password/change", () => {
  it("verifica la contraseña e invalida todas las sesiones anteriores", async () => {
    const response = await POST(new Request("http://localhost/api/auth/password/change", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: "ActualSegura#2025", password: "NuevaSegura#2026", confirmPassword: "NuevaSegura#2026" }) }));
    expect(response.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalled();
    expect(mocks.adminSignOut).toHaveBeenCalledWith("opaque-access-token", "global");
    expect(mocks.localSignOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
