import { describe, expect, it } from "vitest";
import { reservationSchema, settingsSchema } from "@/lib/validation";

const baseReservation = {
  fieldId: "00000000-0000-4000-8000-000000000001",
  date: "2099-01-10",
  startTime: "18:00",
  durationMinutes: 60,
  fullName: "Cliente de prueba",
  phone: "8888-1111",
};

describe("reservas de hora en hora", () => {
  it("acepta una hora en punto de una o dos horas", () => {
    expect(reservationSchema.safeParse(baseReservation).success).toBe(true);
    expect(reservationSchema.safeParse({ ...baseReservation, durationMinutes: 120 }).success).toBe(true);
  });

  it("rechaza un inicio a media hora", () => {
    const result = reservationSchema.safeParse({ ...baseReservation, startTime: "18:30" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("en punto");
  });

  it("rechaza duraciones que no son de una o dos horas", () => {
    for (const durationMinutes of [30, 45, 90, 180]) {
      const result = reservationSchema.safeParse({ ...baseReservation, durationMinutes });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("1 o 2 horas");
    }
  });

  it("obliga a que la apertura y el cierre del negocio sean horas en punto", () => {
    const settings = {
      businessName: "Arena Ciudad Quesada",
      description: "Cancha sintética techada para fútbol 5.",
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

    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, closingTime: "22:30" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, minimumMinutes: 90 }).success).toBe(false);
  });

  it("acota el plazo para responder una solicitud entre 1 hora y 3 días", () => {
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

    expect(settingsSchema.safeParse({ ...settings, holdMinutes: 60 }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, holdMinutes: 4320 }).success).toBe(true);
    // El rango anterior permitía 20 minutos, demasiado corto para que un
    // propietario alcance a responder una solicitud nocturna.
    expect(settingsSchema.safeParse({ ...settings, holdMinutes: 20 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, holdMinutes: 4321 }).success).toBe(false);
  });
});
