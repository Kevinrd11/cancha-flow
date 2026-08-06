import { describe, expect, it } from "vitest";
import { createDemoBlockedSlot, createDemoReservation, getDemoAvailability } from "@/lib/demo-data";

const fieldId = "00000000-0000-4000-8000-000000000001";

describe("recorridos críticos en modo demostración", () => {
  it("una solicitud pendiente deja de mostrarse como disponible", () => {
    createDemoReservation({ fieldId, date: "2099-01-10", startTime: "10:00", endTime: "11:00", fullName: "Cliente de prueba", phone: "8888-1111" });
    const slots = getDemoAvailability("2099-01-10", fieldId);
    expect(slots.find((slot) => slot.time === "10:00")?.state).toBe("pending");
  });

  it("rechaza una segunda reserva sobre el mismo horario", () => {
    createDemoReservation({ fieldId, date: "2099-01-11", startTime: "18:00", endTime: "19:00", fullName: "Primera reserva", phone: "8888-2222" });
    expect(() => createDemoReservation({ fieldId, date: "2099-01-11", startTime: "17:00", endTime: "19:00", fullName: "Segunda reserva", phone: "8888-3333" })).toThrow("disponible");
  });

  it("un bloqueo administrativo desaparece de la disponibilidad pública", () => {
    createDemoBlockedSlot({ fieldId, date: "2099-01-12", startTime: "14:00", endTime: "15:00", reason: "Mantenimiento" });
    const slots = getDemoAvailability("2099-01-12", fieldId);
    expect(slots.find((slot) => slot.time === "14:00")?.state).toBe("blocked");
  });
});
