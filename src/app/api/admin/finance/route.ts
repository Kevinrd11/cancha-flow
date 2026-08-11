import { NextResponse } from "next/server";
import { requireFinance } from "@/lib/admin-auth";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { createDemoFinanceTransaction } from "@/lib/demo-data";
import { RESERVATION_CATEGORY } from "@/lib/finance/constants";
import { financeTransactionSchema, resolveAmountPaid } from "@/lib/finance/validation";
import { sanitizeText } from "@/lib/utils";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireFinance();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = financeTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const data = parsed.data;
  // Esta categoría la reserva la base de datos para los ingresos automáticos.
  if (data.category === RESERVATION_CATEGORY) {
    return NextResponse.json({ error: "Los ingresos por reserva se registran desde la reserva" }, { status: 400 });
  }
  // El monto cobrado se deduce del estado; el cliente no lo decide por su cuenta.
  const amountPaid = resolveAmountPaid(data);
  const description = sanitizeText(data.description);
  const note = data.note ? sanitizeText(data.note) : null;

  if (auth.demo) {
    const created = createDemoFinanceTransaction({
      type: data.type,
      category: data.category,
      description,
      amount: data.amount,
      amountPaid,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      date: data.date,
      note: note ?? undefined,
    });
    return NextResponse.json({ id: created.id, demo: true }, { status: 201 });
  }

  // business_id sale de la sesión, nunca del cuerpo de la solicitud.
  const { data: created, error } = await auth.supabase
    .from("financial_transactions")
    .insert({
      business_id: auth.businessId,
      type: data.type,
      source: "manual",
      category: data.category,
      description,
      amount: data.amount,
      amount_paid: amountPaid,
      payment_method: data.paymentMethod ?? null,
      payment_status: data.paymentStatus,
      transaction_date: data.date,
      note,
      created_by: auth.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "No se pudo guardar el movimiento" }, { status: 500 });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
