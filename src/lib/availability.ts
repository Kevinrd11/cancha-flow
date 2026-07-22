import type { AvailabilityState, TimeSlot } from "@/lib/types";
import { timeToMinutes } from "@/lib/utils";

export type DisplayTimeSlot = TimeSlot & {
  displayState: AvailabilityState;
  selectable: boolean;
};

function inferSlotMinutes(slots: TimeSlot[]) {
  if (slots.length < 2) return 30;
  const difference = timeToMinutes(slots[1].time) - timeToMinutes(slots[0].time);
  return difference > 0 ? difference : 30;
}

export function getDisplayTimeSlots(slots: TimeSlot[], durationMinutes: number): DisplayTimeSlot[] {
  const slotMinutes = inferSlotMinutes(slots);
  const neededSegments = durationMinutes / slotMinutes;

  return slots.map((slot, index) => {
    if (slot.state !== "available") {
      return { ...slot, displayState: slot.state, selectable: false };
    }

    if (!Number.isInteger(neededSegments)) {
      return { ...slot, displayState: "blocked", selectable: false };
    }

    const run = slots.slice(index, index + neededSegments);
    const isCompleteRun =
      run.length === neededSegments &&
      run.every(
        (item, offset) =>
          timeToMinutes(item.time) === timeToMinutes(slot.time) + offset * slotMinutes,
      );

    if (!isCompleteRun) {
      return { ...slot, displayState: "blocked", selectable: false };
    }

    const conflict = run.find((item) => item.state !== "available");
    return {
      ...slot,
      displayState: conflict?.state ?? "available",
      selectable: !conflict,
    };
  });
}
