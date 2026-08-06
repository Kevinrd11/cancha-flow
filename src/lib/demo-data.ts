import { addDays, format } from "date-fns";
import { ACTIVE_RESERVATION_STATUSES, SLOT_INTERVAL_MINUTES } from "@/lib/constants";
import { getCourtById } from "@/lib/courts-data";
import type { Reservation, ReservationStatus, TimeSlot } from "@/lib/types";
import { formatTime, minutesToTime, timeToMinutes, todayInCostaRica } from "@/lib/utils";
import { intervalsOverlap } from "@/lib/overlap";

const baseDate = todayInCostaRica();

export const demoReservations: Reservation[] = [
  {
    id: "14cf42bf-6234-48f7-a35c-7ca16ed1edc1",
    reservationCode: "CF-7F2A9C",
    customerName: "Daniela Vargas",
    customerPhone: "8888-1020",
    customerEmail: "daniela@example.com",
    date: baseDate,
    startTime: "18:00",
    endTime: "19:00",
    status: "confirmed",
    paymentStatus: "unpaid",
    total: 18000,
    source: "website",
    businessId: "00000000-0000-4000-8000-000000000010",
    courtId: "00000000-0000-4000-8000-000000000001",
    courtName: "Arena Ciudad Quesada",
  },
  {
    id: "f7162cbb-f70c-4aca-ac27-cf34db694594",
    reservationCode: "CF-3M8K1Q",
    customerName: "Andrés Rojas",
    customerPhone: "8701-4432",
    date: baseDate,
    startTime: "20:00",
    endTime: "21:00",
    status: "pending",
    paymentStatus: "unpaid",
    total: 18000,
    source: "website",
    businessId: "00000000-0000-4000-8000-000000000010",
    courtId: "00000000-0000-4000-8000-000000000001",
    courtName: "Arena Ciudad Quesada",
  },
  {
    id: "c14d2f9e-ee24-4be9-8c51-74bf71b1b45b",
    reservationCode: "CF-9P4R2X",
    customerName: "Sofía Jiménez",
    customerPhone: "6112-9090",
    date: format(addDays(new Date(`${baseDate}T12:00:00`), 1), "yyyy-MM-dd"),
    startTime: "19:00",
    endTime: "20:00",
    status: "confirmed",
    paymentStatus: "unpaid",
    total: 18000,
    source: "phone",
    businessId: "00000000-0000-4000-8000-000000000010",
    courtId: "00000000-0000-4000-8000-000000000001",
    courtName: "Arena Ciudad Quesada",
  },
];

type DemoBlock = {
  id: string;
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export const demoBlockedSlots: DemoBlock[] = [
  {
    id: "087a9b60-9729-43f1-a51e-83c9ff725f72",
    fieldId: "00000000-0000-4000-8000-000000000001",
    date: baseDate,
    startTime: "16:00",
    endTime: "17:00",
    reason: "Mantenimiento",
  },
];

export function getDemoAvailability(date: string, fieldId: string): TimeSlot[] {
  const court = getCourtById(fieldId);
  if (!court) return [];
  // Solo se ofrecen horas en punto: si la apertura cayera a media hora, el
  // primer horario disponible es la hora siguiente.
  const opening =
    Math.ceil(timeToMinutes(court.openingTime) / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
  const closing = timeToMinutes(court.closingTime);
  const reservations = demoReservations.filter(
    (reservation) => reservation.courtId === fieldId && reservation.date === date,
  );
  const blocks = demoBlockedSlots.filter((block) => block.fieldId === fieldId && block.date === date);

  const slotCount = Math.max(0, Math.floor((closing - opening) / SLOT_INTERVAL_MINUTES));

  return Array.from({ length: slotCount }, (_, index) => {
    const time = minutesToTime(opening + index * SLOT_INTERVAL_MINUTES);
    const endTime = minutesToTime(opening + (index + 1) * SLOT_INTERVAL_MINUTES);
    const reservation = reservations.find(
      (item) =>
        ACTIVE_RESERVATION_STATUSES.includes(
          item.status as (typeof ACTIVE_RESERVATION_STATUSES)[number],
        ) && intervalsOverlap({ startTime: time, endTime }, item),
    );
    const blocked = blocks.some((item) => intervalsOverlap({ startTime: time, endTime }, item));
    let state: TimeSlot["state"] = "available";
    if (blocked) state = "blocked";
    else if (reservation?.status === "confirmed") state = "reserved";
    else if (reservation) state = "pending";
    return { time, label: formatTime(time), state };
  });
}

type DemoReservationInput = {
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: Reservation["source"];
  status?: ReservationStatus;
  notes?: string;
};

export function createDemoReservation(input: DemoReservationInput) {
  const court = getCourtById(input.fieldId);
  if (!court) throw new Error("Cancha no disponible");
  const candidate = { startTime: input.startTime, endTime: input.endTime };
  const conflict = demoReservations.some(
    (item) =>
      item.courtId === input.fieldId &&
      item.date === input.date &&
      ACTIVE_RESERVATION_STATUSES.includes(
        item.status as (typeof ACTIVE_RESERVATION_STATUSES)[number],
      ) &&
      intervalsOverlap(candidate, item),
  );
  const blocked = demoBlockedSlots.some(
    (item) =>
      item.fieldId === input.fieldId &&
      item.date === input.date &&
      intervalsOverlap(candidate, item),
  );
  if (conflict || blocked) throw new Error("Ese horario ya no está disponible");

  const code = `CF-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const duration = timeToMinutes(input.endTime) - timeToMinutes(input.startTime);
  const reservation: Reservation = {
    id: crypto.randomUUID(),
    reservationCode: code,
    customerName: input.fullName,
    customerPhone: input.phone,
    customerEmail: input.email || undefined,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status ?? "pending",
    paymentStatus: "unpaid",
    total: (court.hourlyRate * duration) / 60,
    source: input.source ?? "website",
    notes: input.notes,
    businessId: court.businessId,
    courtId: court.id,
    courtName: court.name,
  };
  demoReservations.push(reservation);
  return reservation;
}

export function updateDemoReservation(
  id: string,
  changes: Partial<Pick<Reservation, "status" | "paymentStatus" | "date" | "startTime" | "endTime" | "notes">>,
) {
  const index = demoReservations.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Reserva inexistente");
  const definedChanges = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as typeof changes;
  demoReservations[index] = { ...demoReservations[index], ...definedChanges };
  return demoReservations[index];
}

export function createDemoBlockedSlot(input: Omit<DemoBlock, "id">) {
  const candidate = { startTime: input.startTime, endTime: input.endTime };
  const conflict = demoReservations.some(
    (item) =>
      item.courtId === input.fieldId &&
      item.date === input.date &&
      ACTIVE_RESERVATION_STATUSES.includes(
        item.status as (typeof ACTIVE_RESERVATION_STATUSES)[number],
      ) &&
      intervalsOverlap(candidate, item),
  );
  const blocked = demoBlockedSlots.some(
    (item) =>
      item.fieldId === input.fieldId &&
      item.date === input.date &&
      intervalsOverlap(candidate, item),
  );
  if (conflict || blocked) throw new Error("El periodo contiene una reserva o bloqueo");
  const created = { ...input, id: crypto.randomUUID() };
  demoBlockedSlots.push(created);
  return created;
}

export function deleteDemoBlockedSlot(id: string) {
  const index = demoBlockedSlots.findIndex((item) => item.id === id);
  if (index === -1) return false;
  demoBlockedSlots.splice(index, 1);
  return true;
}
