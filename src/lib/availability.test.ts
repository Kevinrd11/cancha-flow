import { describe, expect, it } from "vitest";
import { getDisplayTimeSlots } from "@/lib/availability";
import type { TimeSlot } from "@/lib/types";

const slots: TimeSlot[] = [
  { time: "17:00", label: "5:00 p. m.", state: "available" },
  { time: "17:30", label: "5:30 p. m.", state: "available" },
  { time: "18:00", label: "6:00 p. m.", state: "pending" },
  { time: "18:30", label: "6:30 p. m.", state: "reserved" },
  { time: "19:00", label: "7:00 p. m.", state: "blocked" },
];

describe("getDisplayTimeSlots", () => {
  it("muestra todos los horarios con su estado público", () => {
    const result = getDisplayTimeSlots(slots, 30);

    expect(result.map((slot) => slot.displayState)).toEqual([
      "available",
      "available",
      "pending",
      "reserved",
      "blocked",
    ]);
    expect(result.map((slot) => slot.selectable)).toEqual([true, true, false, false, false]);
  });

  it("bloquea un inicio disponible si la duración alcanza un horario pendiente", () => {
    const result = getDisplayTimeSlots(slots, 60);

    expect(result[1]).toMatchObject({ displayState: "pending", selectable: false });
  });

  it("marca como no disponible un inicio que no completa la duración", () => {
    const result = getDisplayTimeSlots(slots.slice(0, 2), 60);

    expect(result[1]).toMatchObject({ displayState: "blocked", selectable: false });
  });
});
