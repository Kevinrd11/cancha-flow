import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existingSlug: null as null | { id: string },
  profile: { role: "customer", active: true } as null | { role: string; active: boolean },
  membership: null as null | { id: string },
  signUpResult: { data: { user: { id: "new-user", identities: [{ id: "identity" }] }, session: null }, error: null } as {
    data: { user: null | { id: string; identities?: { id: string }[] }; session: null | { access_token: string } };
    error: null | { message: string };
  },
  signInResult: { data: { user: null }, error: { message: "Invalid credentials" } } as {
    data: { user: null | { id: string; email_confirmed_at?: string } };
    error: null | { message: string };
  },
}));

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  deleteUser: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => true,
  enforceAuthRateLimit: async () => ({ allowed: true, retryAfter: 0, fingerprint: "a".repeat(64) }),
}));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: mocks.recordSecurityEvent }));
vi.mock("@/lib/supabase/env", () => ({
  getAppUrl: () => "https://canchaflow.example",
  hasSupabaseAdminEnv: () => true,
  hasSupabaseEnv: () => true,
  isDemoMode: () => false,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { signUp: async () => state.signUpResult, signOut: vi.fn() } }),
  createIsolatedSupabaseClient: () => ({ auth: { signInWithPassword: async () => state.signInResult } }),
  createAdminSupabaseClient: () => ({
    auth: { admin: { deleteUser: mocks.deleteUser } },
    rpc: mocks.rpc,
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({
          data: table === "businesses" ? state.existingSlug : table === "profiles" ? state.profile : state.membership,
          error: null,
        }),
      };
      return chain;
    },
  }),
}));

import { POST } from "@/app/api/onboarding/route";

const validOnboarding = {
  ownerName: "Ana Pérez",
  email: "ana@example.com",
  password: "CanchaSegura#2026",
  businessName: "Cancha Norte",
  slug: "cancha-norte",
  phone: "8888-8888",
  location: "Ciudad Quesada",
  description: "Cancha sintética para fútbol cinco",
  currency: "CRC",
  timezone: "America/Costa_Rica",
  courtName: "Principal",
  sport: "Fútbol 5",
  openingTime: "08:00",
  closingTime: "22:00",
  reservationMinutes: 60,
  hourlyRate: 18000,
  billingInterval: "monthly",
  plan: "starter",
};

function request() {
  return new Request("https://canchaflow.example/api/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validOnboarding),
  });
}

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    state.existingSlug = null;
    state.profile = { role: "customer", active: true };
    state.membership = null;
    state.signUpResult = { data: { user: { id: "new-user", identities: [{ id: "identity" }] }, session: null }, error: null };
    state.signInResult = { data: { user: null }, error: { message: "Invalid credentials" } };
    mocks.rpc.mockReset().mockResolvedValue({ data: "business-id", error: null });
    mocks.deleteUser.mockReset();
    mocks.recordSecurityEvent.mockReset();
  });

  it("crea el negocio y solicita confirmación para un propietario nuevo", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ publicUrl: "/centro/cancha-norte", requiresEmailVerification: true });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_business_onboarding", expect.objectContaining({ p_user_id: "new-user", p_slug: "cancha-norte" }));
  });

  it("convierte en propietario una cuenta de cliente confirmada que acredita su contraseña", async () => {
    state.signUpResult = { data: { user: { id: "masked-user", identities: [] }, session: null }, error: null };
    state.signInResult = { data: { user: { id: "existing-customer", email_confirmed_at: "2026-07-22T00:00:00Z" } }, error: null };

    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ publicUrl: "/centro/cancha-norte", requiresEmailVerification: false });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_business_onboarding", expect.objectContaining({ p_user_id: "existing-customer" }));
  });

  it("no eleva una cuenta existente cuando la contraseña no se pudo comprobar", async () => {
    state.signUpResult = { data: { user: { id: "masked-user", identities: [] }, session: null }, error: null };

    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ requiresEmailVerification: true });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
