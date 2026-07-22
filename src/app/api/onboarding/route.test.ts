import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthUser = { id: string; email?: string; email_confirmed_at?: string };
type AuthError = { message: string; code?: string; status?: number };

const state = vi.hoisted(() => ({
  existingSlug: null as null | { id: string },
  profile: { role: "customer", active: true } as null | { role: string; active: boolean },
  membership: null as null | { id?: string; user_id?: string },
  ownerLookup: null as null | { id: string; email: string; email_confirmed_at?: string },
  rateAllowed: true,
  createUserResult: { data: { user: { id: "new-user" } }, error: null } as {
    data: { user: null | AuthUser };
    error: null | AuthError;
  },
  signInResult: { data: { user: null }, error: { message: "Invalid credentials" } } as {
    data: { user: null | AuthUser };
    error: null | AuthError;
  },
}));

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({
  hasTrustedOrigin: () => true,
  enforceAuthRateLimit: async () => ({ allowed: state.rateAllowed, retryAfter: 60, fingerprint: "a".repeat(64) }),
}));
vi.mock("@/lib/auth/audit", () => ({ recordSecurityEvent: mocks.recordSecurityEvent }));
vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseAdminEnv: () => true,
  hasSupabaseEnv: () => true,
  isDemoMode: () => false,
}));
vi.mock("@/lib/supabase/server", () => ({
  createIsolatedSupabaseClient: () => ({ auth: { signInWithPassword: async () => state.signInResult } }),
  createAdminSupabaseClient: () => ({
    auth: {
      admin: {
        createUser: mocks.createUser,
        updateUserById: mocks.updateUserById,
        deleteUser: mocks.deleteUser,
        getUserById: mocks.getUserById,
      },
    },
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
    state.ownerLookup = null;
    state.rateAllowed = true;
    state.createUserResult = { data: { user: { id: "new-user" } }, error: null };
    state.signInResult = { data: { user: null }, error: { message: "Invalid credentials" } };
    mocks.rpc.mockReset().mockResolvedValue({ data: "business-id", error: null });
    mocks.createUser.mockReset().mockImplementation(async () => state.createUserResult);
    mocks.updateUserById.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    mocks.deleteUser.mockReset();
    mocks.getUserById.mockReset().mockImplementation(async () => ({ data: { user: state.ownerLookup }, error: null }));
    mocks.recordSecurityEvent.mockReset();
  });

  it("crea y activa inmediatamente la cuenta de un propietario nuevo", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ publicUrl: "/centro/cancha-norte", requiresEmailVerification: false });
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "CanchaSegura#2026",
      email_confirm: true,
      user_metadata: { full_name: "Ana Pérez" },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_business_onboarding", expect.objectContaining({ p_user_id: "new-user", p_slug: "cancha-norte" }));
  });

  it("convierte en propietario una cuenta de cliente que acredita su contraseña", async () => {
    state.createUserResult = {
      data: { user: null },
      error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 },
    };
    state.signInResult = { data: { user: { id: "existing-customer", email_confirmed_at: "2026-07-22T00:00:00Z" } }, error: null };

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ publicUrl: "/centro/cancha-norte", requiresEmailVerification: false });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_business_onboarding", expect.objectContaining({ p_user_id: "existing-customer" }));
  });

  it("no eleva una cuenta existente cuando la contraseña no se pudo comprobar", async () => {
    state.createUserResult = {
      data: { user: null },
      error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 },
    };

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Este correo ya está registrado. Inicie sesión o utilice otro correo." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("activa sin correo una cuenta pendiente creada por el flujo anterior", async () => {
    state.existingSlug = { id: "business-id" };
    state.membership = { user_id: "owner-user" };
    state.ownerLookup = { id: "owner-user", email: "ana@example.com" };

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      publicUrl: "/centro/cancha-norte",
      requiresEmailVerification: false,
      message: "La cuenta existente quedó activa. Ya puede iniciar sesión con su contraseña original.",
    });
    expect(mocks.updateUserById).toHaveBeenCalledWith("owner-user", { email_confirm: true });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("mantiene intacta una cuenta que ya estaba activa", async () => {
    state.existingSlug = { id: "business-id" };
    state.membership = { user_id: "owner-user" };
    state.ownerLookup = { id: "owner-user", email: "ana@example.com", email_confirmed_at: "2026-07-22T00:00:00Z" };

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Esta cuenta ya está registrada. Inicie sesión para abrir su panel." });
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("revierte el usuario si no puede terminar la configuración del negocio", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "Database error" } });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.deleteUser).toHaveBeenCalledWith("new-user");
  });

  it("limita los intentos automatizados de registro", async () => {
    state.rateAllowed = false;

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
