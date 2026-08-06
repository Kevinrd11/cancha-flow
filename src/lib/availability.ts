import { SLOT_INTERVAL_MINUTES } from "@/lib/constants";
import type { AvailabilityState, TimeSlot } from "@/lib/types";
import { timeToMinutes } from "@/lib/utils";

export type DisplayTimeSlot = TimeSlot & {
  displayState: AvailabilityState;
  selectable: boolean;
  /**
   * El horario está libre, pero la duración elegida no cabe empezando aquí
   * (choca con una reserva posterior o con el cierre). No es lo mismo que estar
   * ocupado y debe verse distinto.
   */
  tooShortForDuration: boolean;
};

function inferSlotMinutes(slots: TimeSlot[]) {
  if (slots.length < 2) return SLOT_INTERVAL_MINUTES;
  const difference = timeToMinutes(slots[1].time) - timeToMinutes(slots[0].time);
  return difference > 0 ? difference : SLOT_INTERVAL_MINUTES;
}

export function getDisplayTimeSlots(slots: TimeSlot[], durationMinutes: number): DisplayTimeSlot[] {
  const slotMinutes = inferSlotMinutes(slots);
  const neededSegments = durationMinutes / slotMinutes;

  return slots.map((slot, index) => {
    // El estado mostrado es siempre el del propio horario: si alguien reservó
    // de 2 a 4, únicamente esas franjas pueden verse ocupadas. Que una franja
    // libre no sirva como inicio para la duración elegida se comunica aparte.
    if (slot.state !== "available") {
      return { ...slot, displayState: slot.state, selectable: false, tooShortForDuration: false };
    }

    if (!Number.isInteger(neededSegments)) {
      return { ...slot, displayState: "available" as const, selectable: false, tooShortForDuration: true };
    }

    const run = slots.slice(index, index + neededSegments);
    const isCompleteRun =
      run.length === neededSegments &&
      run.every(
        (item, offset) =>
          timeToMinutes(item.time) === timeToMinutes(slot.time) + offset * slotMinutes,
      );
    const fits = isCompleteRun && run.every((item) => item.state === "available");

    return {
      ...slot,
      displayState: "available" as const,
      selectable: fits,
      tooShortForDuration: !fits,
    };
  });
}
