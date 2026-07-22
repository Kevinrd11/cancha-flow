import { describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => true }));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: async () => ({ user: { id: "10000000-0000-4000-8000-000000000001" }, businessId: "20000000-0000-4000-8000-000000000001", supabase: { auth: { signOut } } }) }));

import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("cierra únicamente la sesión actual", async () => {
    const response = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
