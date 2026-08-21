import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  auth: null as null | Record<string, unknown>,
  court: { id: "30000000-0000-4000-8000-000000000001" } as Record<string, unknown> | null,
  updateError: null as null | Error,
  updates: [] as Array<{ table: string; values: Record<string, unknown>; filters: Array<[string, unknown]> }>,
  courtFilters: [] as Array<[string, unknown]>,
  requestedPermission: "" as string,
}));

vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trustedOrigin }));
vi.mock("@/lib/auth/session", () => ({
  requireBusinessPermission: async (permission: string) => {
    state.requestedPermission = permission;
    return state.auth;
  },
}));

import { PATCH } from "@/app/api/admin/settings/route";

const BUSINESS_ID = "20000000-0000-4000-8000-000000000001";

function supabase() {
  const fieldSelect = {
    select: () => fieldSelect,
    eq: (column: string, value: unknown) => {
      state.courtFilters.push([column, value]);
      return fieldSelect;
    },
    order: () => fieldSelect,
    limit: () => fieldSelect,
    single: async () => ({ data: state.court }),
  };
  return {
    from: (table: string) => ({
      select: fieldSelect.select,
      eq: fieldSelect.eq,
      order: fieldSelect.order,
      limit: fieldSelect.limit,
      single: fieldSelect.single,
      update: (values: Record<string, unknown>) => {
        const filters: Array<[string, unknown]> = [];
        state.updates.push({ table, values, filters });
        // El handler espera la cadena directamente: `await ...update(...).eq(...)`,
        // así que el mock es a la vez encadenable y thenable.
        const chain: Record<string, unknown> = {
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return chain;
          },
          then: (resolve: (value: unknown) => void) => resolve({ error: state.updateError }),
        };
        return chain;
      },
    }),
  };
}

const settings = {
  businessName: "Arena Ciudad Quesada",
  description: "Cancha de fútbol 7 en Ciudad Quesada con iluminación LED.",
  location: "Ciudad Quesada",
  email: "reservas@example.com",
  currency: "CRC",
  timezone: "America/Costa_Rica",
  fieldName: "Cancha principal",
  whatsappPhone: "8888-1212",
  sinpePhone: "8888-1212",
  hourlyRate: 18000,
  openingTime: "08:00",
  closingTime: "23:00",
  minimumMinutes: 60,
  holdMinutes: 1440,
  cancellationPolicy: "Puede reprogramar con 24 horas de anticipación.",
  nonWorkingDays: [],
};

function patch(overrides: Record<string, unknown> = {}) {
  return PATCH(new Request("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ ...settings, ...overrides }),
  }));
}

describe("PATCH /api/admin/settings", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.auth = { businessId: BUSINESS_ID, demo: false, supabase: supabase() };
    state.court = { id: "30000000-0000-4000-8000-000000000001" };
    state.updateError = null;
    state.updates = [];
    state.courtFilters = [];
    state.requestedPermission = "";
  });

  it("exige el permiso de configuración, que solo tiene el propietario", async () => {
    await patch();
    expect(state.requestedPermission).toBe("business:configure");
  });

  it("guarda negocio, cancha y horarios", async () => {
    const response = await patch();
    expect(response.status).toBe(200);
    expect(state.updates.map((update) => update.table)).toEqual(["businesses", "fields", "business_settings"]);
    expect(state.updates[2]?.values.hold_minutes).toBe(1440);
  });

  it("rechaza un origen no confiable", async () => {
    state.trustedOrigin = false;
    expect((await patch()).status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("responde 403 sin el permiso", async () => {
    state.auth = null;
    expect((await patch()).status).toBe(403);
  });

  it("rechaza una apertura o cierre a media hora", async () => {
    expect((await patch({ openingTime: "08:30" })).status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it("rechaza un plazo de respuesta fuera de rango", async () => {
    expect((await patch({ holdMinutes: 20 })).status).toBe(400);
  });

  it("guarda el horario de la cancha indicada, no siempre el de la primera", async () => {
    const second = "30000000-0000-4000-8000-000000000002";
    state.court = { id: second };
    const response = await patch({ fieldId: second, openingTime: "09:00" });
    expect(response.status).toBe(200);
    // La cancha se busca por id y acotada al negocio de la sesión.
    expect(state.courtFilters).toContainEqual(["id", second]);
    expect(state.courtFilters).toContainEqual(["business_id", BUSINESS_ID]);
    const settingsUpdate = state.updates.find((update) => update.table === "business_settings");
    expect(settingsUpdate?.values.opening_time).toBe("09:00");
    expect(settingsUpdate?.filters).toContainEqual(["field_id", second]);
  });

  it("responde 403 si la cancha indicada no pertenece al negocio", async () => {
    state.court = null;
    const response = await patch({ fieldId: "30000000-0000-4000-8000-000000000009" });
    expect(response.status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("rechaza un identificador de cancha que no es un uuid", async () => {
    expect((await patch({ fieldId: "cancha-2" })).status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it("responde 404 si el negocio no tiene cancha configurada", async () => {
    state.court = null;
    expect((await patch()).status).toBe(404);
  });

  it("responde 500 si falla el guardado", async () => {
    state.updateError = new Error("fallo de escritura");
    const response = await patch();
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toMatch(/fallo de escritura/);
  });
});
