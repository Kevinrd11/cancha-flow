import { z } from "zod";
import { paymentMethods } from "@/lib/types";
import { financePeriods, financeStatuses, financeTypes } from "@/lib/finance/types";

const amount = z
  .number()
  .positive("El monto debe ser mayor que cero")
  .max(1_000_000_000, "El monto ingresado es demasiado alto")
  .refine((value) => Number.isFinite(value) && Math.round(value * 100) === value * 100, {
    message: "El monto admite como máximo dos decimales",
  });

const movement = z.object({
  type: z.enum(financeTypes),
  category: z.string().trim().min(2, "Seleccione una categoría").max(60),
  description: z.string().trim().max(300, "La descripción es demasiado larga").default(""),
  amount,
  // Solo se pide cuando el movimiento está parcialmente cobrado; en el resto de
  // los casos lo deduce el servidor a partir del estado.
  amountPaid: z.number().min(0, "El monto cobrado no puede ser negativo").optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  paymentStatus: z.enum(financeStatuses).default("paid"),
  date: z.iso.date("Seleccione una fecha válida"),
  note: z.string().trim().max(1000, "La nota es demasiado larga").optional(),
});

const consistentAmounts = <T extends z.infer<typeof movement>>(value: T, ctx: z.RefinementCtx) => {
  if (value.paymentStatus === "partial") {
    if (value.amountPaid === undefined || value.amountPaid <= 0) {
      ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Indique cuánto se ha cobrado" });
    } else if (value.amountPaid >= value.amount) {
      ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Un cobro parcial debe ser menor que el monto total" });
    }
  } else if (value.amountPaid !== undefined && value.amountPaid > value.amount) {
    ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "El monto cobrado no puede superar el total" });
  }
};

export const financeTransactionSchema = movement.strict().superRefine(consistentAmounts);
export const financeUpdateSchema = movement.strict().superRefine(consistentAmounts);

/** Lo que efectivamente se cobró, derivado del estado para no confiar en el cliente. */
export function resolveAmountPaid(input: z.infer<typeof movement>) {
  if (input.paymentStatus === "paid") return input.amount;
  if (input.paymentStatus === "partial") return input.amountPaid ?? 0;
  return 0;
}

// Un filtro vacío llega como "" desde la URL y desde los <select>; se normaliza
// a undefined para que "sin filtro" tenga una sola representación.
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.literal(""), z.enum(values)])
    .optional()
    .transform((value) => (value || undefined) as T[number] | undefined);

export const financeFiltersSchema = z.object({
  period: z.enum(financePeriods).default("month"),
  method: optionalEnum(paymentMethods),
  type: optionalEnum(financeTypes),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export function parseFinanceFilters(searchParams: URLSearchParams | Record<string, string | string[] | undefined>) {
  const raw = searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams) : searchParams;
  const parsed = financeFiltersSchema.safeParse({
    period: pick(raw.period) || undefined,
    method: pick(raw.method),
    type: pick(raw.type),
    page: pick(raw.page) || 1,
  });
  return parsed.success ? parsed.data : financeFiltersSchema.parse({});
}

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
