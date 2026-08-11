import { NextResponse } from "next/server";
import { requireFinance } from "@/lib/admin-auth";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { deleteDemoFinanceTransaction, updateDemoFinanceTransaction } from "@/lib/demo-data";
import { RESERVATION_CATEGORY } from "@/lib/finance/constants";
import { financeUpdateSchema, resolveAmountPaid } from "@/lib/finance/validation";
import { sanitizeText } from "@/lib/utils";

const AUTOMATIC = "Este ingreso lo genera la reserva. Modifíquelo desde el panel de reservas.";

type FinanceAuth = Extract<NonNullable<Awaited<ReturnType<typeof requireFinance>>>, { demo: false }>;

/**
 * Solo se editan y eliminan los movimientos manuales. Los ingresos con
 * source='reservation' los mantiene la base de datos y además los protege un
 * trigger, así que esta comprobación es la primera de dos barreras.
 */
async function loadTransaction(auth: FinanceAuth, id: string) {
  const { data } = await auth.supabase
    .from("financial_transactions")
    .select("id, source")
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .single();
  return data;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireFinance();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  const parsed = financeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const data = parsed.data;
  if (data.category === RESERVATION_CATEGORY) {
    return NextResponse.json({ error: "Los ingresos por reserva se registran desde la reserva" }, { status: 400 });
  }
  const amountPaid = resolveAmountPaid(data);
  const description = sanitizeText(data.description);
  const note = data.note ? sanitizeText(data.note) : null;

  if (auth.demo) {
    try {
      updateDemoFinanceTransaction(id, {
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
      return NextResponse.json({ ok: true, demo: true });
    } catch {
      return NextResponse.json({ error: "Movimiento inexistente" }, { status: 404 });
    }
  }

  const existing = await loadTransaction(auth, id);
  if (!existing) return NextResponse.json({ error: "Movimiento inexistente" }, { status: 404 });
  if (existing.source === "reservation") return NextResponse.json({ error: AUTOMATIC }, { status: 403 });

  const { error } = await auth.supabase
    .from("financial_transactions")
    .update({
      type: data.type,
      category: data.category,
      description,
      amount: data.amount,
      amount_paid: amountPaid,
      payment_method: data.paymentMethod ?? null,
      payment_status: data.paymentStatus,
      transaction_date: data.date,
      note,
    })
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .eq("source", "manual");
  if (error) return NextResponse.json({ error: "No se pudo actualizar el movimiento" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireFinance();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;

  if (auth.demo) {
    return deleteDemoFinanceTransaction(id)
      ? NextResponse.json({ ok: true, demo: true })
      : NextResponse.json({ error: "Movimiento inexistente" }, { status: 404 });
  }

  const existing = await loadTransaction(auth, id);
  if (!existing) return NextResponse.json({ error: "Movimiento inexistente" }, { status: 404 });
  if (existing.source === "reservation") return NextResponse.json({ error: AUTOMATIC }, { status: 403 });

  const { error } = await auth.supabase
    .from("financial_transactions")
    .delete()
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .eq("source", "manual");
  if (error) return NextResponse.json({ error: "No se pudo eliminar el movimiento" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
