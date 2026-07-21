import { z } from "zod";
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
  reservationCode: z.string().regex(/^LD-[A-Z0-9]{6,12}$/),
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
});

export const MAX_PAYMENT_FILE_SIZE = 5 * 1024 * 1024;
export const PAYMENT_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
