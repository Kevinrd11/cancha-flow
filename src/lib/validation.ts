import { z } from "zod";
import { emailAddressSchema, passwordSchema } from "@/lib/auth/validation";
import { reservationStatuses } from "@/lib/types";

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,18}$/, "Ingresa un teléfono válido");

export const reservationSchema = z
  .object({
    fieldId: z.string().uuid(),
    date: z.iso.date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().min(60).max(240),
    fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(100),
    phone,
    email: z.union([z.literal(""), z.email("Ingresa un correo válido")]).optional(),
  })
  .strict();

export const paymentUploadSchema = z.object({
  reservationCode: z.string().regex(/^(CF|LD)-[A-Z0-9]{6,12}$/),
  publicToken: z.string().uuid(),
});

export const adminReservationSchema = reservationSchema.extend({
  source: z.enum(["whatsapp", "phone", "walk_in", "admin"]),
  status: z.enum(reservationStatuses).default("confirmed"),
  notes: z.string().trim().max(1000).optional(),
});

export const reservationUpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(reservationStatuses).optional(),
    paymentStatus: z.enum(["unpaid", "pending", "approved", "rejected", "refunded"]).optional(),
    date: z.iso.date().optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1200),
  location: z.string().trim().min(3).max(240),
  email: emailAddressSchema,
  currency: z.string().length(3),
  timezone: z.string().trim().min(3).max(80),
  fieldName: z.string().trim().min(2).max(100),
  whatsappPhone: phone,
  sinpePhone: phone,
  hourlyRate: z.number().int().positive().max(1_000_000),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minimumMinutes: z.number().int().min(30).max(240),
  holdMinutes: z.number().int().min(5).max(180),
  cancellationPolicy: z.string().trim().min(10).max(2000),
  nonWorkingDays: z.array(z.iso.date()).max(100).default([]),
}).strict();

export const onboardingSchema = z.object({
  ownerName: z.string().trim().min(3).max(100),
  email: emailAddressSchema,
  password: passwordSchema,
  businessName: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  phone,
  location: z.string().trim().min(3).max(240),
  description: z.string().trim().min(10).max(1200),
  currency: z.enum(["CRC", "USD", "MXN", "COP", "GTQ"]),
  timezone: z.string().trim().min(3).max(80),
  courtName: z.string().trim().min(2).max(100),
  sport: z.string().trim().min(2).max(60),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reservationMinutes: z.number().int().min(30).max(240),
  hourlyRate: z.number().positive().max(10_000_000),
  billingInterval: z.enum(["monthly", "annual"]),
  plan: z.enum(["starter", "pro", "scale"]),
}).strict().refine((value) => value.closingTime > value.openingTime, {
  message: "La hora de cierre debe ser posterior a la apertura",
  path: ["closingTime"],
});

export const MAX_PAYMENT_FILE_SIZE = 5 * 1024 * 1024;
export const PAYMENT_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
