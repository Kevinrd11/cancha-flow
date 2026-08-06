import { describe, expect, it } from "vitest";
import { getDisplayTimeSlots } from "@/lib/availability";
import type { TimeSlot } from "@/lib/types";

// Los horarios son siempre de hora en hora: de 1 a 2, de 2 a 3, y así.
const slots: TimeSlot[] = [
  { time: "17:00", label: "5:00 p. m.", state: "available" },
  { time: "18:00", label: "6:00 p. m.", state: "available" },
  { time: "19:00", label: "7:00 p. m.", state: "pending" },
  { time: "20:00", label: "8:00 p. m.", state: "reserved" },
  { time: "21:00", label: "9:00 p. m.", state: "blocked" },
];

function slotsBetween(start: string, end: string, occupied: [string, string]): TimeSlot[] {
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const result: TimeSlot[] = [];
  for (let minutes = toMinutes(start); minutes < toMinutes(end); minutes += 60) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const busy = minutes >= toMinutes(occupied[0]) && minutes < toMinutes(occupied[1]);
    result.push({ time, label: time, state: busy ? "reserved" : "available" });
  }
  return result;
}

describe("getDisplayTimeSlots", () => {
  it("muestra todos los horarios con su estado público", () => {
    const result = getDisplayTimeSlots(slots, 60);

    expect(result.map((slot) => slot.displayState)).toEqual([
      "available",
      "available",
      "pending",
      "reserved",
      "blocked",
    ]);
    expect(result.map((slot) => slot.selectable)).toEqual([true, true, false, false, false]);
  });

  it("solo marca como ocupadas las franjas realmente reservadas", () => {
    // Reserva de 1 a 2 con duración elegida de una hora: ni un minuto más
    // debe aparecer como reservado.
    const result = getDisplayTimeSlots(slotsBetween("12:00", "16:00", ["13:00", "14:00"]), 60);
    const reserved = result.filter((slot) => slot.displayState === "reserved").map((slot) => slot.time);

    expect(reserved).toEqual(["13:00"]);
  });

  it("distingue un horario libre donde no cabe la duración de uno ocupado", () => {
    const result = getDisplayTimeSlots(slotsBetween("12:00", "16:00", ["13:00", "14:00"]), 120);
    const twelve = result.find((slot) => slot.time === "12:00");

    // Las 12 están libres, pero dos horas desde ahí chocarían con la reserva.
    expect(twelve).toMatchObject({
      displayState: "available",
      selectable: false,
      tooShortForDuration: true,
    });
  });

  it("impide empezar una reserva que alcanzaría un horario pendiente", () => {
    const result = getDisplayTimeSlots(slots, 120);

    expect(result[1]).toMatchObject({
      displayState: "available",
      selectable: false,
      tooShortForDuration: true,
    });
  });

  it("impide un inicio que no completa la duración antes del cierre", () => {
    const result = getDisplayTimeSlots(slots.slice(0, 2), 120);

    expect(result[1]).toMatchObject({
      displayState: "available",
      selectable: false,
      tooShortForDuration: true,
    });
  });

  it("permite dos horas seguidas cuando ambas están libres", () => {
    const result = getDisplayTimeSlots(slotsBetween("12:00", "16:00", ["15:00", "16:00"]), 120);

    expect(result.filter((slot) => slot.selectable).map((slot) => slot.time)).toEqual(["12:00", "13:00"]);
  });

  it("no ofrece ningún inicio si la duración no es múltiplo de una hora", () => {
    const result = getDisplayTimeSlots(slotsBetween("12:00", "16:00", ["13:00", "14:00"]), 90);

    expect(result.every((slot) => !slot.selectable)).toBe(true);
    expect(result.filter((slot) => slot.displayState === "reserved")).toHaveLength(1);
  });
});
