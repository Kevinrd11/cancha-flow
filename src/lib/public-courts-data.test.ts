import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  error: null as null | { message: string },
  settings: [] as Record<string, unknown>[],
}));
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
    rpc: async () => ({ data: state.settings, error: null }),
  }),
}));

import { getPublicCourtListings } from "@/lib/public-courts-data";

const realCourt = {
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
};

describe("catálogo público multiempresa", () => {
  beforeEach(() => { state.data = []; state.error = null; state.settings = []; });

  it("publica solo las canchas reales con su ruta de negocio", async () => {
    state.data = [realCourt];

    const courts = await getPublicCourtListings();
    expect(courts).toHaveLength(1);
    expect(courts[0]).toMatchObject({
      name: "Cancha del cliente",
      images: ["/court-placeholder.svg"],
      publicPath: "/centro/centro-nuevo?court=10000000-0000-4000-8000-000000000099",
    });
  });

  it("usa el horario configurado por el propietario", async () => {
    state.data = [realCourt];
    state.settings = [{
      field_id: realCourt.id,
      opening_time: "06:30:00",
      closing_time: "23:30:00",
      slot_interval_minutes: 30,
      minimum_reservation_minutes: 60,
      whatsapp_phone: "50677777777",
    }];

    const courts = await getPublicCourtListings();
    expect(courts[0]).toMatchObject({ openingTime: "06:30", closingTime: "23:30" });
  });

  it("cae al horario por defecto cuando la cancha no tiene configuración publicable", async () => {
    state.data = [realCourt];

    const courts = await getPublicCourtListings();
    expect(courts[0]).toMatchObject({ openingTime: "08:00", closingTime: "22:00" });
  });

  it("no publica negocios suspendidos", async () => {
    state.data = [{ ...realCourt, businesses: { ...realCourt.businesses, subscription_status: "suspended" } }];
    expect(await getPublicCourtListings()).toHaveLength(0);
  });

  it("no publica canchas de demostración cuando la consulta falla", async () => {
    state.error = { message: "boom" };
    expect(await getPublicCourtListings()).toEqual([]);
  });
});
