import { z } from "zod";
import { emailAddressSchema, passwordSchema } from "@/lib/auth/validation";
import { RESERVATION_DURATION_OPTIONS } from "@/lib/constants";
import { paymentMethods, paymentStatuses, reservationStatuses } from "@/lib/types";

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,18}$/, "Ingresa un teléfono válido");

// Solo se reserva de hora en hora, así que cualquier hora que llegue al
// servidor debe caer en punto y durar una o dos horas completas.
const hourlyTime = (message = "Seleccione una hora en punto") =>
  z.string().regex(/^([01]\d|2[0-3]):00$/, message);

const hourlyDuration = (message = "Las reservas son de 1 o 2 horas") =>
  z
    .number()
    .int()
    .refine((value) => (RESERVATION_DURATION_OPTIONS as readonly number[]).includes(value), {
      message,
    });

export const reservationSchema = z
  .object({
    fieldId: z.string().uuid(),
    date: z.iso.date(),
    startTime: hourlyTime(),
    durationMinutes: hourlyDuration(),
    fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(100),
    phone,
    email: z.union([z.literal(""), z.email("Ingresa un correo válido")]).optional(),
  })
  .strict();

export const adminReservationSchema = reservationSchema.extend({
  source: z.enum(["whatsapp", "phone", "walk_in", "admin"]),
  status: z.enum(reservationStatuses).default("confirmed"),
  notes: z.string().trim().max(1000).optional(),
});

export const reservationUpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(reservationStatuses).optional(),
    paymentStatus: z.enum(paymentStatuses).optional(),
    date: z.iso.date().optional(),
    startTime: hourlyTime().optional(),
    endTime: hourlyTime().optional(),
    notes: z.string().trim().max(1000).optional(),
    // Cobro de la reserva. El saldo pendiente no se envía: siempre es
    // total - amountPaid, y el total lo calcula la base de datos.
    amountPaid: z.number().min(0, "El monto cobrado no puede ser negativo").max(1_000_000_000).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
  })
  .strict();

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2, "Escriba el nombre del centro").max(100, "El nombre es demasiado largo"),
  description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(1200, "La descripción es demasiado larga"),
  location: z.string().trim().min(3, "Escriba la ubicación del centro").max(240, "La ubicación es demasiado larga"),
  email: emailAddressSchema,
  currency: z.string().length(3, "Use un código de moneda de 3 letras"),
  timezone: z.string().trim().min(3, "Seleccione una zona horaria válida").max(80, "La zona horaria es demasiado larga"),
  fieldName: z.string().trim().min(2, "Escriba el nombre de la cancha").max(100, "El nombre de la cancha es demasiado largo"),
  whatsappPhone: phone,
  sinpePhone: phone,
  hourlyRate: z.number().int().positive("El precio debe ser mayor que cero").max(1_000_000, "El precio ingresado es demasiado alto"),
  openingTime: hourlyTime("La apertura debe ser una hora en punto"),
  closingTime: hourlyTime("El cierre debe ser una hora en punto"),
  minimumMinutes: hourlyDuration("La duración mínima es de 1 o 2 horas"),
  holdMinutes: z.number().int().min(5, "El tiempo de reserva debe ser al menos 5 minutos").max(180, "El tiempo de reserva no puede superar 180 minutos"),
  cancellationPolicy: z.string().trim().min(10, "Escriba una política de cancelación de al menos 10 caracteres").max(2000, "La política de cancelación es demasiado larga"),
  nonWorkingDays: z.array(z.iso.date()).max(100).default([]),
}).strict();

export const onboardingSchema = z.object({
  ownerName: z.string().trim().min(3, "Escriba el nombre completo del propietario").max(100, "El nombre es demasiado largo"),
  email: emailAddressSchema,
  password: passwordSchema,
  businessName: z.string().trim().min(2, "Escriba el nombre del centro deportivo").max(100, "El nombre del centro es demasiado largo"),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El enlace solo puede contener letras, números y guiones").max(80, "El enlace es demasiado largo"),
  phone,
  location: z.string().trim().min(3, "Escriba la ubicación del centro").max(240, "La ubicación es demasiado larga"),
  description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(1200, "La descripción es demasiado larga"),
  currency: z.enum(["CRC", "USD", "MXN", "COP", "GTQ"]),
  timezone: z.string().trim().min(3).max(80),
  courtName: z.string().trim().min(2, "Escriba el nombre de la cancha").max(100, "El nombre de la cancha es demasiado largo"),
  sport: z.string().trim().min(2, "Seleccione un deporte").max(60),
  openingTime: hourlyTime("La apertura debe ser una hora en punto"),
  closingTime: hourlyTime("El cierre debe ser una hora en punto"),
  reservationMinutes: hourlyDuration(),
  hourlyRate: z.number().positive("El precio debe ser mayor que cero").max(10_000_000, "El precio ingresado es demasiado alto"),
  billingInterval: z.enum(["monthly", "annual"]),
  plan: z.enum(["starter", "pro", "scale"]),
}).strict().refine((value) => value.closingTime > value.openingTime, {
  message: "La hora de cierre debe ser posterior a la apertura",
  path: ["closingTime"],
});
