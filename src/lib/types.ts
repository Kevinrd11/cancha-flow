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
  source: ReservationSource;
  notes?: string;
  businessId?: string;
  courtId?: string;
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
