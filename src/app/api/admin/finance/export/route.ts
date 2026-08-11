import { NextResponse, type NextRequest } from "next/server";
import { requireFinance } from "@/lib/admin-auth";
import { getBusinessLocale } from "@/lib/business-data";
import { getFinanceExportRows, getFinanceOverview } from "@/lib/finance-data";
import { categoryLabel, FINANCE_STATUS_LABELS, FINANCE_TYPE_LABELS, methodLabel, PERIOD_LABELS } from "@/lib/finance/constants";
import { toCsv, type CsvValue } from "@/lib/finance/csv";
import { resolvePeriod } from "@/lib/finance/periods";
import { parseFinanceFilters } from "@/lib/finance/validation";

export async function GET(request: NextRequest) {
  const auth = await requireFinance();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const filters = parseFinanceFilters(request.nextUrl.searchParams);
  const { timezone } = await getBusinessLocale();
  const range = resolvePeriod(filters.period, timezone);
  // El mismo rango y los mismos datos que ven las tarjetas y las gráficas.
  const [overview, rows] = await Promise.all([
    getFinanceOverview(filters, timezone),
    getFinanceExportRows(filters, timezone),
  ]);

  const summary: CsvValue[][] = [
    ["Resumen financiero"],
    ["Periodo", PERIOD_LABELS[filters.period]],
    ["Desde", range.from],
    ["Hasta", range.to],
    ["Método de pago", filters.method ? methodLabel(filters.method) : "Todos"],
    [],
    ["Ingresos cobrados", overview.totals.collected],
    ["Pagos pendientes", overview.totals.pending],
    ["Gastos del periodo", overview.totals.expenses],
    ["Ganancia neta", overview.totals.net],
    ["Reembolsos", overview.totals.refunded],
    ["Reservas pagadas", overview.totals.paidReservations],
    ["Ticket promedio", overview.totals.averageTicket],
    [],
    ["Movimientos"],
    ["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Cobrado", "Pendiente", "Método", "Estado", "Origen", "Reserva", "Cancha", "Cliente"],
  ];

  const movements: CsvValue[][] = rows.map((item) => [
    item.date,
    FINANCE_TYPE_LABELS[item.type],
    categoryLabel(item.category),
    item.description,
    item.amount,
    item.amountPaid,
    item.type === "income" && ["pending", "partial"].includes(item.paymentStatus) ? item.amount - item.amountPaid : 0,
    methodLabel(item.paymentMethod),
    FINANCE_STATUS_LABELS[item.paymentStatus],
    item.source === "reservation" ? "Automático" : "Manual",
    item.reservationCode ?? "",
    item.courtName ?? "",
    item.customerName ?? "",
  ]);

  const filename = `finanzas-${range.from}-a-${range.to}.csv`;
  return new NextResponse(toCsv([...summary, ...movements]), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
