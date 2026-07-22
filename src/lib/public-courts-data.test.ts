import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: [] as Record<string, unknown>[], error: null as null | { message: string } }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabaseEnv: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: async () => ({ data: state.data, error: state.error }),
      };
      return chain;
    },
  }),
}));

import { demoCourts } from "@/lib/courts-data";
import { getPublicCourtListings } from "@/lib/public-courts-data";

describe("catálogo público multiempresa", () => {
  beforeEach(() => { state.data = []; state.error = null; });

  it("conserva las fichas demo y agrega las canchas reales con su ruta de negocio", async () => {
    state.data = [{
      id: "10000000-0000-4000-8000-000000000099",
      business_id: "20000000-0000-4000-8000-000000000099",
      name: "Cancha del cliente",
      slug: "principal",
      sport: "Fútbol 5",
      description: "Cancha registrada por un propietario real",
      location: "San Carlos",
      hourly_rate: 20000,
      reservation_minutes: 60,
      capacity: 10,
      rules: [],
      amenities: [],
      image_url: null,
      businesses: { name: "Centro Nuevo", slug: "centro-nuevo", phone: "8888-8888", whatsapp_phone: "50688888888", location: "San Carlos", active: true, subscription_status: "trial" },
      business_settings: [{ opening_time: "08:00:00", closing_time: "22:00:00" }],
    }];

    const courts = await getPublicCourtListings();
    expect(courts).toHaveLength(demoCourts.length + 1);
    expect(courts.at(-1)).toMatchObject({ name: "Cancha del cliente", images: ["/court-placeholder.svg"], publicPath: "/centro/centro-nuevo?court=10000000-0000-4000-8000-000000000099" });
  });

  it("no publica negocios suspendidos", async () => {
    state.data = [{ id: crypto.randomUUID(), businesses: { subscription_status: "suspended" }, business_settings: [] }];
    expect(await getPublicCourtListings()).toHaveLength(demoCourts.length);
  });
});
