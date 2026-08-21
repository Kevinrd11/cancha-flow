import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  session: null as null | Record<string, unknown>,
  signOutError: null as null | Error,
  signOutArgs: [] as unknown[],
  audit: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trustedOrigin }));
vi.mock("@/lib/auth/audit", () => ({
  recordSecurityEvent: async (event: Record<string, unknown>) => { state.audit.push(event); },
}));
vi.mock("@/lib/auth/session", () => ({ getSessionContext: async () => state.session }));

import { POST } from "@/app/api/auth/sessions/revoke-others/route";

function session() {
  return {
    user: { id: "10000000-0000-4000-8000-000000000001" },
    businessId: "20000000-0000-4000-8000-000000000001",
    supabase: {
      auth: {
        signOut: async (args: unknown) => {
          state.signOutArgs.push(args);
          return { error: state.signOutError };
        },
      },
    },
  };
}

function post() {
  return POST(new Request("http://localhost/api/auth/sessions/revoke-others", {
    method: "POST",
    headers: { origin: "http://localhost" },
  }));
}

describe("POST /api/auth/sessions/revoke-others", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.session = session();
    state.signOutError = null;
    state.signOutArgs = [];
    state.audit = [];
  });

  it("cierra solo las otras sesiones, no la actual", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(state.signOutArgs).toEqual([{ scope: "others" }]);
  });

  it("deja rastro en la auditoría", async () => {
    await post();
    expect(state.audit[0]).toMatchObject({ action: "auth.sessions_revoke_others", outcome: "success" });
  });

  it("rechaza un origen no confiable antes de tocar la sesión", async () => {
    state.trustedOrigin = false;
    expect((await post()).status).toBe(403);
    expect(state.signOutArgs).toHaveLength(0);
  });

  it("responde 401 sin sesión", async () => {
    state.session = null;
    expect((await post()).status).toBe(401);
  });

  it("responde 503 si Supabase falla y no audita un éxito falso", async () => {
    state.signOutError = new Error("fallo remoto");
    expect((await post()).status).toBe(503);
    expect(state.audit).toHaveLength(0);
  });
});
