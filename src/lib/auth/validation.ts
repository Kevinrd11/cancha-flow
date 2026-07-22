import { z } from "zod";

export const emailAddressSchema = z.string().trim().toLowerCase().pipe(z.email("Ingresa un correo válido").max(254));

const passwordBase = z
  .string()
  .min(12, "Usa al menos 12 caracteres")
  .max(72, "Usa como máximo 72 caracteres")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "La contraseña es demasiado larga")
  .refine((value) => /[a-z]/.test(value), "Incluye una letra minúscula")
  .refine((value) => /[A-Z]/.test(value), "Incluye una letra mayúscula")
  .refine((value) => /\d/.test(value), "Incluye al menos un número")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Incluye al menos un símbolo")
  .refine((value) => !/^(password|contrase(?:n|ñ)a|123456|qwerty)/i.test(value), "Elige una contraseña menos predecible");

export const passwordSchema = passwordBase;

export const loginSchema = z
  .object({
    email: emailAddressSchema,
    password: z.string().min(1).max(256),
  })
  .strict();

export const recoveryRequestSchema = z
  .object({ email: emailAddressSchema })
  .strict();

export const customerRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(100),
    email: emailAddressSchema,
    password: passwordBase,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({ password: passwordBase, confirmPassword: z.string().min(1, "Confirma tu contraseña") })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(256), password: passwordBase, confirmPassword: z.string().min(1, "Confirma tu contraseña") })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.password, {
    message: "La nueva contraseña debe ser diferente",
    path: ["password"],
  });
