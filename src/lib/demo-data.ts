import { addDays, format } from "date-fns";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { Reservation, TimeSlot } from "@/lib/types";
import { formatTime, minutesToTime, timeToMinutes, todayInCostaRica } from "@/lib/utils";
import { intervalsOverlap } from "@/lib/overlap";

const baseDate = todayInCostaRica();

export const demoReservations: Reservation[] = [
  {
    id: "14cf42bf-6234-48f7-a35c-7ca16ed1edc1",
    reservationCode: "LD-7F2A9C",
    customerName: "Daniela Vargas",
    customerPhone: "8888-1020",
    customerEmail: "daniela@example.com",
    date: baseDate,
    startTime: "18:00",
    endTime: "19:00",
    status: "confirmed",
    paymentStatus: "approved",
    total: 18000,
    source: "website",
  },
  {
    id: "f7162cbb-f70c-4aca-ac27-cf34db694594",
    reservationCode: "LD-3M8K1Q",
    customerName: "Andrés Rojas",
    customerPhone: "8701-4432",
    date: baseDate,
    startTime: "20:00",
    endTime: "21:30",
    status: "awaiting_approval",
    paymentStatus: "pending",
    total: 27000,
    source: "whatsapp",
  },
  {
    id: "c14d2f9e-ee24-4be9-8c51-74bf71b1b45b",
    reservationCode: "LD-9P4R2X",
    customerName: "Sofía Jiménez",
    customerPhone: "6112-9090",
    date: format(addDays(new Date(`${baseDate}T12:00:00`), 1), "yyyy-MM-dd"),
    startTime: "19:00",
    endTime: "20:00",
    status: "confirmed",
    paymentStatus: "approved",
    total: 18000,
    source: "phone",
  },
  {
    id: "087a9b60-9729-43f1-a51e-83c9ff725f72",
    reservationCode: "LD-6C2N8B",
    customerName: "Marco Araya",
    customerPhone: "8420-1177",
    date: format(addDays(new Date(`${baseDate}T12:00:00`), 3), "yyyy-MM-dd"),
    startTime: "17:00",
    endTime: "18:00",
    status: "pending",
    paymentStatus: "unpaid",
    total: 18000,
    source: "website",
  },
];

export function getDemoAvailability(date: string): TimeSlot[] {
  const opening = timeToMinutes(DEFAULT_SETTINGS.openingTime);
  const closing = timeToMinutes(DEFAULT_SETTINGS.closingTime);
  const dateReservations = demoReservations.filter((reservation) => reservation.date === date);

  return Array.from({ length: (closing - opening) / 30 }, (_, index) => {
    const time = minutesToTime(opening + index * 30);
    const endTime = minutesToTime(opening + (index + 1) * 30);
    const reservation = dateReservations.find((item) =>
      intervalsOverlap({ startTime: time, endTime }, item),
    );
    let state: TimeSlot["state"] = "available";
    if (reservation?.status === "confirmed") state = "reserved";
    if (["pending", "awaiting_payment", "awaiting_approval"].includes(reservation?.status ?? "")) {
      state = "pending";
    }
    if (date === baseDate && ["16:00", "16:30"].includes(time)) state = "blocked";
    return { time, label: formatTime(time), state };
  });
}
