import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ auth: null as null | Record<string, unknown>, court: null as Record<string, unknown> | null, updated: null as Record<string, unknown> | null }));
vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => true }));
vi.mock("@/lib/auth/session", () => ({ requireBusinessPermission: async () => state.auth }));

import { PATCH } from "@/app/api/admin/court/route";
const body = { fieldId: "10000000-0000-4000-8000-000000000001", name: "Cancha principal", description: "Cancha sintética en excelente estado", location: "Ciudad Quesada", hourlyRate: 18000, imageUrl: "https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg", active: true };
function request(value = body) { return new Request("http://localhost/api/admin/court", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }

describe("PATCH /api/admin/court", () => {
  beforeEach(() => {
    state.court = null;
    state.updated = null;
    const selectChain = { select: () => selectChain, update: (value: Record<string, unknown>) => { state.updated = value; return selectChain; }, eq: () => selectChain, single: async () => ({ data: state.court }), error: null };
    state.auth = { demo: false, businessId: "20000000-0000-4000-8000-000000000001", supabase: { from: () => selectChain } };
  });
  it("rechaza acceso sin autenticación o con rol insuficiente", async () => {
    state.auth = null;
    expect((await PATCH(request())).status).toBe(403);
  });
  it("previene IDOR cuando el ID pertenece a otra organización", async () => {
    state.court = null;
    expect((await PATCH(request())).status).toBe(403);
  });
  it("rechaza intentos de modificar role desde el cliente", async () => {
    expect((await PATCH(request({ ...body, role: "platform_admin" } as typeof body))).status).toBe(400);
  });
  it("rechaza una fotografía de un origen que next/image no puede renderizar", async () => {
    state.court = { id: body.fieldId };
    const response = await PATCH(request({ ...body, imageUrl: "https://www.google.com/url?sa=t&url=https%3A%2F%2Fejemplo.com" }));
    expect(response.status).toBe(400);
    expect(state.updated).toBeNull();
  });
  it("permite guardar una cancha nueva sin fotografía", async () => {
    state.court = { id: body.fieldId };
    const response = await PATCH(request({ ...body, imageUrl: "" }));
    expect(response.status).toBe(200);
    expect(state.updated).toMatchObject({ image_url: null });
  });
});
