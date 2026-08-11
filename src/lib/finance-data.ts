import "server-only";
import { requireFinance } from "@/lib/admin-auth";
import { getDemoFinanceTransactions } from "@/lib/demo-data";
import { buildOverview, emptyOverview } from "@/lib/finance/aggregate";
import { FINANCE_PAGE_SIZE } from "@/lib/finance/constants";
import { resolvePeriod } from "@/lib/finance/periods";
import type { FinanceFilters, FinanceOverview, FinancePage, FinanceTransaction, PeriodRange } from "@/lib/finance/types";
import { hasSupabaseEnv, isDemoMode } from "@/lib/supabase/env";

const SELECT =
  "id, type, source, category, description, amount, amount_paid, payment_method, payment_status, transaction_date, note, reservation_id, reservations(reservation_code, fields(name), customers(full_name))";

/** Supabase devuelve las relaciones anidadas como objeto o como arreglo de uno. */
function first<T>(value: unknown): T | null {
  return (Array.isArray(value) ? value[0] : value) as T | null;
}

function toTransaction(item: Record<string, unknown>): FinanceTransaction {
  const reservation = first<{ reservation_code?: string; fields?: unknown; customers?: unknown }>(item.reservations);
  const court = first<{ name?: string }>(reservation?.fields);
  const customer = first<{ full_name?: string }>(reservation?.customers);
  return {
    id: item.id as string,
    type: item.type as FinanceTransaction["type"],
    source: item.source as FinanceTransaction["source"],
    category: item.category as string,
    description: (item.description as string) ?? "",
    amount: Number(item.amount),
    amountPaid: Number(item.amount_paid),
    paymentMethod: (item.payment_method as FinanceTransaction["paymentMethod"]) ?? undefined,
    paymentStatus: item.payment_status as FinanceTransaction["paymentStatus"],
    date: item.transaction_date as string,
    note: (item.note as string) ?? undefined,
    reservationId: (item.reservation_id as string) ?? undefined,
    reservationCode: reservation?.reservation_code,
    courtName: court?.name,
    customerName: customer?.full_name,
  };
}

function demoTransactions(range: PeriodRange, filters: FinanceFilters) {
  return getDemoFinanceTransactions().filter(
    (item) =>
      item.date >= range.from &&
      item.date <= range.to &&
      (!filters.method || item.paymentMethod === filters.method) &&
      (!filters.type || item.type === filters.type),
  );
}

export async function getFinanceOverview(filters: FinanceFilters, timezone?: string): Promise<FinanceOverview> {
  const range = resolvePeriod(filters.period, timezone);
  if (!hasSupabaseEnv() && !isDemoMode()) return emptyOverview(range);
  try {
    const auth = await requireFinance();
    if (!auth) return emptyOverview(range);
    // El modo demo no tiene Postgres: se agrega en memoria con las mismas
    // fórmulas que public.get_finance_overview.
    if (auth.demo) {
      const scope = getDemoFinanceTransactions().filter((item) => !filters.method || item.paymentMethod === filters.method);
      return buildOverview(scope, range);
    }
    const { data, error } = await auth.supabase.rpc("get_finance_overview", {
      p_business_id: auth.businessId,
      p_from: range.from,
      p_to: range.to,
      p_payment_method: filters.method ?? null,
    });
    if (error) throw error;
    return (data as FinanceOverview | null) ?? emptyOverview(range);
  } catch {
    return emptyOverview(range);
  }
}

export async function getFinanceTransactions(filters: FinanceFilters, page = 1, timezone?: string): Promise<FinancePage> {
  const range = resolvePeriod(filters.period, timezone);
  const empty: FinancePage = { items: [], total: 0, page, pageSize: FINANCE_PAGE_SIZE };
  if (!hasSupabaseEnv() && !isDemoMode()) return empty;
  try {
    const auth = await requireFinance();
    if (!auth) return empty;
    if (auth.demo) {
      const all = demoTransactions(range, filters);
      const offset = (page - 1) * FINANCE_PAGE_SIZE;
      return { items: all.slice(offset, offset + FINANCE_PAGE_SIZE), total: all.length, page, pageSize: FINANCE_PAGE_SIZE };
    }
    // La paginación ocurre en Postgres: el navegador nunca recibe el libro completo.
    const offset = (page - 1) * FINANCE_PAGE_SIZE;
    let query = auth.supabase
      .from("financial_transactions")
      .select(SELECT, { count: "exact" })
      .eq("business_id", auth.businessId)
      .gte("transaction_date", range.from)
      .lte("transaction_date", range.to);
    if (filters.method) query = query.eq("payment_method", filters.method);
    if (filters.type) query = query.eq("type", filters.type);
    const { data, error, count } = await query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + FINANCE_PAGE_SIZE - 1);
    if (error) throw error;
    return {
      items: (data ?? []).map((item) => toTransaction(item as Record<string, unknown>)),
      total: count ?? 0,
      page,
      pageSize: FINANCE_PAGE_SIZE,
    };
  } catch {
    return empty;
  }
}

/** Todos los movimientos del periodo, sin paginar. Solo lo usa la exportación. */
export async function getFinanceExportRows(filters: FinanceFilters, timezone?: string): Promise<FinanceTransaction[]> {
  const range = resolvePeriod(filters.period, timezone);
  if (!hasSupabaseEnv() && !isDemoMode()) return [];
  try {
    const auth = await requireFinance();
    if (!auth) return [];
    if (auth.demo) return demoTransactions(range, filters).sort((a, b) => a.date.localeCompare(b.date));
    let query = auth.supabase
      .from("financial_transactions")
      .select(SELECT)
      .eq("business_id", auth.businessId)
      .gte("transaction_date", range.from)
      .lte("transaction_date", range.to);
    if (filters.method) query = query.eq("payment_method", filters.method);
    if (filters.type) query = query.eq("type", filters.type);
    const { data, error } = await query.order("transaction_date", { ascending: true }).limit(10_000);
    if (error) throw error;
    return (data ?? []).map((item) => toTransaction(item as Record<string, unknown>));
  } catch {
    return [];
  }
}
