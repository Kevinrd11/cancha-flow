import { addDays, format } from "date-fns";
import { ACTIVE_RESERVATION_STATUSES, SLOT_INTERVAL_MINUTES } from "@/lib/constants";
import { getCourtById } from "@/lib/courts-data";
import { transactionForReservation } from "@/lib/finance/reservation";
import type { FinanceTransaction } from "@/lib/finance/types";
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
    paymentStatus: "approved",
    total: 18000,
    amountPaid: 18000,
    paymentMethod: "sinpe",
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
    amountPaid: 0,
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
    paymentStatus: "partial",
    total: 18000,
    amountPaid: 9000,
    paymentMethod: "cash",
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
    paymentStatus: input.status === "confirmed" ? "approved" : "unpaid",
    total: (court.hourlyRate * duration) / 60,
    amountPaid: input.status === "confirmed" ? (court.hourlyRate * duration) / 60 : 0,
    source: input.source ?? "website",
    notes: input.notes,
    businessId: court.businessId,
    courtId: court.id,
    courtName: court.name,
  };
  demoReservations.push(reservation);
  return reservation;
}

export function getDemoReservation(id: string) {
  return demoReservations.find((item) => item.id === id) ?? null;
}

export function updateDemoReservation(
  id: string,
  changes: Partial<Pick<Reservation, "status" | "paymentStatus" | "date" | "startTime" | "endTime" | "notes" | "amountPaid" | "paymentMethod" | "paidAt">>,
) {
  const index = demoReservations.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Reserva inexistente");
  const definedChanges = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as typeof changes;
  const updated = { ...demoReservations[index], ...definedChanges };
  // Igual que en la ruta real: el estado del pago se deduce de lo cobrado.
  if (changes.amountPaid !== undefined && changes.paymentStatus === undefined) {
    updated.paymentStatus = updated.amountPaid >= updated.total && updated.total > 0 ? "approved" : updated.amountPaid > 0 ? "partial" : "unpaid";
    updated.paidAt = updated.amountPaid > 0 ? new Date().toISOString() : undefined;
  }
  demoReservations[index] = updated;
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

// Finanzas en modo demo. Los ingresos de reserva no se guardan: se derivan de
// demoReservations en cada lectura, igual que el trigger de Postgres los deriva
// de public.reservations. Solo los movimientos manuales tienen estado propio.
const demoManualTransactions: FinanceTransaction[] = [
  {
    id: "3f0f6bd2-2c1a-4a53-9a5c-2e0a1f2b7c11",
    type: "expense",
    source: "manual",
    category: "utilities",
    description: "Recibo de electricidad",
    amount: 42000,
    amountPaid: 42000,
    paymentMethod: "transfer",
    paymentStatus: "paid",
    date: `${baseDate.slice(0, 7)}-05`,
  },
];

export function getDemoFinanceTransactions(): FinanceTransaction[] {
  return [...demoReservations.map(transactionForReservation), ...demoManualTransactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export function createDemoFinanceTransaction(input: Omit<FinanceTransaction, "id" | "source">) {
  const created: FinanceTransaction = { ...input, id: crypto.randomUUID(), source: "manual" };
  demoManualTransactions.unshift(created);
  return created;
}

export function updateDemoFinanceTransaction(id: string, changes: Omit<FinanceTransaction, "id" | "source">) {
  const index = demoManualTransactions.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Movimiento inexistente");
  demoManualTransactions[index] = { ...changes, id, source: "manual" };
  return demoManualTransactions[index];
}

export function deleteDemoFinanceTransaction(id: string) {
  const index = demoManualTransactions.findIndex((item) => item.id === id);
  if (index < 0) return false;
  demoManualTransactions.splice(index, 1);
  return true;
}
