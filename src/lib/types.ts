export const reservationStatuses = [
  "pending",
  "awaiting_payment",
  "awaiting_approval",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
  "expired",
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];
export type PaymentStatus = "unpaid" | "pending" | "approved" | "rejected" | "refunded";
export type ReservationSource = "website" | "whatsapp" | "phone" | "walk_in" | "admin";
export type AvailabilityState = "available" | "pending" | "reserved" | "blocked";

export type TimeSlot = {
  time: string;
  label: string;
  state: AvailabilityState;
};

export type Reservation = {
  id: string;
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  total: number;
  source: ReservationSource;
  notes?: string;
};

export type BusinessSettings = {
  fieldId: string;
  fieldName: string;
  location: string;
  whatsappPhone: string;
  sinpePhone: string;
  hourlyRate: number;
  openingTime: string;
  closingTime: string;
  minimumMinutes: number;
  holdMinutes: number;
  cancellationPolicy: string;
  nonWorkingDays: string[];
};
