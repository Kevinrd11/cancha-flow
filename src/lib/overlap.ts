import { timeToMinutes } from "@/lib/utils";

export type Interval = { startTime: string; endTime: string };

export function intervalsOverlap(a: Interval, b: Interval) {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);

  if (aStart >= aEnd || bStart >= bEnd) {
    throw new Error("El intervalo debe tener una hora final posterior a la inicial");
  }

  return aStart < bEnd && bStart < aEnd;
}

export function isSlotAvailable(candidate: Interval, occupied: Interval[]) {
  return !occupied.some((interval) => intervalsOverlap(candidate, interval));
}
