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

export const paymentStatuses = ["unpaid", "pending", "partial", "approved", "rejected", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

/** Formas en las que el negocio recibe el dinero de una reserva. */
export const paymentMethods = ["cash", "sinpe", "transfer", "card", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type ReservationSource = "website" | "whatsapp" | "phone" | "walk_in" | "admin";
export type AvailabilityState = "available" | "pending" | "reserved" | "blocked";

export const appRoles = ["platform_admin", "owner", "staff", "customer"] as const;
export type AppRole = (typeof appRoles)[number];

export const subscriptionStatuses = ["trial", "active", "past_due", "canceled", "suspended"] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type BillingInterval = "monthly" | "annual";

export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  location: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  primaryColor: string;
  subscriptionStatus: SubscriptionStatus;
  planName: string;
};

export type Court = {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  sport: string;
  description: string;
  hourlyRate: number;
  reservationMinutes: number;
  capacity: number;
  active: boolean;
  rules: string[];
  amenities: string[];
  imageUrl?: string;
};

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
  /** Dinero ya recibido. El saldo pendiente siempre es total - amountPaid. */
  amountPaid: number;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  source: ReservationSource;
  notes?: string;
  businessId?: string;
  courtId?: string;
  courtName?: string;
};

export type BlockedSlot = {
  id: string;
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  courtName?: string;
};

export type BusinessSettings = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  fieldId: string;
  fieldName: string;
  sport: string;
  description: string;
  location: string;
  email: string;
  whatsappPhone: string;
  sinpePhone: string;
  currency: string;
  timezone: string;
  primaryColor: string;
  hourlyRate: number;
  openingTime: string;
  closingTime: string;
  minimumMinutes: number;
  holdMinutes: number;
  cancellationPolicy: string;
  nonWorkingDays: string[];
};
